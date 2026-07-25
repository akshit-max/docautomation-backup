import { adminDb } from '@/lib/firebase-admin';

export const ActivityTypes = {
  DOCUMENT_CREATED: 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  DOCUMENT_EXPORTED: 'DOCUMENT_EXPORTED',
  OCR_COMPLETED: 'OCR_COMPLETED',
  OCR_FAILED: 'OCR_FAILED',
  AI_SUMMARY_GENERATED: 'AI_SUMMARY_GENERATED',
  TRANSLATION_COMPLETED: 'TRANSLATION_COMPLETED',
  VERSION_CREATED: 'VERSION_CREATED',
  BATCH_COMPLETED: 'BATCH_COMPLETED',
  BATCH_FAILED: 'BATCH_FAILED',
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

export interface LogActivityParams {
  type: ActivityType;
  entityType: 'document' | 'batch' | 'version' | 'system';
  entityId: string;
  title: string;
  status: 'success' | 'failed' | 'info';
  metadata?: Record<string, any>;
}

export class ActivityService {
  /**
   * Logs an activity to Firestore. 
   * This is a "best-effort" operation. It catches its own errors so it never blocks or fails the main user flow.
   */
  static async logActivity(params: LogActivityParams): Promise<void> {
    try {
      const activityData = {
        ...params,
        metadata: params.metadata || {},
        createdAt: new Date().toISOString()
      };

      await adminDb.collection('activities').add(activityData);
    } catch (error) {
      // Best-effort logging: we do not throw this error to the caller.
      console.warn("Failed to log activity to Firestore:", error);
    }
  }

  /**
   * Retrieves the most recent activities.
   */
  static async getRecentActivities(limit: number = 20) {
    const snap = await adminDb.collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
      
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}
