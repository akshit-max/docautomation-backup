import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ActivityService } from '@/lib/services/activity/ActivityService';
import { ALLOWED_STATUSES } from '@/lib/constants/document-status';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    const oldStatus = docData?.status || 'Draft';
    const title = docData?.project_name || docData?.title || 'Untitled Document';

    if (oldStatus === status) {
      return NextResponse.json({ success: true, message: 'Status is already set to this value.' });
    }

    await docRef.update({
      status,
      updatedAt: new Date().toISOString()
    });

    await ActivityService.logStatusChanged(id, title, oldStatus, status);

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error updating document status:', error);
    return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
  }
}
