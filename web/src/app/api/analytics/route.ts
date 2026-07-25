import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics/AnalyticsService';

export async function GET(request: Request) {
  try {
    const [overview, templates, batches] = await Promise.all([
      AnalyticsService.getOverviewMetrics(),
      AnalyticsService.getTemplateDistribution(),
      AnalyticsService.getBatchMetrics()
    ]);

    return NextResponse.json({
      overview,
      templates,
      batches
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
