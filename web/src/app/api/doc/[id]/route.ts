import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { calculateTotals, calculateReceiptTotals } from '@/lib/documents';

// Compatibility layer: /api/doc/[id] → maps to /api/documents/[id]
// The frontend api.js calls /api/doc/:id for GET, PUT, DELETE on single documents.

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const data = docSnap.data();
    if (data?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ id: docSnap.id, ...data });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const currentData = docSnap.data();
    if (currentData?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let updatedContent = body.content || currentData?.content || {};

    // Auto-calculate totals on save
    if (currentData?.template_type === 'client_doc' || currentData?.template_type === 'invoice') {
      updatedContent = calculateTotals(updatedContent);
    } else if (currentData?.template_type === 'receipt_template') {
      updatedContent = calculateReceiptTotals(updatedContent);
    }

    const updates: any = {
      content: updatedContent,
      html_content: body.html_content || currentData?.html_content || '',
      updatedAt: new Date().toISOString(),
    };

    // Keep the root project_name in sync with the content so the dashboard displays it correctly
    const newName = updatedContent.project_name || updatedContent.title || updatedContent.subject || updatedContent.for_service || updatedContent.client_name;
    if (newName) {
      updates.project_name = newName;
    }

    await docRef.update(updates);

    return NextResponse.json({ id, ...currentData, ...updates });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docRef = adminDb.collection('documents').doc(id);

    await docRef.update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
