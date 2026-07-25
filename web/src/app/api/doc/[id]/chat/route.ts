import { NextResponse } from 'next/server';
import { ChatService } from '@/lib/services/chat/ChatService';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const body = await request.json();
    const { message, history = [], sessionId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Call ChatService to get the raw OpenRouter SSE stream
    const stream = await ChatService.chat(docId, message, history);

    if (!stream) {
      return NextResponse.json({ error: 'Failed to generate chat response' }, { status: 500 });
    }

    // Background save removed. The frontend will hit POST /chat/message with the complete
    // aggregated history after the stream finishes to ensure the AI's response is included.

    // Pipe the native stream directly back to the client!
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to chat' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const sessionRef = adminDb.collection('documents').doc(docId).collection('chatSessions').doc(sessionId);
    const historyDoc = await sessionRef.collection('messages').doc('history').get();

    if (!historyDoc.exists) {
      return NextResponse.json({ messages: [] });
    }

    const data = historyDoc.data();
    return NextResponse.json({ messages: data?.messages || [] });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}
