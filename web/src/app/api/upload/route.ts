import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const classifyDocument = async (text: string): Promise<string> => {
    console.log('[Upload Trace] 1. OCR extracted text:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));

    // If text is very short or empty
    if (!text || text.length < 10) {
        console.log('[Upload Trace] 2. Text too short. Defaulting to developer_doc.');
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
- If it's an HR or legal compliance document, return "compliance"
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

    console.log('[Upload Trace] 3. Classification prompt sent to OpenRouter (max_tokens=10, model=' + payload.model + ')');

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
        console.log('[Upload Trace] 4. Raw OpenRouter response:', rawText);
        
        const data = JSON.parse(rawText);
        
        // Safely extract the type string to prevent "Cannot read properties of null"
        const contentStr = data?.choices?.[0]?.message?.content || '';
        console.log('[Upload Trace] 5. Extracted message content:', contentStr);
        
        const type = contentStr.trim().toLowerCase();
        console.log('[Upload Trace] 6. Parsed classification result:', type);
        
        const validTypes = ['receipt_template', 'developer_doc', 'client_doc', 'compliance', 'invoice', 'timeline'];
        
        // Use a flexible match to handle cases where the LLM includes markdown, punctuation, or conversational filler
        const matchedType = validTypes.find(v => type.includes(v));

        if (matchedType) {
            console.log('[Upload Trace] 7. Document type selected by the application:', matchedType);
            return matchedType;
        } else {
            console.log('[Upload Trace] 7. Invalid type received ("' + type + '"). Defaulting to developer_doc.');
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

    // 1. Upload file to Firebase Storage (Optional for local dev)
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'pdf';
    const filename = `${uuidv4()}.${ext}`;
    
    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
      try {
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(`uploads/${filename}`);
        await fileRef.save(buffer, {
            contentType: file.type || 'application/pdf',
            public: false
        });
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, continuing with in-memory buffer:', storageErr);
      }
    } else {
      console.log('Firebase Storage bucket not configured. Skipping archival upload for local development.');
    }
    
    // 2. Call Python OCR microservice
    const pythonFormData = new FormData();
    pythonFormData.append('file', new Blob([buffer], { type: file.type }), file.name);
    
    const pythonUrl = process.env.PYTHON_OCR_URL || 'http://localhost:8000/extract';
    let ocrResponse;
    try {
        const ocrTimeout = new AbortController();
        const ocrTimeoutId = setTimeout(() => ocrTimeout.abort(), 30000); // 30s timeout

        ocrResponse = await fetch(pythonUrl, {
            method: 'POST',
            body: pythonFormData,
            signal: ocrTimeout.signal,
        });
        clearTimeout(ocrTimeoutId);
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.error('Python OCR service timed out after 30s');
            return NextResponse.json({ error: 'OCR service timed out. Please try again.' }, { status: 504 });
        }
        console.error('Failed to reach Python OCR service:', err);
        return NextResponse.json({ error: 'OCR service unreachable. Make sure the OCR server is running.' }, { status: 503 });
    }

    if (!ocrResponse.ok) {
        console.error('OCR service error:', await ocrResponse.text());
        return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
    }
    
    const ocrData = await ocrResponse.json();
    const extractedText = ocrData.extracted_text;

    // 3. Classify document
    const detectedType = await classifyDocument(extractedText);

    // 4. Return to frontend matching exact UploadResponse format
    return NextResponse.json({
        filename: filename,
        extracted_text: extractedText,
        detected_type: detectedType,
        char_count: extractedText.length
    });
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
