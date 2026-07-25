import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { VersionService } from '@/lib/services/version/VersionService';
import { ActivityService, ActivityTypes } from '@/lib/services/activity/ActivityService';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const versions = await VersionService.listVersions(id);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    const reason = body.reason || 'Manual Save';
    
    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data()?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data()!;
    const result = await VersionService.createVersion(id, docData, reason, body.restoredFrom);

    if (result.skipped) {
      return NextResponse.json({ 
        success: true, 
        message: 'No changes detected since last version.',
        version: result.version
      });
    }

    await ActivityService.logActivity({
      type: ActivityTypes.VERSION_CREATED,
      entityType: 'version',
      entityId: id, // Use the parent document ID so Activity Center links to /doc/{id}
      title: docData.project_name || 'Untitled',
      status: 'success',
      metadata: { reason, versionId: result.version.id }
    });

    return NextResponse.json({ success: true, version: result.version });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
  }
}
