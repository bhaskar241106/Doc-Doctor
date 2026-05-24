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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                AI Chat
              </h1>
              <p className="text-xs text-slate-400">Semantic Code Explorer</p>
            </div>
          </div>
          {selectedRepo && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">{selectedRepo.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {!selectedRepo ? (
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl p-16 shadow-2xl flex flex-col items-center justify-center text-center gap-8">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
              <MessageSquare className="w-10 h-10 text-slate-500" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-bold text-white">Chat Offline</h3>
              <p className="text-slate-400 max-w-md leading-relaxed">
                Select an active repository from the Dashboard to trigger semantic RAG indexing and start chat exploration.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Session Sidebar */}
            <div className="lg:col-span-1 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold">Sessions</span>
                </div>
                <button 
                  onClick={handleCreateSession} 
                  disabled={isCreatingSession}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-3 max-h-[600px] overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No chat history</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((sess) => {
                      const isActive = activeSession?.id === sess.id;
                      return (
                        <button 
                          key={sess.id} 
                          onClick={() => setActiveSession(sess)}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl truncate ${
                            isActive
                              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-white"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
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
            <div className="lg:col-span-3 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">DocDoctor AI</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <p className="text-xs text-slate-400">RAG Context Engine</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 min-h-[500px] max-h-[600px] overflow-y-auto p-8">
                {!activeSession ? (
                  <div className="h-full flex flex-col items-center justify-center gap-5 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center border border-white/10">
                      <MessageSquare className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400">
                      Create a new session to begin exploring.
                    </p>
                  </div>
                ) : isLoadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                    <span className="text-slate-400">Syncing thread...</span>
                  </div>
                ) : messages.length === 0 && !isStreaming ? (
                  <div className="h-full flex flex-col items-center justify-center gap-12">
                    <div className="flex flex-col items-center gap-5 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center border border-white/10">
                        <Terminal className="w-10 h-10 text-amber-500" />
                      </div>
                      <h5 className="text-2xl font-bold text-white">Semantic Code Explorer</h5>
                      <p className="text-slate-400 leading-relaxed max-w-xl">
                        Ask technical syntax questions. Answers are compiled via embeddings cross-referenced with your codebase index.
                      </p>
                    </div>
                    <div className="flex flex-col gap-4 w-full max-w-2xl">
                      {suggestedPrompts.map((prompt, i) => (
                        <button 
                          key={i} 
                          onClick={() => setQueryText(prompt)}
                          className="bg-black/20 border border-white/10 hover:border-amber-500/30 rounded-xl px-6 py-4 text-sm text-slate-300 text-left flex items-center gap-4 transition-all duration-300 hover:bg-black/30"
                        >
                          <span className="text-amber-500 font-mono">&gt;_</span>
                          <span className="flex-1">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user";
                      return (
                        <div key={msg.id} className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                            isUser
                              ? "bg-white/5 border border-white/10"
                              : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20"
                          }`}>
                            {isUser ? <User className="w-5 h-5 text-slate-400" /> : <Bot className="w-5 h-5 text-white" />}
                          </div>

                          <div className={`flex-1 flex flex-col gap-3 max-w-3xl ${isUser ? "items-end" : ""}`}>
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words px-6 py-4 rounded-xl ${
                              isUser
                                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-white"
                                : "bg-black/20 border border-white/10 text-slate-200"
                            }`}>
                              {msg.content}
                            </div>

                            {!isUser && msg.citations && msg.citations.length > 0 && (
                              <div className="flex flex-col gap-3">
                                <span className="text-xs text-slate-500 flex items-center gap-2">
                                  <Code2 className="w-4 h-4 text-amber-500" /> Reference Context Nodes
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {msg.citations.map((c, i) => (
                                    <span 
                                      key={i} 
                                      className="text-xs font-mono text-slate-400 bg-black/20 border border-white/10 px-3 py-2 rounded-lg flex items-center gap-2 hover:border-amber-500/30 transition-all"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-amber-500" /> 
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
                      <div className="flex gap-4 flex-row">
                        <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <Bot className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <div className="flex-1 flex flex-col gap-3 max-w-3xl">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words bg-black/20 border border-white/10 text-slate-200 px-6 py-4 rounded-xl">
                            {streamedText}
                            <span className="inline-block w-2 h-5 bg-amber-500 ml-2 animate-pulse" />
                          </div>
                          {activeCitations.length > 0 && (
                            <div className="flex flex-col gap-3 opacity-60">
                              <span className="text-xs text-slate-500 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> Querying code vectors...
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {activeCitations.map((c, i) => (
                                  <span 
                                    key={i} 
                                    className="text-xs font-mono text-slate-500 bg-black/20 border border-white/10 px-3 py-2 rounded-lg flex items-center gap-2"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-amber-500/50" /> 
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
                <div className="p-6 border-t border-white/10 bg-black/20">
                  <form onSubmit={handleSendQuery} className="flex gap-4 items-center">
                    <input
                      type="text"
                      placeholder="Ask AI about codebase logic, structures, or flows..."
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      disabled={isStreaming}
                      className="flex-1 px-6 py-4 bg-black/30 border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-white placeholder-slate-500 disabled:opacity-40"
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={!queryText.trim() || isStreaming}
                      className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-40 flex items-center gap-2"
                    >
                      {isStreaming ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
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
