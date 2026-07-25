import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ExportService } from '@/lib/services/export/ExportService';
import { ActivityService } from '@/lib/services/activity/ActivityService';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format'); // json, csv, excel

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.isDeleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const content = docData?.content || {};

    // Best-effort activity logging
    ActivityService.logActivity({
      type: 'DOCUMENT_EXPORTED',
      entityType: 'document',
      entityId: id,
      title: `Exported document to ${format?.toUpperCase()}`,
      status: 'success',
      metadata: { projectId: docData?.projectId }
    }).catch(console.warn);

    if (format === 'json') {
      const jsonStr = ExportService.exportJson(content);
      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="document-${id}.json"`
        }
      });
    }

    if (format === 'csv') {
      const csvStr = ExportService.exportCsv(content);
      return new NextResponse(csvStr, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="document-${id}.csv"`
        }
      });
    }

    if (format === 'excel') {
      const excelBuf = ExportService.exportExcel(content);
      return new NextResponse(excelBuf as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="document-${id}.xlsx"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Use json, csv, or excel.' }, { status: 400 });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed', details: error.message }, { status: 500 });
  }
}
