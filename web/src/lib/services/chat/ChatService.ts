import { adminDb } from '@/lib/firebase-admin';
import { ContextProvider } from './ContextProvider';
import { AIService } from '../ai/AIService';

const MAX_HISTORY = 10;

const CHAT_RULES = `
Rules:
1. Only answer from the supplied document.
2. If information is absent, say so clearly.
3. Never invent values.
4. Never use outside knowledge.
5. Quote the document when appropriate (lightweight citations).
6. Prefer structured fields over OCR text if they conflict.
`;

export class ChatService {
  /**
   * Orchestrates a chat request for a specific document.
   * Returns a ReadableStream of the AI's SSE response.
   */
  static async chat(docId: string, userMessage: string, history: any[] = []): Promise<ReadableStream | null> {
    // 1. Get Context
    const context = await ContextProvider.getDocumentContext(docId);

    // 2. Build System Prompt
    const systemPrompt = `
${context}

${CHAT_RULES}
`.trim();

    // 3. Truncate History to prevent token ballooning
    const truncatedHistory = history.slice(-MAX_HISTORY).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // 4. Construct Message Array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...truncatedHistory,
      { role: 'user', content: userMessage }
    ];

    // 5. Call AI and Stream
    const stream = await AIService.streamChat(messages);
    return stream;
  }

  /**
   * Saves a chat session and its messages to Firestore
   */
  static async saveChatSession(docId: string, sessionId: string, history: any[]) {
    // Save to documents/{docId}/chatSessions/{sessionId}
    const sessionRef = adminDb.collection('documents').doc(docId).collection('chatSessions').doc(sessionId);
    await sessionRef.set({
      updatedAt: new Date().toISOString(),
      messageCount: history.length
    }, { merge: true });

    // Store messages (could be stored individually or as a single array, array is easier here)
    await sessionRef.collection('messages').doc('history').set({
      messages: history,
      savedAt: new Date().toISOString()
    });
  }
}
