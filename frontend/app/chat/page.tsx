"use client";

import { useState, useEffect, useRef } from "react";
import { useRepo } from "@/context/RepoContext";
import { apiService, ChatSession, ChatMessage } from "@/services/api";
import {
  MessageSquare, Plus, Send, Terminal, Database,
  RefreshCw, FileText, Sparkles, User, Bot, Code2
} from "lucide-react";

export default function RepositoryChat() {
  const { selectedRepo } = useRepo();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queryText, setQueryText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [activeCitations, setActiveCitations] = useState<string[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamedText]);

  const loadSessions = async (repoId: number) => {
    try {
      const data = await apiService.getChatSessions(repoId);
      setSessions(data);
      if (data.length > 0 && !activeSession) setActiveSession(data[0]);
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  };

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
      const title = `Session: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      const newSession = await apiService.createChatSession(selectedRepo.id, title);
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
    } catch {
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

    await apiService.streamChatQuery(
      messagePayload,
      activeSession.id,
      (textChunk) => { setStreamedText(prev => prev + textChunk); },
      (citations) => { setActiveCitations(citations); },
      async () => {
        setIsStreaming(false);
        setStreamedText("");
        setActiveCitations([]);
        await loadMessages(activeSession.id);
      },
      () => {
        setIsStreaming(false);
        alert("Chat error. Check if Ollama service is active.");
      }
    );
  };

  const suggestedPrompts = [
    "Explain the overall project architecture",
    "How is the database integration implemented?",
    "What are the core endpoints in the API routing?",
  ];

  return (
    <div className="min-h-screen bg-transparent text-white relative">
      {/* Local Background Ambient glows */}
      <div className="absolute top-[15%] right-[5%] w-[400px] h-[400px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-white/[0.05] bg-black/10 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight">
                AI Chat
              </h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Semantic Code Explorer</p>
            </div>
          </div>
          {selectedRepo && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{selectedRepo.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-5 relative z-10">
        {!selectedRepo ? (
          <div className="glossy-card p-8 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-14 h-14 bg-zinc-950/50 rounded-2xl flex items-center justify-center mb-1 border border-white/[0.05] shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
              <MessageSquare className="w-7 h-7 text-zinc-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight font-display">Chat Offline</h3>
              <p className="text-zinc-400 max-w-md leading-relaxed text-xs">
                Select an active repository from the Dashboard to trigger semantic RAG indexing and start chat exploration.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Session Sidebar */}
            <div className="lg:col-span-1 glossy-card">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-xs tracking-tight text-white font-display">Sessions</span>
                </div>
                <button 
                  onClick={handleCreateSession} 
                  disabled={isCreatingSession}
                  className="p-1 hover:bg-white/5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" />
                </button>
              </div>

              <div className="p-1.5 max-h-[600px] overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500">
                    <MessageSquare className="w-5 h-5 mx-auto mb-1.5 opacity-50 text-zinc-600" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">No chat history</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sessions.map((sess) => {
                      const isActive = activeSession?.id === sess.id;
                      return (
                        <button 
                          key={sess.id} 
                          onClick={() => setActiveSession(sess)}
                          className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 rounded-lg truncate border ${
                            isActive
                              ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-white shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]"
                              : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
                          }`}
                        >
                          {sess.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Main Area */}
            <div className="lg:col-span-3 glossy-card flex flex-col">
              {/* Chat Header */}
              <div className="px-4.5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-black/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight font-display">DocDoctor AI</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">RAG Context Engine</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 min-h-[500px] max-h-[600px] overflow-y-auto p-4.5">
                {!activeSession ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-14 h-14 bg-zinc-950/50 rounded-2xl flex items-center justify-center border border-white/[0.05] shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
                      <MessageSquare className="w-7 h-7 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">
                      Create a new session from the sidebar to begin exploring.
                    </p>
                  </div>
                ) : isLoadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Syncing thread...</span>
                  </div>
                ) : messages.length === 0 && !isStreaming ? (
                  <div className="h-full flex flex-col items-center justify-center gap-8 py-8">
                    <div className="flex flex-col items-center gap-3.5 text-center">
                      <div className="w-16 h-16 bg-zinc-950/50 rounded-2xl flex items-center justify-center border border-white/[0.05] shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
                        <Terminal className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h5 className="text-xl font-bold text-white tracking-tight">Semantic Code Explorer</h5>
                      <p className="text-zinc-400 leading-relaxed max-w-lg text-xs">
                        Ask technical syntax questions. Answers are compiled via semantic embeddings cross-referenced with your codebase index.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-xl">
                      {suggestedPrompts.map((prompt, i) => (
                        <button 
                          key={i} 
                          onClick={() => setQueryText(prompt)}
                          className="bg-black/35 border border-white/[0.06] hover:border-emerald-500/25 rounded-xl px-4 py-2.5 text-xs text-zinc-300 text-left flex items-center gap-3 transition-all duration-300 hover:bg-black/45 hover:text-white shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]"
                        >
                          <span className="text-emerald-500 font-mono font-bold">&gt;_</span>
                          <span className="flex-1 font-semibold">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4.5">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user";
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`w-7 h-7 shrink-0 rounded-xl flex items-center justify-center border ${
                            isUser
                              ? "bg-white/[0.03] border-white/[0.06]"
                              : "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500/10 shadow-md shadow-emerald-500/10"
                          }`}>
                            {isUser ? <User className="w-3.5 h-3.5 text-zinc-400" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                          </div>

                          <div className={`flex-1 flex flex-col gap-1.5 max-w-2xl ${isUser ? "items-end" : ""}`}>
                            <div className={`text-xs leading-relaxed whitespace-pre-wrap break-words px-3.5 py-2.5 rounded-xl border ${
                              isUser
                                ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-white shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]"
                                : "bg-black/40 border border-white/[0.05] text-zinc-200 shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]"
                            }`}>
                              {msg.content}
                            </div>

                            {!isUser && msg.citations && msg.citations.length > 0 && (
                              <div className="flex flex-col gap-1.5 mt-0.5">
                                <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-bold tracking-widest uppercase">
                                  <Code2 className="w-3 h-3 text-emerald-500" /> Reference Context Nodes
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {msg.citations.map((c, i) => (
                                    <span 
                                      key={i} 
                                      className="text-[9px] font-mono text-zinc-300 bg-black/40 border border-white/[0.06] hover:border-emerald-500/25 px-2 py-1 rounded-md flex items-center gap-1 transition-all shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]"
                                    >
                                      <FileText className="w-2.5 h-2.5 text-emerald-500" /> 
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

                    {isStreaming && streamedText && (
                      <div className="flex gap-3.5 flex-row">
                        <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center border border-emerald-500/10 shadow-md shadow-emerald-500/10">
                          <Bot className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <div className="flex-1 flex flex-col gap-2.5 max-w-2xl">
                          <div className="text-xs leading-relaxed whitespace-pre-wrap break-words bg-black/40 border border-white/[0.05] text-zinc-200 px-4 py-3 rounded-xl shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]">
                            {streamedText}
                            <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-1.5 animate-pulse" />
                          </div>
                          {activeCitations.length > 0 && (
                            <div className="flex flex-col gap-2 opacity-60 mt-1">
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" /> Querying code vectors...
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {activeCitations.map((c, i) => (
                                  <span 
                                    key={i} 
                                    className="text-[10px] font-mono text-zinc-500 bg-black/40 border border-white/[0.06] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
                                  >
                                    <FileText className="w-3 h-3 text-emerald-500/50" /> 
                                    {c.split("/").pop()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Bar */}
              {activeSession && (
                <div className="p-3.5 border-t border-white/[0.06] bg-black/10">
                  <form onSubmit={handleSendQuery} className="flex gap-2.5 items-center">
                    <input
                      type="text"
                      placeholder="Ask AI about codebase logic, structures, or flows..."
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      disabled={isStreaming}
                      className="flex-1 px-3.5 py-2 glossy-input rounded-xl text-xs"
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={!queryText.trim() || isStreaming}
                      className="px-3.5 py-2 glossy-btn-primary rounded-xl text-xs"
                    >
                      {isStreaming ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
