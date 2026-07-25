import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getStorageProvider } from '@/lib/services/storage';
import { WorkerTrigger } from '@/lib/services/batch/WorkerTrigger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: batchId } = await params;
    
    // 1. Validate batch
    const batchRef = adminDb.collection('batches').doc(batchId);
    const batchSnap = await batchRef.get();
    if (!batchSnap.exists) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. Upload to Staging
    const storage = getStorageProvider();
    // Assuming uploadStaging is supported, otherwise fallback to normal upload
    let stagingUrl = null;
    let stagingPublicId = null;
    
    if (typeof storage.uploadStaging === 'function') {
      const stagingInfo = await storage.uploadStaging(buffer, file.name, file.type || 'application/pdf');
      stagingUrl = stagingInfo.url;
      stagingPublicId = stagingInfo.identifier;
    } else {
      // Fallback
      const uploadInfo = await storage.upload(buffer, file.name, file.type || 'application/pdf');
      stagingUrl = uploadInfo.url;
      stagingPublicId = uploadInfo.identifier;
    }

    // 3. Create Task
    const taskData = {
      status: 'PENDING',
      priority: 1,
      retryCount: 0,
      maxRetries: 3,
      originalFilename: file.name,
      stagingUrl,
      stagingPublicId,
      finalDocumentId: null,
      errorReason: null,
      createdAt: new Date().toISOString()
    };

    const taskRef = await batchRef.collection('tasks').add(taskData);

    // Make sure the background worker is polling
    WorkerTrigger.startLocalDevelopmentWorker();

    return NextResponse.json({ success: true, taskId: taskRef.id });
  } catch (error: any) {
    console.error('Error uploading batch file:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
