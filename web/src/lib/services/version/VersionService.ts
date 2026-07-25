import { adminDb } from '@/lib/firebase-admin';
import { generateContentHash } from '@/lib/hash';

export class VersionService {
  /**
   * Retrieves all versions for a document, ordered by versionNumber descending.
   */
  static async listVersions(docId: string) {
    const versionsRef = adminDb.collection('documents').doc(docId).collection('versions');
    const snapshot = await versionsRef.orderBy('versionNumber', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Retrieves a specific version snapshot.
   */
  static async getVersion(docId: string, versionId: string) {
    const versionRef = adminDb.collection('documents').doc(docId).collection('versions').doc(versionId);
    const snap = await versionRef.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  /**
   * Generates a deterministic hash of the document's essential state.
   */
  static calculateHash(docData: any) {
    const essentialState = {
      content: docData?.content || {},
      template_type: docData?.template_type,
      project_name: docData?.project_name
    };
    return generateContentHash(essentialState);
  }

  /**
   * Creates a new version snapshot.
   * Prevents duplicates if the content hasn't changed.
   * Prunes old versions (keeping max 50, and never deleting v1).
   */
  static async createVersion(docId: string, docData: any, reason: string, restoredFrom?: number) {
    const versionsRef = adminDb.collection('documents').doc(docId).collection('versions');
    
    const essentialState = {
      content: docData?.content || {},
      template_type: docData?.template_type,
      project_name: docData?.project_name
    };
    const contentHash = generateContentHash(essentialState);

    const latestSnapshot = await versionsRef.orderBy('versionNumber', 'desc').limit(1).get();
    let nextVersionNumber = 1;
    
    if (!latestSnapshot.empty) {
      const latestData = latestSnapshot.docs[0].data();
      nextVersionNumber = (latestData.versionNumber || 0) + 1;
      
      // Prevent duplicates
      if (latestData.contentHash === contentHash) {
        return { 
          skipped: true, 
          version: { id: latestSnapshot.docs[0].id, ...latestData } 
        };
      }
    }

    const newVersionData: any = {
      versionNumber: nextVersionNumber,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      reason,
      contentHash,
      documentSnapshot: essentialState
    };

    if (restoredFrom) {
      newVersionData.restoredFrom = restoredFrom;
    }

    const newVersionRef = await versionsRef.add(newVersionData);
    
    // Prune versions asynchronously
    this.pruneVersions(docId).catch(console.error);

    return { 
      skipped: false, 
      version: { id: newVersionRef.id, ...newVersionData } 
    };
  }

  /**
   * Restores a document to a specific version.
   * Safely checks for un-versioned changes before restoring.
   */
  static async restoreVersion(docId: string, versionId: string, currentDocData: any) {
    const versionsRef = adminDb.collection('documents').doc(docId).collection('versions');
    
    const targetVersionSnap = await versionsRef.doc(versionId).get();
    if (!targetVersionSnap.exists) {
      throw new Error('Target version not found');
    }
    const targetVersion = targetVersionSnap.data()!;

    // Check for un-versioned changes
    const currentHash = this.calculateHash(currentDocData);
    const latestVersionSnap = await versionsRef.orderBy('versionNumber', 'desc').limit(1).get();
    
    if (!latestVersionSnap.empty) {
      const latestData = latestVersionSnap.docs[0].data();
      if (latestData.contentHash !== currentHash) {
        // Create Pre-Restore Snapshot
        await this.createVersion(docId, currentDocData, 'Pre-Restore Snapshot');
      }
    }

    // Update main document
    const snapshot = targetVersion.documentSnapshot;
    await adminDb.collection('documents').doc(docId).update({
      content: snapshot.content,
      template_type: snapshot.template_type,
      project_name: snapshot.project_name,
      updatedAt: new Date().toISOString()
    });

    // Create the "Restored" version
    const restoredResult = await this.createVersion(
      docId, 
      { content: snapshot.content, template_type: snapshot.template_type, project_name: snapshot.project_name }, 
      'Restored', 
      targetVersion.versionNumber
    );

    return restoredResult;
  }

  /**
   * Enforces the 50-version retention policy while preserving Version 1.
   */
  static async pruneVersions(docId: string) {
    const versionsRef = adminDb.collection('documents').doc(docId).collection('versions');
    const allVersionsSnap = await versionsRef.orderBy('versionNumber', 'asc').get();
    
    if (allVersionsSnap.size > 50) {
      const versionsToDelete = allVersionsSnap.docs.filter(d => d.data().versionNumber !== 1);
      const deleteCount = allVersionsSnap.size - 50;
      
      // Delete the oldest N versions to get back to 50
      for (let i = 0; i < deleteCount; i++) {
        if (versionsToDelete[i]) {
          await versionsToDelete[i].ref.delete();
        }
      }
    }
  }
}
