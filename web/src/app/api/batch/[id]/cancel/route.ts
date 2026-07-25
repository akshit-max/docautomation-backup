import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: batchId } = await params;
    const batchRef = adminDb.collection('batches').doc(batchId);
    
    await batchRef.update({
      status: 'cancelled',
      completedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling batch:', error);
    return NextResponse.json({ error: 'Failed to cancel batch' }, { status: 500 });
  }
}
