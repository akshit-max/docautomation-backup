import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ActivityService } from '@/lib/services/activity/ActivityService';

// POST /api/doc/[id]/translate
// Used by api.js translateDocument(docId, language) which calls this URL with { language }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const lang = body.language || 'hindi';

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const openrouterPayload = {
      model: process.env.LLM_MODEL || 'openai/gpt-oss-20b:free',
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
      const errBody = await response.text();
      console.error('OpenRouter API error on translate:', errBody);
      let parsedMsg = errBody;
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.error?.message) parsedMsg = parsed.error.message;
      } catch {}
      return NextResponse.json({ error: `Translation failed: ${parsedMsg}` }, { status: 500 });
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
      updatedAt: new Date().toISOString(),
    });

    await ActivityService.logTranslationCompleted(
      id,
      docData?.project_name || docData?.title || 'Translated Document',
      'system',
      { language: lang, model: openrouterPayload.model }
    );

    return NextResponse.json({ id, content: translatedContent });
  } catch (error) {
    console.error('Error translating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
