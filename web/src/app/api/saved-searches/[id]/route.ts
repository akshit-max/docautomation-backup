import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const USER_ID = 'default_user';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = adminDb.collection('saved_searches').doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    if (snap.data()?.userId !== USER_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 });
  }
}
