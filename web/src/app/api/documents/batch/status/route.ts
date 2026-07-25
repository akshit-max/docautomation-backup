import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ActivityService } from '@/lib/services/activity/ActivityService';
import { ALLOWED_STATUSES } from '@/lib/constants/document-status';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentIds, status } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Valid documentIds array is required' }, { status: 400 });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    // Limit batch size to 500 (Firestore WriteBatch limit)
    if (documentIds.length > 500) {
      return NextResponse.json({ error: 'Maximum batch size is 500 documents' }, { status: 400 });
    }

    const batch = adminDb.batch();
    
    documentIds.forEach((id: string) => {
      const docRef = adminDb.collection('documents').doc(id);
      batch.update(docRef, { 
        status,
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();

    await ActivityService.logBatchStatusUpdated(documentIds.length, status);

    return NextResponse.json({ success: true, count: documentIds.length });
  } catch (error: any) {
    console.error('Error in batch status update:', error);
    return NextResponse.json({ error: 'Failed to update status for documents' }, { status: 500 });
  }
}
