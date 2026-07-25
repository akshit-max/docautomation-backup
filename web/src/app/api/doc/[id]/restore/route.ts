import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { VersionService } from '@/lib/services/version/VersionService';
import { ActivityService } from '@/lib/services/activity/ActivityService';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { versionId } = body;
    
    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data()?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const docData = docSnap.data()!;

    const result = await VersionService.restoreVersion(id, versionId, docData);

    await ActivityService.logVersionRestored(
      id,
      docData.project_name || 'Untitled Document',
      'system',
      { restoredFromVersionId: versionId }
    );

    return NextResponse.json({ 
      success: true, 
      restoredVersion: result.version
    });

  } catch (error: any) {
    console.error('Error restoring version:', error);
    if (error.message === 'Target version not found') {
      return NextResponse.json({ error: 'Target version not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
