import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateInvoiceNumber } from '@/lib/db';
import { SYSTEM_PROMPT, SCHEMAS, calculateTotals, calculateReceiptTotals } from '@/lib/documents';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { raw_input, template_type } = body;

    if (!raw_input) {
      return NextResponse.json({ error: 'raw_input is required' }, { status: 400 });
    }

    // Default to a template type or detect from text if not provided?
    // In old system, classification was done during upload and passed to generate.
    // Wait, old python `generate.py` `smart_generate` would use `template_type` if provided, 
    // or detect if not. Let's assume `template_type` is passed. If not, default to developer_doc.
    const typeToUse = template_type || 'developer_doc';
    const schema = SCHEMAS[typeToUse];

    if (!schema) {
      return NextResponse.json({ error: `Unsupported template type: ${typeToUse}` }, { status: 400 });
    }

    const openrouterPayload = {
      model: process.env.LLM_MODEL || 'openai/gpt-oss-20b:free',
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate the document content based on this input: "${raw_input}".
Return ONLY valid JSON matching this exact schema structure:
${JSON.stringify(schema, null, 2)}`
        }
      ]
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://makewithus.in',
        'X-Title': 'Doc Automation',
      },
      body: JSON.stringify(openrouterPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const aiData = await response.json();
    let rawContent = aiData.choices[0].message.content.trim();
    rawContent = rawContent.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

    let content: any;
    try {
      content = JSON.parse(rawContent);
    } catch (e) {
      console.error('Failed to parse AI JSON response:', rawContent);
      return NextResponse.json({ error: 'Invalid JSON returned by AI' }, { status: 500 });
    }

    // Assign invoice number if needed
    if (typeToUse === 'invoice') {
      content.invoice_number = await generateInvoiceNumber();
    }

    // Auto-calculate totals
    if (typeToUse === 'client_doc' || typeToUse === 'invoice') {
      content = calculateTotals(content);
    } else if (typeToUse === 'receipt_template') {
      content = calculateReceiptTotals(content);
    }

    // Create document in Firestore
    const docData = {
      project_name: content.project_name || 'Untitled Project',
      template_type: typeToUse,
      raw_input: raw_input,
      content,
      html_content: '',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('documents').add(docData);

    // Return the format expected by frontend: { success: true, doc_id, ... }
    return NextResponse.json({ 
        success: true, 
        doc_id: docRef.id, 
        template_type: typeToUse, 
        project_name: docData.project_name, 
        content 
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
