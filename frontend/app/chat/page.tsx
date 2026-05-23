"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRepo } from "@/context/RepoContext";
import { apiService, ChatSession, ChatMessage } from "@/services/api";
import { 
  MessageSquare, Plus, Send, Terminal, Database, 
  Code, RefreshCw, AlertCircle, FileText, ExternalLink
} from "lucide-react";

export default function RepositoryChat() {
  const { selectedRepo } = useRepo();
  
  // Chat Sessions states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Chat message thread states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queryText, setQueryText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [activeCitations, setActiveCitations] = useState<string[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText]);

  // Load chat sessions for active repo
  const loadSessions = async (repoId: number) => {
    try {
      const data = await apiService.getChatSessions(repoId);
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        setActiveSession(data[0]);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  };

  // Load messages for active session
  const loadMessages = async (sessionId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await apiService.getChatMessages(sessionId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      loadSessions(selectedRepo.id);
    } else {
      setSessions([]);
      setActiveSession(null);
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    } else {
      setMessages([]);
    }
  }, [activeSession]);

  const handleCreateSession = async () => {
    if (!selectedRepo) return;
    setIsCreatingSession(true);
    try {
      const title = `Session: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newSession = await apiService.createChatSession(selectedRepo.id, title);
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
    } catch (err) {
      alert("Failed to create chat session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || !activeSession || isStreaming) return;

    const messagePayload = queryText.trim();
    setQueryText("");
    
    // 1. Instantly append user message to local thread for quick feedback
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSession.id,
      role: "user",
      content: messagePayload,
      citations: [],
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamedText("");
    setActiveCitations([]);

    // 2. Trigger stream request
    await apiService.streamChatQuery(
      messagePayload,
      activeSession.id,
      // onChunk
      (textChunk) => {
        setStreamedText(prev => prev + textChunk);
      },
      // onCitations
      (citations) => {
        setActiveCitations(citations);
      },
      // onComplete
      async () => {
        setIsStreaming(false);
        setStreamedText("");
        setActiveCitations([]);
        // Fetch official complete messages history from DB to replace local temp messages
        await loadMessages(activeSession.id);
      },
      // onError
      (err) => {
        setIsStreaming(false);
        alert("Ollama chat completion error. Please check if service is active.");
      }
    );
  };

  return (
    <div className="flex-1 flex gap-6 max-w-6xl w-full mx-auto h-[calc(100vh-100px)] overflow-hidden rounded-none bg-[#000000]">
      
      {!selectedRepo ? (
        /* Not Connected State */
        <div className="flex-1 p-8 border border-white/[0.04] bg-[#09090b] flex flex-col items-center justify-center text-center gap-5 self-center max-w-xl mx-auto py-20 rounded-none shadow-sm">
          <div className="w-10 h-10 border border-white/[0.08] bg-transparent flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-white font-mono">[CHAT_OFFLINE]</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed font-medium">
              Please select an active repository from the Sidebar or connect a new codebase on the Dashboard to access living documents.
            </p>
          </div>
        </div>
      ) : (
        /* Dual Panel Interface */
        <>
          {/* Left Session Column (w-64) */}
          <div className="w-64 border border-white/[0.04] bg-[#09090b] p-4 flex flex-col gap-4 shadow-sm shrink-0 rounded-none">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[8px] uppercase font-black text-zinc-500 tracking-widest">Conversations</span>
              <button
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="p-1 border border-white/[0.06] hover:bg-white/[0.02] text-zinc-300 transition-colors cursor-pointer rounded-none"
                title="New Chat Session"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-[10px] text-zinc-500 font-mono">
                  [NO_SESSIONS]<br/>TAP '+' TO START
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = activeSession?.id === sess.id;
                  return (
                    <button
                      key={sess.id}
                      onClick={() => setActiveSession(sess)}
                      className={`w-full text-left px-3 py-2.5 border-l text-[9px] font-black uppercase tracking-widest transition-all duration-150 cursor-pointer truncate rounded-none ${
                        isActive
                          ? "bg-white/[0.01] border-amber-500 text-white"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {sess.title.toUpperCase()}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Core Message Columns */}
          <div className="flex-1 flex flex-col border border-white/[0.04] bg-[#09090b] rounded-none overflow-hidden relative">
            <div className="absolute right-0 top-0 w-24 h-24 bg-radial-gradient from-amber-500/5 to-transparent pointer-events-none" />

            {/* Header info */}
            <div className="p-5 border-b border-white/[0.03] bg-black/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-amber-500/15 bg-amber-500/5 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">DocDoctor Assistant</h4>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-black mt-0.5 font-mono">
                    OLLAMA_RAG_COMPILING
                  </p>
                </div>
              </div>
              <span className="text-[9px] text-zinc-500 bg-white/[0.01] border border-white/[0.04] px-2 py-0.5 rounded-none font-mono">
                CTX: <span className="font-semibold text-zinc-300">{selectedRepo.name.toUpperCase()}</span>
              </span>
            </div>

            {/* Message Thread pane */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {!activeSession ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                  <MessageSquare className="w-6 h-6 text-zinc-700 animate-pulse" />
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                    CREATE A CONVERSATION TO BEGIN CHATTING
                  </p>
                </div>
              ) : isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">LOAD_HIST_IN_PROGRESS</span>
                </div>
              ) : messages.length === 0 && !isStreaming ? (
                /* Greeting / Prompt ideas */
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-md mx-auto py-10">
                  <div className="w-10 h-10 border border-white/[0.08] bg-transparent flex items-center justify-center text-amber-400">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h5 className="text-xs font-black uppercase tracking-widest text-white">Ask your Codebase Anything!</h5>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                      DocDoctor reads vector search embeds from ChromaDB to answer with high semantic accuracy.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full text-left font-mono">
                    <button 
                      onClick={() => setQueryText("Explain the overall project architecture")}
                      className="px-4 py-3 border border-white/[0.04] bg-[#000000]/50 hover:bg-[#000000]/90 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                    >
                      &gt;_ Explain the overall project architecture
                    </button>
                    <button 
                      onClick={() => setQueryText("How is the git checkout/pull service implemented?")}
                      className="px-4 py-3 border border-white/[0.04] bg-[#000000]/50 hover:bg-[#000000]/90 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                    >
                      &gt;_ How is the git checkout/pull service implemented?
                    </button>
                    <button 
                      onClick={() => setQueryText("What files were modified in the latest webhook push?")}
                      className="px-4 py-3 border border-white/[0.04] bg-[#000000]/50 hover:bg-[#000000]/90 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                    >
                      &gt;_ What files were modified in the latest webhook push?
                    </button>
                  </div>
                </div>
              ) : (
                /* Chat bubbles rendering */
                <>
                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex gap-4 w-full ${isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 border shrink-0 flex items-center justify-center font-bold text-[9px] font-mono rounded-none ${
                          isUser 
                            ? "border-white/[0.08] bg-[#000000] text-zinc-400" 
                            : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                        }`}>
                          {isUser ? "DEV" : "AI"}
                        </div>

                        {/* Content Pane */}
                        <div className="flex-1 flex flex-col gap-2.5 max-w-2xl py-1 text-[11px] leading-relaxed text-zinc-200">
                          <div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>

                          {/* Citations Panel */}
                          {!isUser && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-white/[0.03] flex flex-col gap-1.5">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                <Code className="w-2.5 h-2.5 text-amber-500" /> CITED SOURCE FILES:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.citations.map((c, i) => (
                                  <span 
                                    key={i} 
                                    className="px-2 py-0.5 border border-white/[0.04] bg-white/[0.01] hover:border-amber-500/20 text-zinc-500 hover:text-zinc-300 text-[9px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer rounded-none"
                                  >
                                    <FileText className="w-3 h-3 text-zinc-600" />
                                    {c.split("/").pop()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Streaming Assistant message block */}
                  {isStreaming && streamedText && (
                    <div className="flex gap-4 w-full flex-row">
                      <div className="w-8 h-8 border border-amber-500/20 bg-amber-500/5 text-amber-400 shrink-0 flex items-center justify-center font-bold text-[9px] font-mono rounded-none">
                        AI
                      </div>
                      <div className="flex-1 py-1 text-[11px] leading-relaxed text-zinc-200 flex flex-col gap-2 max-w-2xl">
                        <div className="whitespace-pre-wrap font-sans break-words">{streamedText}</div>

                        {activeCitations.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-white/[0.03] flex flex-col gap-1.5 animate-pulse">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                              <Code className="w-2.5 h-2.5 text-amber-500" /> SEARCHING SOURCES...
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeCitations.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 border border-white/[0.04] bg-white/[0.01] text-zinc-600 text-[9px] font-mono flex items-center gap-1.5 rounded-none">
                                  <FileText className="w-3 h-3 text-zinc-600" />
                                  {c.split("/").pop()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empty space for scroll anchor */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Submission Footer Form */}
            {activeSession && (
              <form 
                onSubmit={handleSendQuery} 
                className="p-5 border-t border-white/[0.03] bg-black/10 flex gap-3 items-center relative"
              >
                <input
                  type="text"
                  placeholder="Ask a question about codebase structures, methods, configurations..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  disabled={isStreaming}
                  className="flex-1 bg-[#000000] border border-white/[0.05] focus:border-amber-500 text-xs rounded-none px-4 py-3 outline-none transition-all placeholder:text-zinc-700 font-mono disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={!queryText.trim() || isStreaming}
                  className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-5 py-3 hover:bg-black hover:text-white border border-white transition-all duration-120 cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50 rounded-none"
                >
                  {isStreaming ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            )}

          </div>
        </>
      )}
    </div>
  );
}
