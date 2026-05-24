"use client";

import { useState, useEffect } from "react";
import { useRepo } from "@/context/RepoContext";
import { apiService, Document } from "@/services/api";
import {
  BookOpen, Terminal, Award, Copy, Check, Download,
  HelpCircle, RefreshCw, Layers, ShieldAlert, GitCommit, Server,
  FileText, Clock
} from "lucide-react";

function renderMarkdown(markdown: string): string {
  if (!markdown) return "<p class='text-slate-500 italic'>No content loaded.</p>";
  
  let html = markdown;

  // Escape HTML tags to prevent XSS
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code Blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/gm, (match, lang, code) => {
    return `<pre><code class="block font-mono text-slate-300 text-sm leading-relaxed bg-black/30 p-4 rounded-xl border border-white/10">${code.trim()}</code></pre>`;
  });

  // Inline Code
  html = html.replace(/`([^`\n]+)`/g, "<code class='bg-amber-500/10 text-amber-300 px-2 py-1 rounded-lg text-sm font-mono'>$1</code>");

  // Markdown Alerts (GitHub Style)
  html = html.replace(/^&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)(?=\n\n|\n[^\s&]|$)/gm, (match, type, content) => {
    const colors: Record<string, string> = {
      NOTE: "border-amber-500 bg-amber-500/5 text-amber-200",
      TIP: "border-emerald-500 bg-emerald-500/5 text-emerald-200",
      IMPORTANT: "border-orange-500 bg-orange-500/5 text-orange-200",
      WARNING: "border-amber-500 bg-amber-500/5 text-amber-200",
      CAUTION: "border-rose-500 bg-rose-500/5 text-rose-200"
    };
    const c = colors[type] || "border-slate-500 bg-slate-500/5 text-slate-300";
    return `<div class="border-l-4 p-4 my-5 rounded-xl ${c}"><strong class="text-xs font-bold uppercase tracking-wider block mb-2">${type}</strong><span class="text-sm leading-relaxed">${content.replace(/^&gt;\s*/gm, "").trim()}</span></div>`;
  });

  // Blockquotes
  html = html.replace(/^&gt;\s+(.*)$/gm, "<blockquote class='border-l-4 border-amber-500/30 pl-4 py-2 my-4 text-slate-400 italic'>$1</blockquote>");

  // Headers
  html = html.replace(/^#\s+(.*)$/gm, "<h1 class='text-3xl font-bold text-white mt-8 mb-4'>$1</h1>");
  html = html.replace(/^##\s+(.*)$/gm, "<h2 class='text-2xl font-bold text-white mt-6 mb-3'>$1</h2>");
  html = html.replace(/^###\s+(.*)$/gm, "<h3 class='text-xl font-semibold text-white mt-5 mb-2'>$1</h3>");
  html = html.replace(/^####\s+(.*)$/gm, "<h4 class='text-lg font-semibold text-slate-200 mt-4 mb-2'>$1</h4>");

  // Lists
  html = html.replace(/^[-*]\s+(.*)$/gm, "<li class='text-slate-300 mb-2'>$1</li>");
  html = html.replace(/(<li.*?>[\s\S]*?<\/li>)/g, "<ul class='list-disc list-inside space-y-2 my-4 text-slate-300'>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Bold / Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em class='text-slate-300 italic'>$1</em>");

  // Tables
  html = html.replace(/^\|(.*)?\|$/gm, (match, rowContent) => {
    const cells = rowContent.split("|").map((c: string) => c.trim());
    const isHeader = cells.every((c: string) => c.startsWith("---"));
    if (isHeader) return "";
    const formattedCells = cells.map((c: string) => `<td class='px-4 py-2 border border-white/10'>${c}</td>`).join("");
    return `<tr>${formattedCells}</tr>`;
  });
  html = html.replace(/((?:<tr>[\s\S]*?<\/tr>)+)/g, "<table class='w-full my-6 bg-black/20 border border-white/10 rounded-xl overflow-hidden'>$1</table>");

  // Paragraph blocks
  html = html.split("\n\n").map(para => {
    if (para.trim().startsWith("<h") || para.trim().startsWith("<pre") || para.trim().startsWith("<ul") || para.trim().startsWith("<table") || para.trim().startsWith("<div") || para.trim().startsWith("<blockquote")) {
      return para;
    }
    return `<p class='text-slate-300 leading-relaxed my-4'>${para.trim().replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return html;
}

export default function DocumentsExplorer() {
  const { selectedRepo } = useRepo();
  const [activeTab, setActiveTab] = useState<string>("readme");
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const tabs = [
    { id: "readme", label: "README", icon: BookOpen },
    { id: "api_docs", label: "API REF", icon: Terminal },
    { id: "architecture", label: "ARCHITECTURE", icon: Layers },
    { id: "onboarding", label: "ONBOARDING", icon: Award },
    { id: "pr_summary", label: "PR SUMMARY", icon: GitCommit },
    { id: "deployment", label: "DEPLOYMENT", icon: Server },
  ];

  const fetchDocument = async (repoId: number, type: string, isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setDocument(null);
    }
    setErrorText("");
    try {
      const doc = await apiService.getDocumentByType(repoId, type);
      if (!doc) {
        setErrorText(`Document '${type}' is not generated yet. Auto-generating in background...`);
      } else {
        setDocument(doc);
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed to load document.");
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchDocument(selectedRepo.id, activeTab);
    } else {
      setDocument(null);
      setErrorText("");
    }
  }, [selectedRepo, activeTab]);

  useEffect(() => {
    if (!selectedRepo || !document || document.status !== "generating") return;
    const interval = setInterval(() => {
      fetchDocument(selectedRepo.id, activeTab, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedRepo, activeTab, document]);

  const handleRetryGeneration = async () => {
    if (!selectedRepo) return;
    setIsRetrying(true);
    try {
      await apiService.regenerateDocument(selectedRepo.id, activeTab);
      await fetchDocument(selectedRepo.id, activeTab);
    } catch (err: any) {
      alert(err.message || "Failed to trigger regeneration");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopy = () => {
    if (!document) return;
    navigator.clipboard.writeText(document.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!document) return;
    const blob = new Blob([document.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${activeTab === "readme" ? "README" : activeTab.toUpperCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Documentation
              </h1>
              <p className="text-xs text-slate-400">AI-Generated Knowledge</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Knowledge Engine
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl">
            AI-compiled architecture maps, reference guides, onboarding documents, and deployments — auto-synced.
          </p>
        </div>

        {!selectedRepo ? (
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl p-16 shadow-2xl flex flex-col items-center justify-center text-center gap-8">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
              <BookOpen className="w-10 h-10 text-slate-500" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-bold text-white">No Repository Selected</h3>
              <p className="text-slate-400 max-w-md leading-relaxed">
                Select an ingested codebase from the Sidebar or connect a new repository to enable the Living Knowledge Engine.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Tab Bar */}
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 text-xs font-semibold uppercase transition-all duration-300 flex items-center gap-2 rounded-xl ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
                <div className="flex-1" />
                <button
                  onClick={() => selectedRepo && fetchDocument(selectedRepo.id, activeTab)}
                  disabled={isLoading}
                  className="px-4 py-3 text-xs font-semibold uppercase transition-all duration-300 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl disabled:opacity-30"
                  title="Reload Document"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  Reload
                </button>
              </div>
            </div>

            {/* Document Panel */}
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-h-[600px] flex flex-col relative overflow-hidden">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-32">
                  <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                  <p className="text-sm text-slate-400 uppercase tracking-wider animate-pulse">
                    Compiling markdown...
                  </p>
                </div>
              ) : errorText ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-24 px-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                    <ShieldAlert className="w-10 h-10 text-amber-500" />
                  </div>
                  <div className="flex flex-col gap-3 text-center max-w-xl">
                    <h4 className="text-xl font-bold text-white">Compiling Documentation...</h4>
                    <p className="text-slate-400 leading-relaxed">
                      {errorText.includes("not generated")
                        ? "AI is mapping this codebase context and drafting the reference in the background. Check back in a moment."
                        : errorText}
                    </p>
                  </div>
                  <button 
                    onClick={() => fetchDocument(selectedRepo.id, activeTab)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Check Status
                  </button>
                </div>
              ) : document && document.status === "generating" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-32 px-8">
                  <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                  <div className="flex flex-col gap-3 text-center">
                    <p className="text-lg font-bold text-amber-500 uppercase tracking-wider animate-pulse">
                      Synthesizing {activeTab.replace("_", " ")}...
                    </p>
                    <p className="text-sm text-slate-400">
                      Traversing codebase syntax trees and feeding RAG matrices.
                    </p>
                  </div>
                </div>
              ) : document && document.status === "failed" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-24 px-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="flex flex-col gap-3 text-center max-w-xl">
                    <h4 className="text-xl font-bold text-red-500">Generation Failed</h4>
                    <p className="text-slate-400 leading-relaxed">
                      {document.error_message || "Unknown LLM service connection block."}
                    </p>
                  </div>
                  <button 
                    onClick={handleRetryGeneration} 
                    disabled={isRetrying}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Retrying..." : "Retry Document Generation"}
                  </button>
                </div>
              ) : document ? (
                <div className="p-8 md:p-12 flex flex-col gap-8">
                  {/* Document Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-white/10 gap-6">
                    <div className="flex flex-col gap-2 min-w-0">
                      <span className="text-xl font-bold text-white flex items-center gap-3 truncate">
                        <FileText className="w-6 h-6 text-amber-500 shrink-0" />
                        {document.title}
                      </span>
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Last Compiled: {new Date(document.updated_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => selectedRepo && fetchDocument(selectedRepo.id, activeTab)}
                        disabled={isLoading}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105" 
                        title="Reload"
                      >
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
                      </button>
                      <button 
                        onClick={handleCopy} 
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105" 
                        title="Copy Markdown"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
                      </button>
                      <button 
                        onClick={handleDownload} 
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105" 
                        title="Download"
                      >
                        <Download className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Rendered Markdown */}
                  <div
                    className="markdown-body max-w-none break-words prose prose-invert prose-slate"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-32 text-center">
                  <HelpCircle className="w-10 h-10 text-slate-600 animate-pulse" />
                  <span className="text-sm text-slate-500 uppercase tracking-wider">No document compiled.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
