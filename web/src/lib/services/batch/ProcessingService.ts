import { adminDb } from '@/lib/firebase-admin';
import { OCRService } from '@/lib/services/ocr/OCRService';
import { AIService } from '@/lib/services/ai/AIService';
import { getStorageProvider } from '@/lib/services/storage';
import { VersionService } from '@/lib/services/version/VersionService';
import { FieldValue } from 'firebase-admin/firestore';

export class ProcessingService {
  /**
   * Processes a single file from start to finish.
   * This is used by the synchronous `/upload` endpoint.
   */
  static async processSingleFile(fileBuffer: Buffer, filename: string, mimeType: string) {
    // 1. OCR
    const extractedText = await OCRService.extractText(fileBuffer, filename, mimeType);
    
    // 2. Classify
    const detectedType = await AIService.classifyDocument(extractedText);

    // 3. Storage
    let source_file = null;
    try {
      const storage = getStorageProvider();
      source_file = await storage.upload(fileBuffer, filename, mimeType);
    } catch (storageErr) {
      console.error('Storage upload failed:', storageErr);
    }

    return {
      filename,
      extracted_text: extractedText,
      detected_type: detectedType,
      char_count: extractedText.length,
      source_file
    };
  }

  /**
   * Processes a single task from a batch queue.
   */
  static async processBatchTask(batchId: string, taskId: string, task: any) {
    const batchRef = adminDb.collection('batches').doc(batchId);
    const taskRef = batchRef.collection('tasks').doc(taskId);

    const updateStatus = async (status: string) => {
      await taskRef.update({ status });
    };

    try {
      // 0. Check if batch was cancelled
      const initialBatchSnap = await batchRef.get();
      if (!initialBatchSnap.exists || initialBatchSnap.data()?.status === 'cancelled') {
        throw new Error('Batch was cancelled');
      }

      // 1. DOWNLOADING
      await updateStatus('DOWNLOADING');
      const stagingUrl = task.stagingUrl;
      const downloadRes = await fetch(stagingUrl);
      if (!downloadRes.ok) throw new Error('Failed to download from staging');
      const arrayBuffer = await downloadRes.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const mimeType = downloadRes.headers.get('content-type') || 'application/pdf';

      // 2. OCR
      await updateStatus('OCR');
      const extractedText = await OCRService.extractText(fileBuffer, task.originalFilename, mimeType);

      // 3. AI Generation
      await updateStatus('AI');
      const batchSnap = await batchRef.get();
      const batchData = batchSnap.data()!;
      let templateType = batchData.template_type;
      
      if (!templateType || templateType === 'auto') {
        templateType = await AIService.classifyDocument(extractedText);
      }
      
      const content = await AIService.generateDocumentContent(extractedText, templateType);

      // 4. SAVING
      // Verify batch isn't cancelled before creating the document
      const preSaveBatchSnap = await batchRef.get();
      if (!preSaveBatchSnap.exists || preSaveBatchSnap.data()?.status === 'cancelled') {
        throw new Error('Batch was cancelled during processing');
      }

      await updateStatus('SAVING');
      const storage = getStorageProvider();
      const source_file = await storage.upload(fileBuffer, task.originalFilename, mimeType);

      const extractedName = content.project_name || content.title || content.subject || content.for_service || content.service_name;
      const docData = {
        project_name: extractedName || 'Untitled Project',
        template_type: templateType,
        raw_input: extractedText,
        source_file,
        content,
        html_content: '',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        batchId: batchId
      };
      const newDocRef = await adminDb.collection('documents').add(docData);

      // 5. VERSIONING
      await updateStatus('VERSIONING');
      await VersionService.createVersion(newDocRef.id, docData, 'AI Generated');

      // 6. COMPLETED
      await updateStatus('COMPLETED');
      await taskRef.update({ finalDocumentId: newDocRef.id });

      // Update batch counts
      await batchRef.update({
        completed: FieldValue.increment(1),
        processing: FieldValue.increment(-1)
      });

      // Clean up staging file if possible (requires storage provider delete method)
      if (storage.delete && task.stagingPublicId) {
        try {
          await storage.delete(task.stagingPublicId);
        } catch (e) {
          console.error('Staging cleanup failed:', e);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Task ${taskId} failed:`, error);
      throw error;
    }
  }
}
