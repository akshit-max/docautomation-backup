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
  VERSION_RESTORED: 'VERSION_RESTORED',
  CHAT_SESSION_STARTED: 'CHAT_SESSION_STARTED',
  BATCH_COMPLETED: 'BATCH_COMPLETED',
  BATCH_FAILED: 'BATCH_FAILED',
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

export interface LogActivityParams {
  type: ActivityType;
  entityType: 'document' | 'batch' | 'version' | 'system';
  entityId: string;
  title: string;
  status?: 'success' | 'failed' | 'info';
  metadata?: Record<string, any>;
}

export class ActivityService {
  /**
   * Low-level activity logging method. Wrapped in try/catch for non-blocking best-effort execution.
   */
  static async logActivity(params: LogActivityParams): Promise<void> {
    try {
      const activityData = {
        ...params,
        status: params.status || 'success',
        metadata: params.metadata || {},
        createdAt: new Date().toISOString()
      };

      await adminDb.collection('activities').add(activityData);
    } catch (error) {
      console.warn("Activity logging failed", error);
    }
  }

  // ── Dedicated Domain Logging API (No routes should write directly to Firestore for activities) ──

  static async logDocumentCreated(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.DOCUMENT_CREATED,
        entityType: 'document',
        entityId: documentId,
        title: title || 'Untitled Document',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logDocumentUpdated(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.DOCUMENT_UPDATED,
        entityType: 'document',
        entityId: documentId,
        title: title || 'Untitled Document',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logVersionCreated(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.VERSION_CREATED,
        entityType: 'version',
        entityId: documentId,
        title: title || 'Untitled Document',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logVersionRestored(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.VERSION_RESTORED,
        entityType: 'version',
        entityId: documentId,
        title: title || 'Untitled Document',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logTranslationCompleted(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.TRANSLATION_COMPLETED,
        entityType: 'document',
        entityId: documentId,
        title: title || 'Translated Document',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logSummaryGenerated(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.AI_SUMMARY_GENERATED,
        entityType: 'document',
        entityId: documentId,
        title: title || 'Document Summary',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logChatSessionStarted(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.CHAT_SESSION_STARTED,
        entityType: 'document',
        entityId: documentId,
        title: title || 'AI Chat Session',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  static async logDocumentExported(documentId: string, title: string, userId: string = 'system', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.logActivity({
        type: ActivityTypes.DOCUMENT_EXPORTED,
        entityType: 'document',
        entityId: documentId,
        title: title || 'Exported Document',
        metadata: { userId, ...metadata }
      });
    } catch (err) {
      console.warn("Activity logging failed", err);
    }
  }

  /**
   * Retrieves activities ordered by createdAt descending, with optional type filtering and pagination.
   */
  static async getRecentActivities(limit: number = 20, filterCategory?: string, startAfterIso?: string) {
    let query: any = adminDb.collection('activities');
    let allowedTypes: string[] = [];

    // Identify allowed types for category filtering
    if (filterCategory && filterCategory !== 'All') {
      if (filterCategory === 'Documents') {
        allowedTypes = [ActivityTypes.DOCUMENT_CREATED, ActivityTypes.DOCUMENT_UPDATED, ActivityTypes.OCR_COMPLETED];
      } else if (filterCategory === 'AI') {
        allowedTypes = [ActivityTypes.TRANSLATION_COMPLETED, ActivityTypes.AI_SUMMARY_GENERATED, ActivityTypes.CHAT_SESSION_STARTED];
      } else if (filterCategory === 'Versions') {
        allowedTypes = [ActivityTypes.VERSION_CREATED, ActivityTypes.VERSION_RESTORED];
      } else if (filterCategory === 'Export') {
        allowedTypes = [ActivityTypes.DOCUMENT_EXPORTED];
      }
    }

    // Order by createdAt descending. We avoid adding .where('type', 'in', ...) to the Firestore query
    // because combining .where() and .orderBy() in Firestore requires a composite index for every category combination.
    // Instead, we fetch a larger slice and filter in memory, which is index-free and lightning fast.
    query = query.orderBy('createdAt', 'desc');

    if (startAfterIso) {
      query = query.startAfter(startAfterIso);
    }

    const fetchLimit = (filterCategory && filterCategory !== 'All' && allowedTypes.length > 0) ? Math.max(150, limit * 5) : limit + 1;
    const snap = await query.limit(fetchLimit).get();

    let matchingDocs = snap.docs;
    if (filterCategory && filterCategory !== 'All' && allowedTypes.length > 0) {
      matchingDocs = snap.docs.filter((doc: any) => allowedTypes.includes(doc.data().type));
    }

    const hasMore = matchingDocs.length > limit || (filterCategory && filterCategory !== 'All' && snap.docs.length === fetchLimit);
    const docs = matchingDocs.slice(0, limit);

    const activities = docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    const nextCursor = docs.length > 0 
      ? docs[docs.length - 1].data().createdAt 
      : (snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].data().createdAt : null);

    return {
      activities,
      hasMore,
      nextCursor
    };
  }
}
