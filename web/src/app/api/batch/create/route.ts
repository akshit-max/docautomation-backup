import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { WorkerTrigger } from '@/lib/services/batch/WorkerTrigger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { template_type, totalDocuments } = body;

    if (!template_type || !totalDocuments) {
      return NextResponse.json({ error: 'template_type and totalDocuments are required' }, { status: 400 });
    }

    const batchData = {
      template_type,
      status: 'processing',
      totalDocuments,
      completed: 0,
      failed: 0,
      processing: 0,
      pending: totalDocuments,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      estimatedRemainingSeconds: totalDocuments * 15 // naive estimate (15s per doc)
    };

    const batchRef = await adminDb.collection('batches').add(batchData);

    // Make sure the background worker is polling
    WorkerTrigger.startLocalDevelopmentWorker();

    return NextResponse.json({ success: true, batchId: batchRef.id });
  } catch (error: any) {
    console.error('Error creating batch:', error);
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }
}
