import { BatchWorkerService } from './BatchWorkerService';

export class WorkerTrigger {
  /**
   * Starts a local polling loop that drives the BatchWorkerService.
   * In a production serverless environment (like Vercel), this should be
   * replaced by a Cron job or a trigger service (like Inngest) calling 
   * an API route which invokes BatchWorkerService.processNextTask().
   */
  static startLocalDevelopmentWorker() {
    const globalAny = global as any;
    if (globalAny.__BATCH_WORKER_RUNNING) return;
    globalAny.__BATCH_WORKER_RUNNING = true;
    
    console.log('[WorkerTrigger] Started local development polling loop');
    
    const loop = async () => {
      try {
        const processed = await BatchWorkerService.processNextTask();
        // If we processed a task, check again immediately. If not, sleep for 3s.
        setTimeout(loop, processed ? 100 : 3000);
      } catch (err) {
        console.error('[WorkerTrigger] Error:', err);
        setTimeout(loop, 3000);
      }
    };
    
    setTimeout(loop, 1000);
  }
}
