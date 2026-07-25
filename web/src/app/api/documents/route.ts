import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { DocumentQueryService } from '@/lib/services/documents/DocumentQueryService';
import { ActivityService, ActivityTypes } from '@/lib/services/activity/ActivityService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const type = searchParams.get('type') || undefined;
    const client = searchParams.get('client') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const sort = searchParams.get('sort') || 'createdAt';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const cursor = searchParams.get('cursor') || undefined;

    const result = await DocumentQueryService.searchDocuments({
      q, type, client, from, to, sort, order, limit, cursor
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const docData = {
      project_name: body.project_name || 'Untitled Project',
      template_type: body.template_type,
      raw_input: body.raw_input || '',
      content: body.content || {},
      html_content: body.html_content || '',
      source_file: body.source_file || null,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('documents').add(docData);

    await ActivityService.logActivity({
      type: ActivityTypes.DOCUMENT_CREATED,
      entityType: 'document',
      entityId: docRef.id,
      title: docData.project_name,
      status: 'success',
      metadata: { template_type: docData.template_type }
    });

    return NextResponse.json({ id: docRef.id, ...docData });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
