import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ActivityService } from '@/lib/services/activity/ActivityService';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentIds, tags } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Valid documentIds array is required' }, { status: 400 });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Valid tags array is required' }, { status: 400 });
    }

    const sanitizedTags = tags
      .map((t: any) => String(t).trim())
      .filter((t: string) => t.length > 0 && t.length <= 30);

    if (sanitizedTags.length === 0) {
      return NextResponse.json({ error: 'No valid tags provided' }, { status: 400 });
    }

    // Limit batch size to 500 (Firestore WriteBatch limit)
    if (documentIds.length > 500) {
      return NextResponse.json({ error: 'Maximum batch size is 500 documents' }, { status: 400 });
    }

    const batch = adminDb.batch();
    
    documentIds.forEach((id: string) => {
      const docRef = adminDb.collection('documents').doc(id);
      batch.update(docRef, { 
        tags: FieldValue.arrayUnion(...sanitizedTags),
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();

    await ActivityService.logBatchTagsAdded(documentIds.length, sanitizedTags);

    return NextResponse.json({ success: true, count: documentIds.length });
  } catch (error: any) {
    console.error('Error in batch tags update:', error);
    return NextResponse.json({ error: 'Failed to update tags for documents' }, { status: 500 });
  }
}
