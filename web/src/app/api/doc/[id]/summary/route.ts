import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { AIService } from '@/lib/services/ai/AIService';
import { ActivityService } from '@/lib/services/activity/ActivityService';

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

    await ActivityService.logSummaryGenerated(
      id,
      docData?.project_name || docData?.title || 'Document Summary',
      'system',
      { wordCount: typeof summary === 'string' ? summary.split(/\s+/).length : 0 }
    );

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
