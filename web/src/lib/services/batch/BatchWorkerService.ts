import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ActivityService, ActivityTypes } from '@/lib/services/activity/ActivityService';
import { ProcessingService } from './ProcessingService';

export class BatchWorkerService {
  
  /**
   * Called by a trigger (e.g. cron, pubsub, or API route) to process the next task in the queue.
   * Uses a Firestore transaction to claim the task atomically to prevent race conditions.
   * Returns true if a task was processed (or attempted), false if no pending tasks were found.
   */
  static async processNextTask(): Promise<boolean> {
    // 1. Find an active batch
    const batchesSnap = await adminDb.collection('batches')
      .where('status', '==', 'processing')
      .limit(1)
      .get();
      
    if (batchesSnap.empty) return false;
    
    const batchDoc = batchesSnap.docs[0];
    const batchId = batchDoc.id;

    // 2. Find a pending task
    const tasksSnap = await batchDoc.ref.collection('tasks')
      .where('status', '==', 'PENDING')
      .limit(1)
      .get();
      
    if (tasksSnap.empty) return false;

    const taskDoc = tasksSnap.docs[0];
    const taskId = taskDoc.id;

    // 3. Transactional Claim
    // This atomic lock prevents two concurrent workers from picking the same task
    // It also atomically updates the batch counters to prevent desynchronization
    const claimedTaskData = await adminDb.runTransaction(async (transaction) => {
      const tDoc = await transaction.get(taskDoc.ref);
      if (!tDoc.exists) return null;
      
      const data = tDoc.data()!;
      if (data.status !== 'PENDING') return null; // Already claimed by another worker

      transaction.update(taskDoc.ref, { status: 'CLAIMED' });
      transaction.update(batchDoc.ref, {
        processing: FieldValue.increment(1),
        pending: FieldValue.increment(-1)
      });
      return data;
    });

    if (!claimedTaskData) {
      console.log(`[BatchWorker] Task ${taskId} was already claimed or missing. Skipping.`);
      return true; // We return true because there might be other tasks to process
    }

    console.log(`[BatchWorker] Successfully claimed Task ${taskId} in Batch ${batchId}`);


    // 5. Execute processing
    try {
      await ProcessingService.processBatchTask(batchId, taskId, claimedTaskData);
    } catch (error) {
      console.error(`[BatchWorker] Task ${taskId} failed:`, error);
      
      const retryCount = (claimedTaskData.retryCount || 0) + 1;
      const maxRetries = claimedTaskData.maxRetries || 3;
      
      if (retryCount < maxRetries) {
        // Revert to PENDING for retry
        await taskDoc.ref.update({ 
          status: 'PENDING',
          retryCount,
          errorReason: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Revert batch counts
        await batchDoc.ref.update({
          processing: FieldValue.increment(-1),
          pending: FieldValue.increment(1)
        });
        console.log(`[BatchWorker] Task ${taskId} queued for retry (${retryCount}/${maxRetries})`);
      } else {
        // Mark as FAILED permanently
        await taskDoc.ref.update({
          status: 'FAILED',
          retryCount,
          errorReason: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await batchDoc.ref.update({
          failed: FieldValue.increment(1),
          processing: FieldValue.increment(-1)
        });
        console.log(`[BatchWorker] Task ${taskId} permanently FAILED after ${retryCount} retries.`);
      }
    }

    // 6. Check if batch is complete
    await this.checkBatchCompletion(batchDoc.ref);
    return true;
  }

  private static async checkBatchCompletion(batchRef: FirebaseFirestore.DocumentReference) {
    const batchSnap = await batchRef.get();
    if (!batchSnap.exists) return;
    
    const bData = batchSnap.data()!;
    if (bData.status === 'cancelled') return;

    if (bData.completed + bData.failed >= bData.totalDocuments) {
      await batchRef.update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        pending: 0,
        processing: 0,
        estimatedRemainingSeconds: 0
      });
      console.log(`[BatchWorker] Batch ${batchRef.id} marked as COMPLETED.`);

      const isFailed = bData.completed === 0 && bData.failed > 0;
      await ActivityService.logActivity({
        type: isFailed ? ActivityTypes.BATCH_FAILED : ActivityTypes.BATCH_COMPLETED,
        entityType: 'batch',
        entityId: batchRef.id,
        title: bData.template_type ? `Batch (${bData.template_type})` : `Batch ${batchRef.id}`,
        status: isFailed ? 'failed' : 'success',
        metadata: {
          total: bData.totalDocuments,
          completed: bData.completed,
          failed: bData.failed
        }
      });
    } else {
      // update pending and estimated time
      const pendingCount = bData.totalDocuments - (bData.completed + bData.failed + bData.processing);
      await batchRef.update({
        pending: Math.max(0, pendingCount),
        estimatedRemainingSeconds: Math.max(0, pendingCount * 15)
      });
    }
  }
}
