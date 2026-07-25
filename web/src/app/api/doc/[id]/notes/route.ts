import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ActivityService } from '@/lib/services/activity/ActivityService';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 });
    }

    if (notes.length > 5000) {
      return NextResponse.json({ error: 'Notes cannot exceed 5000 characters' }, { status: 400 });
    }

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    const oldNotes = docData?.notes || '';

    if (oldNotes === notes) {
      return NextResponse.json({ success: true, message: 'No change needed' });
    }

    await docRef.update({
      notes,
      updatedAt: new Date().toISOString()
    });

    const title = docData?.project_name || docData?.title || 'Untitled Document';
    await ActivityService.logNotesUpdated(id, title);

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error('Error updating notes:', error);
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
  }
}
