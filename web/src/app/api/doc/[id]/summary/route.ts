import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { AIService } from '@/lib/services/ai/AIService';

// POST /api/doc/[id]/summary
// Used to generate a summary for a document without persisting it directly.
// The client is responsible for persisting the returned summary.

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const documentType = docData?.template_type || 'developer_doc';
    const structuredContent = docData?.content || {};

    const summary = await AIService.summarizeDocument({
      documentType,
      structuredContent,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
