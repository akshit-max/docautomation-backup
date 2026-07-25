"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  docId: string;
  onClose: () => void;
}

export default function ChatPanel({ docId, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate a random session ID for this chat panel instance (or load from URL/storage if persistent across sessions)
  // To keep it simple, we use a single session per mount. But to persist across refreshes we can use a stable ID or docId
  // The prompt asked for "Ensure refresh restores the conversation", meaning sessionId must be stable for the document, or loaded.
  // For MVP, we can use a deterministic ID based on docId to maintain a single thread per document per user.
  const sessionId = `${docId}_default_session`;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial history
  useEffect(() => {
    if (initialFetchDone) return;
    fetch(`/api/doc/${docId}/chat?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
        setInitialFetchDone(true);
      })
      .catch(err => {
        console.error("Failed to load history", err);
        setInitialFetchDone(true);
      });
  }, [docId, sessionId, initialFetchDone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    // Capture history BEFORE optimistically adding the new user message to state.
    // If we captured it after setMessages(), the next turn would include this message twice.
    const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // historyPayload now excludes the current user message (added below in finalHistory)

    try {
      const response = await fetch(`/api/doc/${docId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: historyPayload,
          sessionId
        })
      });

      if (!response.ok) throw new Error("Failed to connect to chat API");

      // Add empty assistant message to append chunks to
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No reader");

      let buffer = "";
      let fullAssistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              const delta = data?.choices?.[0]?.delta?.content;
              if (delta) {
                fullAssistantText += delta;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantId ? { ...msg, content: msg.content + delta } : msg
                  )
                );
              }
            } catch (err) {
              // Ignore parse errors for incomplete JSON chunks
            }
          }
        }
      }

      // Save the full conversation to Firestore.
      // finalHistory = all prior messages + the new user turn + the assistant response.
      const finalHistory = [
        ...historyPayload,
        { role: "user", content: userMessage.content },
        { role: "assistant", content: fullAssistantText }
      ];

      fetch(`/api/doc/${docId}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, history: finalHistory })
      }).catch(err => console.error("Failed to save history", err));

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>
          <Bot size={18} />
          <span>Document Chat</span>
        </div>
        <button onClick={onClose} style={s.closeBtn}>
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div style={s.messageArea}>
        {messages.length === 0 ? (
          <div style={s.emptyState}>
            <Bot size={32} color="#ccc" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 500, color: "#555" }}>Ask me anything about this document.</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#888" }}>
              Try asking &quot;What is the total amount?&quot; or &quot;Summarize the key terms.&quot;
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{ ...s.messageWrapper, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ ...s.messageBubble, background: msg.role === "user" ? "#111" : "#f1f1f1", color: msg.role === "user" ? "#fff" : "#111" }}>
                {msg.role === "assistant" && <Bot size={14} style={{ marginBottom: 4, opacity: 0.5 }} />}
                <div style={s.messageContent}>{msg.content}</div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ ...s.messageWrapper, justifyContent: "flex-start" }}>
            <div style={{ ...s.messageBubble, background: "#f1f1f1", color: "#111" }}>
              <Loader2 size={14} style={s.spin} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={s.inputArea}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={s.input}
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading} style={s.sendBtn}>
          <Send size={18} color={input.trim() && !isLoading ? "#111" : "#ccc"} />
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column",
    height: "100%", background: "#fff",
    borderLeft: "1px solid #e0e0e0",
    width: 320, minWidth: 320,
    boxShadow: "-4px 0 16px rgba(0,0,0,0.05)"
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid #e0e0e0",
    background: "#fafafa"
  },
  headerTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontWeight: 600, fontSize: 14, color: "#111"
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer", color: "#888",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 4
  },
  messageArea: {
    flex: 1, overflowY: "auto", padding: 20,
    display: "flex", flexDirection: "column", gap: 16
  },
  emptyState: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", textAlign: "center", padding: 20
  },
  messageWrapper: {
    display: "flex", width: "100%"
  },
  messageBubble: {
    maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
    fontSize: 14, lineHeight: "1.5"
  },
  messageContent: {
    whiteSpace: "pre-wrap", wordBreak: "break-word"
  },
  inputArea: {
    display: "flex", alignItems: "center", padding: "16px",
    borderTop: "1px solid #e0e0e0", background: "#fff", gap: 8
  },
  input: {
    flex: 1, padding: "10px 14px", border: "1px solid #e0e0e0",
    borderRadius: 20, fontSize: 14, outline: "none"
  },
  sendBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 8
  },
  spin: { animation: "spin 1s linear infinite" }
};
