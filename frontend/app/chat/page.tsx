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
    <div className="flex-1 flex gap-6 max-w-6xl w-full mx-auto h-[calc(100vh-100px)] overflow-hidden animate-fade-in">
      
      {!selectedRepo ? (
        /* Not Connected State */
        <div className="flex-1 p-8 rounded-3xl glass-card flex flex-col items-center justify-center text-center gap-6 self-center max-w-xl mx-auto py-24 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight">AI Repository Chat Offline</h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Please select an active repository from the Sidebar or connect a new codebase on the Dashboard to access living documents.
            </p>
          </div>
        </div>
      ) : (
        /* Dual Panel Interface */
        <>
          {/* Left Session Column (w-64) */}
          <div className="w-64 glass-card rounded-3xl p-4 flex flex-col gap-4.5 shadow-lg shrink-0">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Conversations</span>
              <button
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] text-slate-300 transition-colors cursor-pointer"
                title="New Chat Session"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-[10px] text-slate-500 font-medium">
                  No previous sessions.<br/>Click '+' to start one.
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = activeSession?.id === sess.id;
                  return (
                    <button
                      key={sess.id}
                      onClick={() => setActiveSession(sess)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer truncate ${
                        isActive
                          ? "bg-violet-600/15 border border-violet-500/20 text-white"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.01] border border-transparent"
                      }`}
                    >
                      {sess.title}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Core Message Columns */}
          <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden shadow-xl relative">
            <div className="absolute right-0 top-0 w-24 h-24 bg-radial-gradient from-violet-500/5 to-transparent pointer-events-none" />

            {/* Header info */}
            <div className="p-5 border-b border-white/[0.04] bg-black/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8.5 h-8.5 rounded-xl bg-violet-600/10 border border-violet-500/15 flex items-center justify-center">
                  <Database className="w-4.5 h-4.5 text-violet-400 animate-float" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">DocDoctor Code Assistant</h4>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                    Ollama Context RAG Active
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 bg-white/[0.02] border border-white/[0.05] px-2.5 py-0.5 rounded-lg font-mono">
                Context: <span className="font-semibold text-slate-300">{selectedRepo.name}</span>
              </span>
            </div>

            {/* Message Thread pane */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {!activeSession ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                  <MessageSquare className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs text-slate-500 font-medium">
                    Create a new session to begin chatting with the codebase agent.
                  </p>
                </div>
              ) : isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 text-violet-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">Loading conversation history...</span>
                </div>
              ) : messages.length === 0 && !isStreaming ? (
                /* Greeting / Prompt ideas */
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-md mx-auto py-10">
                  <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/15 flex items-center justify-center text-violet-400">
                    <Terminal className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h5 className="text-sm font-bold text-white">Ask your Codebase Anything!</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      DocDoctor reads vector search embeds from ChromaDB to answer with high semantic accuracy.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 w-full text-left">
                    <button 
                      onClick={() => setQueryText("Explain the overall project architecture")}
                      className="px-4 py-3 rounded-xl border border-white/[0.04] bg-[#05070c]/50 hover:bg-[#05070c]/90 text-slate-400 hover:text-slate-200 text-xs font-semibold tracking-wide transition-all cursor-pointer"
                    >
                      "Explain the overall project architecture"
                    </button>
                    <button 
                      onClick={() => setQueryText("How is the git checkout/pull service implemented?")}
                      className="px-4 py-3 rounded-xl border border-white/[0.04] bg-[#05070c]/50 hover:bg-[#05070c]/90 text-slate-400 hover:text-slate-200 text-xs font-semibold tracking-wide transition-all cursor-pointer"
                    >
                      "How is the git checkout/pull service implemented?"
                    </button>
                    <button 
                      onClick={() => setQueryText("What files were modified in the latest webhook push?")}
                      className="px-4 py-3 rounded-xl border border-white/[0.04] bg-[#05070c]/50 hover:bg-[#05070c]/90 text-slate-400 hover:text-slate-200 text-xs font-semibold tracking-wide transition-all cursor-pointer"
                    >
                      "What files were modified in the latest webhook push?"
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
                        className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8.5 h-8.5 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${
                          isUser 
                            ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow shadow-indigo-500/10" 
                            : "bg-[#090d16] border border-white/[0.08] text-violet-400 font-extrabold"
                        }`}>
                          {isUser ? "U" : "AI"}
                        </div>

                        {/* Content Card */}
                        <div className={`flex flex-col gap-2.5 rounded-2xl p-4 text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#0d1321]/90 border border-white/[0.06] text-slate-200 shadow-md"
                            : "bg-[#090d16]/65 border border-white/[0.04] text-slate-300 shadow-md"
                        }`}>
                          <div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>

                          {/* Citations Panel */}
                          {!isUser && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3.5 pt-2.5 border-t border-white/[0.04] flex flex-col gap-1.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Code className="w-3 h-3 text-violet-400" /> Cited Source Files:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.citations.map((c, i) => (
                                  <span 
                                    key={i} 
                                    className="px-2.5 py-1 rounded bg-[#05070c] border border-white/[0.05] hover:border-violet-500/20 text-slate-400 hover:text-slate-200 text-[10px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
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
                    <div className="flex gap-3 max-w-[85%] self-start animate-fade-in">
                      <div className="w-8.5 h-8.5 rounded-xl bg-[#090d16] border border-white/[0.08] text-violet-400 shrink-0 flex items-center justify-center font-bold text-xs">
                        AI
                      </div>
                      <div className="bg-[#090d16]/65 border border-white/[0.04] rounded-2xl p-4 text-xs leading-relaxed text-slate-300 flex flex-col gap-2">
                        <div className="whitespace-pre-wrap font-sans break-words">{streamedText}</div>

                        {activeCitations.length > 0 && (
                          <div className="mt-3.5 pt-2.5 border-t border-white/[0.04] flex flex-col gap-1.5 animate-pulse">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Code className="w-3.5 h-3.5 text-violet-400" /> Searching sources...
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeCitations.map((c, i) => (
                                <span key={i} className="px-2.5 py-1 rounded bg-[#05070c] border border-white/[0.05] text-slate-500 text-[10px] font-mono flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-slate-500" />
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
                className="p-5 border-t border-white/[0.04] bg-black/20 flex gap-3 items-center relative"
              >
                <input
                  type="text"
                  placeholder="Ask a question about authentication, database, structure, or services..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  disabled={isStreaming}
                  className="flex-1 glass-input focus:ring-1 focus:ring-violet-500/20 text-xs rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={!queryText.trim() || isStreaming}
                  className="glass-button px-5 py-3.5 rounded-xl text-white transition-all cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  {isStreaming ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
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
