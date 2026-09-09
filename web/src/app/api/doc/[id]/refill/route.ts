import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { SYSTEM_PROMPT, SCHEMAS, calculateTotals, calculateReceiptTotals } from '@/lib/documents';

// POST /api/doc/[id]/refill
// Used by Editor.jsx refillDocument(id, prompt) — regenerates document content with a new prompt.

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // refillDocument passes prompt as second arg; api.js sends { prompt }
    const userPrompt = body.prompt || body.raw_input || '';
    if (!userPrompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Fetch current document to get template_type
    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const currentData = docSnap.data();
    if (currentData?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const templateType = currentData?.template_type || 'developer_doc';
    const schema = SCHEMAS[templateType];

    if (!schema) {
      return NextResponse.json({ error: `Unsupported template type: ${templateType}` }, { status: 400 });
    }

    const openrouterPayload = {
      model: process.env.LLM_MODEL || 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate the document content based on this input: "${userPrompt}".
Return ONLY valid JSON matching this exact schema structure:
${JSON.stringify(schema, null, 2)}`
        }
      ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://makewithus.in',
        'X-Title': 'Doc Automation',
      },
      body: JSON.stringify(openrouterPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error on refill:', errorText);
      let parsedMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) parsedMsg = parsed.error.message;
      } catch {}
      return NextResponse.json({ error: `AI generation failed: ${parsedMsg}` }, { status: 500 });
    }

    const aiData = await response.json();
    let rawContent = aiData.choices[0].message.content.trim();
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    let content: any;
    try {
      content = JSON.parse(rawContent);
    } catch (e) {
      console.error('Failed to parse AI JSON response:', rawContent);
      return NextResponse.json({ error: 'Invalid JSON returned by AI' }, { status: 500 });
    }

    // Preserve existing invoice number — never overwrite a generated sequential number
    if (templateType === 'invoice' && currentData?.content?.invoice_number) {
      content.invoice_number = currentData.content.invoice_number;
    }

    // Auto-calculate totals
    if (templateType === 'client_doc' || templateType === 'invoice') {
      content = calculateTotals(content);
    } else if (templateType === 'receipt_template') {
      content = calculateReceiptTotals(content);
    }

    const updates: any = {
      content,
      updatedAt: new Date().toISOString(),
    };

    const newName = content.project_name || content.title || content.subject || content.for_service;
    if (newName) {
      updates.project_name = newName;
    }

    // Save regenerated content back to Firestore
    await docRef.update(updates);

    // Return in format Editor.jsx expects: { content, html_content }
    return NextResponse.json({
      id,
      content,
      html_content: '',  // HTML is not server-rendered; Editor uses the JSON content directly
      document: { content },
    });
  } catch (error: any) {
    console.error('Error refilling document:', error?.message || error);
    return NextResponse.json({ error: 'Refill failed: ' + (error?.message || 'Unknown error') }, { status: 500 });
  }
}
