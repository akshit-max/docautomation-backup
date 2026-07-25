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

    // Best-effort domain activity logging
    ActivityService.logDocumentExported(
      id,
      docData?.project_name || docData?.title || 'Untitled Document',
      'system',
      { exportFormat: format, projectId: docData?.projectId }
    ).catch(console.warn);

    const templateType = docData?.template_type || 'Document';
    const rawTitle = docData?.project_name || docData?.title || docData?.subject || `doc_${id}`;
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    const baseFilename = `${templateType}_${safeTitle}_${dateStr}`;

    if (format === 'json') {
      const jsonStr = ExportService.exportJson(content);
      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${baseFilename}.json"`
        }
      });
    }

    if (format === 'csv') {
      const csvStr = ExportService.exportCsv(content);
      return new NextResponse(csvStr, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${baseFilename}.csv"`
        }
      });
    }

    if (format === 'excel') {
      const excelBuf = ExportService.exportExcel(content);
      return new NextResponse(excelBuf as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${baseFilename}.xlsx"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Use json, csv, or excel.' }, { status: 400 });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed', details: error.message }, { status: 500 });
  }
}
