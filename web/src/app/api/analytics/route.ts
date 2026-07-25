import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics/AnalyticsService';

export async function GET() {
  try {
    const [overview, templates, batches, dashboard] = await Promise.all([
      AnalyticsService.getOverviewMetrics(),
      AnalyticsService.getTemplateDistribution(),
      AnalyticsService.getBatchMetrics(),
      AnalyticsService.getDashboardAnalytics()
    ]);

    return NextResponse.json({
      overview,
      templates,
      batches,
      dashboard
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
