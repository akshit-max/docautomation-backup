import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: batchId } = await params;
    const batchRef = adminDb.collection('batches').doc(batchId);
    const batchSnap = await batchRef.get();
    
    if (!batchSnap.exists) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batchData = { id: batchSnap.id, ...batchSnap.data() };

    // Also get all tasks for this batch
    const tasksSnap = await batchRef.collection('tasks').get();
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ batch: batchData, tasks });
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
  }
}
