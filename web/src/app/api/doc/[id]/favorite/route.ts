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
    const { isFavorite } = body;

    if (typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: 'isFavorite must be a boolean' }, { status: 400 });
    }

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    const oldFavorite = docData?.isFavorite || false;

    if (oldFavorite === isFavorite) {
      return NextResponse.json({ success: true, message: 'No change needed' });
    }

    await docRef.update({
      isFavorite,
      updatedAt: new Date().toISOString()
    });

    const title = docData?.project_name || docData?.title || 'Untitled Document';
    
    if (isFavorite) {
      await ActivityService.logFavorited(id, title);
    } else {
      await ActivityService.logUnfavorited(id, title);
    }

    return NextResponse.json({ success: true, isFavorite });
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
