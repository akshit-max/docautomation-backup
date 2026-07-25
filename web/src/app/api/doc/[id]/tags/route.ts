import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ActivityService } from '@/lib/services/activity/ActivityService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    let { tag } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    tag = tag.trim();
    if (tag.length === 0 || tag.length > 30) {
      return NextResponse.json({ error: 'Tag must be between 1 and 30 characters' }, { status: 400 });
    }

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    let tags: string[] = docData?.tags || [];

    // Case-insensitive check
    if (tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      return NextResponse.json({ success: true, message: 'Tag already exists' });
    }

    if (tags.length >= 20) {
      return NextResponse.json({ error: 'Maximum of 20 tags allowed' }, { status: 400 });
    }

    tags.push(tag);
    tags.sort((a, b) => a.localeCompare(b)); // Sort alphabetically

    await docRef.update({
      tags,
      updatedAt: new Date().toISOString()
    });

    const title = docData?.project_name || docData?.title || 'Untitled Document';
    await ActivityService.logTagAdded(id, title, tag);

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('Error adding tag:', error);
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    let { tag } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    tag = tag.trim();

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    let tags: string[] = docData?.tags || [];

    const initialLength = tags.length;
    tags = tags.filter(t => t.toLowerCase() !== tag.toLowerCase());

    if (tags.length === initialLength) {
      return NextResponse.json({ success: true, message: 'Tag not found' });
    }

    await docRef.update({
      tags,
      updatedAt: new Date().toISOString()
    });

    const title = docData?.project_name || docData?.title || 'Untitled Document';
    await ActivityService.logTagRemoved(id, title, tag);

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('Error removing tag:', error);
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
  }
}
