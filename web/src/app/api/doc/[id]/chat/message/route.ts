import { NextResponse } from 'next/server';
import { ChatService } from '@/lib/services/chat/ChatService';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const body = await request.json();
    const { history, sessionId } = body;

    if (!sessionId || !history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Session ID and history array are required' }, { status: 400 });
    }

    // Save the complete history to Firestore
    await ChatService.saveChatSession(docId, sessionId, history);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to save chat message' }, { status: 500 });
  }
}
