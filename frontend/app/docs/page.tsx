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
  html = html.replace(/`([^`\n]+)`/g, "<code class='bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded-lg text-sm font-mono border border-emerald-500/15 shadow-[inset_0_1px_0px_rgba(255,255,255,0.01)]'>$1</code>");

  // Markdown Alerts (GitHub Style)
  html = html.replace(/^&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)(?=\n\n|\n[^\s&]|$)/gm, (match, type, content) => {
    const colors: Record<string, string> = {
      NOTE: "border-emerald-500 bg-emerald-500/5 text-emerald-200 shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]",
      TIP: "border-emerald-500 bg-emerald-500/5 text-emerald-200 shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]",
      IMPORTANT: "border-teal-500 bg-teal-500/5 text-teal-200 shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]",
      WARNING: "border-emerald-500 bg-emerald-500/5 text-emerald-200 shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]",
      CAUTION: "border-rose-500 bg-rose-500/5 text-rose-200"
    };
    const c = colors[type] || "border-slate-500 bg-slate-500/5 text-slate-300";
    return `<div class="border-l-4 p-4 my-5 rounded-xl ${c}"><strong class="text-xs font-bold uppercase tracking-wider block mb-2">${type}</strong><span class="text-sm leading-relaxed">${content.replace(/^&gt;\s*/gm, "").trim()}</span></div>`;
  });

  // Blockquotes
  html = html.replace(/^&gt;\s+(.*)$/gm, "<blockquote class='border-l-4 border-emerald-500/20 pl-4 py-2 my-4 text-zinc-400 italic'>$1</blockquote>");

  // Headers
  html = html.replace(/^#\s+(.*)$/gm, "<h1 class='text-3xl font-bold text-white mt-8 mb-4 tracking-tight'>$1</h1>");
  html = html.replace(/^##\s+(.*)$/gm, "<h2 class='text-2xl font-bold text-white mt-6 mb-3 tracking-tight'>$1</h2>");
  html = html.replace(/^###\s+(.*)$/gm, "<h3 class='text-xl font-semibold text-white mt-5 mb-2 tracking-tight'>$1</h3>");
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
    <div className="min-h-screen bg-transparent text-white relative">
      {/* Local Background Ambient glows */}
      <div className="absolute top-[15%] right-[5%] w-[400px] h-[400px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-white/[0.05] bg-black/10 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight">
                Documentation
              </h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">AI-Generated Knowledge</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-5 relative z-10">
        {/* Hero Section */}
        <div className="mb-5">
          <h2 className="text-3xl font-extrabold mb-1.5 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight font-display leading-tight">
            Knowledge Engine
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            AI-compiled architecture maps, reference guides, onboarding documents, and deployments — auto-synced.
          </p>
        </div>

        {!selectedRepo ? (
          <div className="glossy-card p-8 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-14 h-14 bg-zinc-950/50 rounded-2xl flex items-center justify-center mb-1 border border-white/[0.05] shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
              <BookOpen className="w-7 h-7 text-zinc-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight font-display">No Repository Selected</h3>
              <p className="text-zinc-400 max-w-md leading-relaxed text-xs">
                Select an ingested codebase from the Sidebar or connect a new repository to enable the Living Knowledge Engine.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Tab Bar */}
            <div className="glossy-card p-1">
              <div className="flex flex-wrap items-center gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase transition-all duration-300 flex items-center gap-1.5 rounded-xl border shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500/10 shadow-lg shadow-emerald-500/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
                <div className="flex-1" />
                <button
                  onClick={() => selectedRepo && fetchDocument(selectedRepo.id, activeTab)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-semibold uppercase transition-all duration-300 flex items-center gap-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl disabled:opacity-30"
                  title="Reload Document"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Reload
                </button>
              </div>
            </div>

            {/* Document Panel */}
            <div className="glossy-card min-h-[600px] flex flex-col relative overflow-hidden">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-32">
                  <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-xs text-zinc-400 uppercase tracking-widest animate-pulse font-semibold">
                    Compiling markdown...
                  </p>
                </div>
              ) : errorText ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-24 px-8">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] animate-pulse">
                    <ShieldAlert className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="flex flex-col gap-3 text-center max-w-xl">
                    <h4 className="text-xl font-bold text-white tracking-tight">Compiling Documentation...</h4>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                      {errorText.includes("not generated")
                        ? "AI is mapping this codebase context and drafting the reference in the background. Check back in a moment."
                        : errorText}
                    </p>
                  </div>
                  <button 
                    onClick={() => fetchDocument(selectedRepo.id, activeTab)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl font-semibold text-xs text-zinc-300 transition-all duration-300 flex items-center gap-2 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-400" /> Check Status
                  </button>
                </div>
              ) : document && document.status === "generating" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-32 px-8">
                  <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                  <div className="flex flex-col gap-3 text-center">
                    <p className="text-base font-bold text-emerald-400 uppercase tracking-wider animate-pulse">
                      Synthesizing {activeTab.replace("_", " ")}...
                    </p>
                    <p className="text-xs text-zinc-500 font-medium">
                      Traversing codebase syntax trees and feeding RAG matrices.
                    </p>
                  </div>
                </div>
              ) : document && document.status === "failed" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-24 px-8">
                  <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="flex flex-col gap-3 text-center max-w-xl">
                    <h4 className="text-xl font-bold text-red-500 tracking-tight">Generation Failed</h4>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                      {document.error_message || "Unknown LLM service connection block."}
                    </p>
                  </div>
                  <button 
                    onClick={handleRetryGeneration} 
                    disabled={isRetrying}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-xl font-bold transition-all duration-300 hover:scale-[1.01] shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 text-sm text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Retrying..." : "Retry Document Generation"}
                  </button>
                </div>
              ) : document ? (
                <div className="p-6 md:p-8 flex flex-col gap-6">
                  {/* Document Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] gap-4">
                    <div className="flex flex-col gap-2 min-w-0">
                      <span className="text-xl font-bold text-white flex items-center gap-3 truncate tracking-tight">
                        <FileText className="w-6 h-6 text-emerald-500 shrink-0" />
                        {document.title}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4 text-emerald-400" />
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
                        <RefreshCw className={`w-5 h-5 text-zinc-400 ${isLoading ? "animate-spin" : ""}`} />
                      </button>
                      <button 
                        onClick={handleCopy} 
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105" 
                        title="Copy Markdown"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-zinc-400" />}
                      </button>
                      <button 
                        onClick={handleDownload} 
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105" 
                        title="Download"
                      >
                        <Download className="w-5 h-5 text-zinc-400" />
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
                  <HelpCircle className="w-10 h-10 text-zinc-700 animate-pulse" />
                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">No document compiled.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
