import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

import { generateInvoiceNumber } from '@/lib/db';

async function getDefaultContent(templateType: string) {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
  
  const content: any = { date: dateStr };
  
  switch (templateType) {
    case 'invoice':
      content.invoice_number = await generateInvoiceNumber();
      break;
    case 'receipt_template':
      content.receipt_number = `RWC${Math.floor(100 + Math.random() * 900)}`;
      break;
    case 'client_doc':
      content.quotation_number = `QT-${today.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      break;
  }
  
  return content;
}

// Compatibility: POST /api/doc/create → maps to POST /api/documents
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const docData = {
      project_name: 'Untitled Project',
      template_type: body.template_type,
      raw_input: '',
      content: await getDefaultContent(body.template_type),
      html_content: '',
      source_file: null,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('documents').add(docData);

    // Return in the exact format frontend Home.jsx expects: { doc_id }
    return NextResponse.json({ doc_id: docRef.id, ...docData });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
