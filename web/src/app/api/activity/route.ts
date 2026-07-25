import { NextResponse } from 'next/server';
import { ActivityService } from '@/lib/services/activity/ActivityService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const filter = searchParams.get('filter') || 'All';
    const startAfter = searchParams.get('startAfter') || undefined;

    const result = await ActivityService.getRecentActivities(limit, filter, startAfter);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
