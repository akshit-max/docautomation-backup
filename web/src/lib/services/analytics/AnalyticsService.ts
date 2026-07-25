import { adminDb } from '@/lib/firebase-admin';

export class AnalyticsService {
  /**
   * Retrieves high-level overview metrics like total documents and documents created today.
   */
  static async getOverviewMetrics() {
    const documentsRef = adminDb.collection('documents').where('isDeleted', '==', false);

    // Total Documents
    const totalSnap = await documentsRef.count().get();
    const totalDocuments = totalSnap.data().count;

    // Created Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    
    const todaySnap = await documentsRef.where('createdAt', '>=', todayIso).count().get();
    const createdToday = todaySnap.data().count;

    return {
      totalDocuments,
      createdToday,
      // Note: Omitted 'summariesGenerated' and 'averageOcrDuration' 
      // as they cannot be computed efficiently without full scans or new indexes.
    };
  }

  /**
   * Retrieves document counts grouped by template type.
   */
  static async getTemplateDistribution() {
    const templates = ['invoice', 'receipt_template', 'client_doc', 'compliance', 'timeline'];
    const distribution = [];

    const documentsRef = adminDb.collection('documents').where('isDeleted', '==', false);

    // Run count queries in parallel for efficiency
    const promises = templates.map(async (type) => {
      const snap = await documentsRef.where('template_type', '==', type).count().get();
      return {
        type,
        count: snap.data().count
      };
    });

    const results = await Promise.all(promises);
    return results.filter(r => r.count > 0).sort((a, b) => b.count - a.count);
  }

  /**
   * Retrieves metrics on batch jobs.
   */
  static async getBatchMetrics() {
    const batchesRef = adminDb.collection('batches');

    const [completedSnap, failedSnap] = await Promise.all([
      batchesRef.where('status', '==', 'completed').count().get(),
      batchesRef.where('status', '==', 'failed').count().get()
    ]);

    return {
      completed: completedSnap.data().count,
      failed: failedSnap.data().count
    };
  }
}
