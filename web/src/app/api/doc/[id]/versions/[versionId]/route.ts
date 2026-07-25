import { NextResponse } from 'next/server';
import { VersionService } from '@/lib/services/version/VersionService';

export async function GET(request: Request, { params }: { params: Promise<{ id: string, versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    const version = await VersionService.getVersion(id, versionId);
    
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 });
  }
}
