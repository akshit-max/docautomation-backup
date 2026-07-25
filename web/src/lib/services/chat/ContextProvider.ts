import { adminDb } from '@/lib/firebase-admin';

export class ContextProvider {
  /**
   * Loads document context, structuring it for optimal LLM consumption.
   * Priority: Structured Data -> Raw OCR
   */
  static async getDocumentContext(docId: string): Promise<string> {
    const docRef = adminDb.collection('documents').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error(`Document ${docId} not found`);
    }

    const data = docSnap.data()!;
    const structuredContent = data.content ? JSON.stringify(data.content, null, 2) : 'No structured data available';
    const rawOcr = data.raw_input || 'No OCR text available';

    // This format matches the user's architectural recommendation for optimal AI answering
    return `
You are answering questions about the following document.

Structured Data:
${structuredContent}

Original OCR Text:
${rawOcr}
`.trim();
  }
}
