import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    let query: any = adminDb.collection('documents')
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc');

    if (limitParam) {
      query = query.limit(parseInt(limitParam, 10));
    }

    const snapshot = await query.get();
    const documents = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(documents);
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

    return NextResponse.json({ id: docRef.id, ...docData });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
