export const maxDuration = 60; // Allow up to 60s for Vercel execution
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider } from '@/lib/services/storage';
import { ActivityService, ActivityTypes } from '@/lib/services/activity/ActivityService';

const classifyDocument = async (text: string): Promise<string> => {
    // If text is too short to classify, default to developer_doc
    if (!text || text.length < 10) {
        return 'developer_doc';
    }

    const prompt = `
You are an AI document classifier.
Classify the following text into ONE of these types:
- receipt_template
- developer_doc
- client_doc
- compliance
- invoice
- timeline

Rules:
- Return ONLY the exact type string. No explanation.
- If it looks like a payment receipt, return "receipt_template"
- If it's a technical spec or developer task, return "developer_doc"
- If it's a client proposal or quotation, return "client_doc"
- If it's a Service Agreement, Contract, HR, or legal document, return "compliance"
- If it's an invoice, return "invoice"
- If it's a project timeline, return "timeline"

Text to classify:
"${text.substring(0, 1000)}"
`;

    const payload = {
        model: process.env.LLM_MODEL || 'openai/gpt-oss-20b:free',
        temperature: 0.1,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
    };

    console.log(`[Classify] model=${payload.model}`);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://makewithus.in',
                'X-Title': 'Doc Automation',
            },
            body: JSON.stringify(payload)
        });
        
        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
        // Safely extract the type string to prevent "Cannot read properties of null"
        const contentStr = data?.choices?.[0]?.message?.content || '';
        
        const type = contentStr.trim().toLowerCase();
        
        const validTypes = ['receipt_template', 'developer_doc', 'client_doc', 'compliance', 'invoice', 'timeline'];
        
        // Use a flexible match to handle cases where the LLM includes markdown, punctuation, or conversational filler
        const matchedType = validTypes.find(v => type.includes(v));

        if (matchedType) {
            return matchedType;
        } else {
            console.error('[Classify] Unrecognized type:', type, '— defaulting to developer_doc');
            return 'developer_doc';
        }
    } catch (e) {
        console.error('[Upload Trace] ERROR:', e);
        return 'developer_doc';
    }
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. Validate file size (20MB max) before loading into RAM
    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Maximum is ${MAX_SIZE_MB}MB.` }, { status: 413 });
    }

    // 1.5. Validate MIME type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}. Please upload PDF, JPEG, or PNG.` }, { status: 415 });
    }

    // 2. Prepare file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 2. Call Python OCR microservice
    const pythonFormData = new FormData();
    pythonFormData.append('file', new Blob([buffer], { type: file.type }), file.name);
    
    const pythonUrl = process.env.PYTHON_OCR_URL || 'http://localhost:8000/ocr';
    let ocrResponse;
    try {
        const ocrTimeout = new AbortController();
        // 55s: fires before Vercel's maxDuration=60s hard kill, ensuring a clean user-facing error
        const ocrTimeoutId = setTimeout(() => ocrTimeout.abort(), 55000);

        ocrResponse = await fetch(pythonUrl, {
            method: 'POST',
            body: pythonFormData,
            signal: ocrTimeout.signal,
        });
        clearTimeout(ocrTimeoutId);
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.error('Python OCR service timed out after 90s');
            await ActivityService.logActivity({
                type: ActivityTypes.OCR_FAILED,
                entityType: 'system',
                entityId: 'upload',
                title: file.name,
                status: 'failed',
                metadata: { error: 'Timeout' }
            });
            return NextResponse.json({ error: 'OCR service timed out. The document may be too large.' }, { status: 504 });
        }
        console.error('Failed to reach Python OCR service:', err);
        await ActivityService.logActivity({
            type: ActivityTypes.OCR_FAILED,
            entityType: 'system',
            entityId: 'upload',
            title: file.name,
            status: 'failed',
            metadata: { error: 'Service Unreachable' }
        });
        return NextResponse.json({ error: 'OCR service unreachable. Make sure the OCR server is running.' }, { status: 503 });
    }

    if (!ocrResponse.ok) {
        const errText = await ocrResponse.text();
        console.error('OCR service error:', errText);
        await ActivityService.logActivity({
            type: ActivityTypes.OCR_FAILED,
            entityType: 'system',
            entityId: 'upload',
            title: file.name,
            status: 'failed',
            metadata: { error: 'Processing Failed' }
        });
        try {
            const errObj = JSON.parse(errText);
            return NextResponse.json({ error: errObj.detail || 'OCR processing failed' }, { status: 500 });
        } catch {
            return NextResponse.json({ error: errText || 'OCR processing failed' }, { status: 500 });
        }
    }
    
    const ocrData = await ocrResponse.json();
    const extractedText = ocrData.extracted_text;

    // 3. OCR Succeeded -> Archive the file
    let source_file = null;
    try {
        const storage = getStorageProvider();
        source_file = await storage.upload(buffer, file.name, file.type || 'application/pdf');
    } catch (storageErr) {
        console.error('Storage upload failed, continuing without archival:', storageErr);
    }

    // 4. Classify document
    const detectedType = await classifyDocument(extractedText);

    // 5. Return to frontend matching exact UploadResponse format
    const responsePayload = {
        filename: file.name,
        extracted_text: extractedText,
        detected_type: detectedType,
        char_count: extractedText.length,
        source_file
    };
    
    await ActivityService.logActivity({
        type: ActivityTypes.OCR_COMPLETED,
        entityType: 'system',
        entityId: 'upload',
        title: file.name,
        status: 'success',
        metadata: { char_count: extractedText.length, detected_type: detectedType }
    });

    console.log(`[Upload] Success: ${detectedType}, chars=${extractedText.length}`);
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[Upload Trace] 9. Error in upload route:', error?.message || error);
    return NextResponse.json({ error: 'Upload failed: ' + (error?.message || 'Unknown error') }, { status: 500 });
  }
}
