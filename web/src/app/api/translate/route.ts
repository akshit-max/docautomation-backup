import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doc_id, language } = body;
    const lang = language || 'hindi';

    if (!doc_id) {
      return NextResponse.json({ error: 'doc_id is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('documents').doc(doc_id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const openrouterPayload = {
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Translate all text values in this JSON to ${lang} language.
Keep all JSON keys exactly the same — only translate the string values.
Keep numbers, dates, and special characters unchanged.
Return ONLY valid JSON, no explanation.

JSON to translate:
${JSON.stringify(docData?.content || {})}`
      }]
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
      console.error('OpenRouter API error on translate');
      return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }

    const aiData = await response.json();
    let rawContent = aiData.choices[0].message.content.trim();
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    let translatedContent: any;
    try {
      translatedContent = JSON.parse(rawContent);
    } catch (e) {
      console.error('Failed to parse translated JSON:', rawContent);
      return NextResponse.json({ error: 'Invalid JSON returned by AI for translation' }, { status: 500 });
    }

    await docRef.update({
      content: translatedContent,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ id: doc_id, content: translatedContent });
  } catch (error) {
    console.error('Error translating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
