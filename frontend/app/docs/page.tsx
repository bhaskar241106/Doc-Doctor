"use client";

import React, { useState, useEffect } from "react";
import { useRepo } from "@/context/RepoContext";
import { apiService, Document } from "@/services/api";
import { 
  BookOpen, Terminal, Code, Award, Copy, Check, Download, 
  HelpCircle, RefreshCw, Layers, ShieldAlert, GitCommit, Server
} from "lucide-react";

// Robust high-fidelity custom markdown-to-HTML parser function
function renderMarkdown(markdown: string): string {
  if (!markdown) return "<p class='text-zinc-500 italic'>No documentation content loaded.</p>";
  
  let html = markdown;

  // Escape HTML entities to prevent XSS
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```lang ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/gm, (match, lang, code) => {
    return `<pre class="language-${lang}"><code class="block font-mono text-zinc-300 text-xs">${code.trim()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, "<code class='text-amber-400 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono text-xs'>$1</code>");

  // GitHub alert/blockquotes: [!NOTE] [!TIP] [!IMPORTANT]
  html = html.replace(/^&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)(?=\n\n|\n[^\s&gt;]|$)/gm, (match, type, content) => {
    const colors: Record<string, string> = {
      NOTE: "border-amber-500 bg-amber-500/5 text-amber-300",
      TIP: "border-emerald-500 bg-emerald-500/5 text-emerald-300",
      IMPORTANT: "border-rose-500 bg-rose-500/5 text-rose-300",
      WARNING: "border-orange-500 bg-orange-500/5 text-orange-300",
      CAUTION: "border-red-500 bg-red-500/5 text-red-300"
    };
    const c = colors[type] || "border-zinc-500 bg-zinc-500/5 text-zinc-300";
    return `<div class="border-l-4 p-4 my-4 rounded-r-xl ${c}"><strong class="text-xs uppercase tracking-wider block mb-1">${type}</strong>${content.replace(/^&gt;\s*/gm, "").trim()}</div>`;
  });

  // Standard blockquotes: > quote
  html = html.replace(/^&gt;\s+(.*)$/gm, "<blockquote class='border-l-4 border-amber-500 pl-4 py-2 bg-amber-500/5 my-4 rounded-r-xl text-amber-300 italic'>$1</blockquote>");

  // Headers: # H1, ## H2, ### H3
  html = html.replace(/^#\s+(.*)$/gm, "<h1 class='text-2xl font-bold text-white border-b border-white/[0.08] pb-2 mt-8 mb-4'>$1</h1>");
  html = html.replace(/^##\s+(.*)$/gm, "<h2 class='text-xl font-bold text-zinc-200 mt-6 mb-3'>$1</h2>");
  html = html.replace(/^###\s+(.*)$/gm, "<h3 class='text-lg font-bold text-zinc-300 mt-4 mb-2'>$1</h3>");

  // Lists: - item or * item
  html = html.replace(/^[-*]\s+(.*)$/gm, "<li class='list-disc ml-6 my-1 text-zinc-400'>$1</li>");
  // Wrap list items in <ul> tags
  html = html.replace(/(<li.*?>[\s\S]*?<\/li>)/g, "<ul class='my-3'>$1</ul>");
  // Clean up adjacent ul tags
  html = html.replace(/<\/ul>\s*<ul class='my-3'>/g, "");

  // Bold text: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white font-bold'>$1</strong>");

  // Tables
  // Simple table parser to match tables
  html = html.replace(/^\|(.*)\|$/gm, (match, rowContent) => {
    const cells = rowContent.split("|").map((c: string) => c.trim());
    const isHeader = cells.every((c: string) => c.startsWith("---"));
    if (isHeader) return ""; // strip division row
    
    // Check if it's the first header row (simple heuristic: preceding text is not table)
    const formattedCells = cells.map((c: string) => `<td class="border border-white/[0.08] p-3 text-xs text-zinc-400">${c}</td>`).join("");
    return `<tr class="hover:bg-white/[0.01]">${formattedCells}</tr>`;
  });
  
  // Wrap rows in table
  html = html.replace(/((?:<tr>[\s\S]*?<\/tr>)+)/g, "<table class='w-full border-collapse my-6 bg-white/[0.01] rounded-xl overflow-hidden'>$1</table>");

  // Line breaks / paragraphs
  html = html.split("\n\n").map(para => {
    if (para.trim().startsWith("<h") || para.trim().startsWith("<pre") || para.trim().startsWith("<ul") || para.trim().startsWith("<table") || para.trim().startsWith("<div")) {
      return para;
    }
    // Replace standalone newlines with breaks
    return `<p class="my-3 text-sm text-zinc-400 leading-relaxed">${para.trim().replace(/\n/g, "<br/>")}</p>`;
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
    { id: "readme", label: "README.md", icon: BookOpen },
    { id: "api_docs", label: "API.md Reference", icon: Terminal },
    { id: "architecture", label: "ARCHITECTURE.md", icon: Layers },
    { id: "onboarding", label: "ONBOARDING.md", icon: Award },
    { id: "pr_summary", label: "PR/Commit Summaries", icon: GitCommit },
    { id: "deployment", label: "DEPLOYMENT.md", icon: Server },
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
        setErrorText(`Document '${type}' is not generated yet. DocDoctor is auto-generating it in the background...`);
      } else {
        setDocument(doc);
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed to load document content.");
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
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

  // Premium reactive polling for documents in pending/generating state
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
      // Immediately refetch to show generating state
      await fetchDocument(selectedRepo.id, activeTab);
    } catch (err: any) {
      alert(err.message || "Failed to trigger document regeneration");
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
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-white/[0.03] pb-6">
        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 w-max">
          Living Documentation Explorer
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-white leading-none uppercase">
          Codebase Knowledge Engine
        </h2>
        <p className="text-[11px] text-zinc-500 max-w-2xl leading-relaxed mt-1 font-medium">
          Browse dynamically updated architecture documents, reference guides, and commit summaries written by local AI models.
        </p>
      </div>

      {!selectedRepo ? (
        /* Not Connected State */
        <div className="p-8 border border-white/[0.04] bg-[#09090b] flex flex-col items-center justify-center text-center gap-5 py-20 shadow-sm">
          <div className="w-10 h-10 border border-white/[0.08] bg-transparent flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-white font-mono">[NO_ACTIVE_CODEBASE]</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed font-medium">
              Please select an active repository from the Sidebar or connect a new codebase on the Dashboard to access living documents.
            </p>
          </div>
        </div>
      ) : (
        /* Main Workspace */
        <div className="flex flex-col gap-6 w-full">
          
          {/* Custom Navigation Tab Headers */}
          <div className="flex flex-wrap border-b border-white/[0.04]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-[10px] font-black tracking-widest uppercase transition-all duration-150 cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                    isActive
                      ? "border-amber-500 text-white bg-white/[0.01]"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Document Content Box */}
          <div className="p-8 border border-white/[0.04] bg-[#09090b] flex flex-col gap-6 relative">
            <div className="absolute right-0 top-0 w-24 h-24 bg-radial-gradient from-amber-500/5 to-transparent pointer-events-none" />
            
            {isLoading ? (
              /* Skeleton Loader */
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <div className="w-6 h-6 border border-amber-500 animate-spin" />
                <p className="text-[10px] text-zinc-500 animate-pulse font-mono uppercase tracking-wider">
                  Agent parsing codebase and compiling living documentation markdown...
                </p>
              </div>
            ) : errorText ? (
              /* Not Found / Error State */
              <div className="py-16 border border-dashed border-white/[0.05] bg-[#000000]/30 text-center flex flex-col items-center gap-4">
                <div className="w-8 h-8 border border-rose-500/20 bg-rose-500/5 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex flex-col gap-1.5 max-w-md">
                  <h4 className="text-xs font-black text-white font-mono uppercase">Documentation Unavailable</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                    {errorText.includes("not generated") 
                      ? "The AI agent is currently writing documentation for this codebase in the background. Please wait a minute and tap check status!"
                      : errorText}
                  </p>
                </div>
                <button 
                  onClick={() => fetchDocument(selectedRepo.id, activeTab)} 
                  className="px-4 py-2 border border-white/[0.06] hover:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check Status
                </button>
              </div>
            ) : document && document.status === "generating" ? (
              /* Premium Generating UI */
              <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-6 h-6 border border-amber-500 animate-spin rounded-none" />
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] text-amber-500 font-mono uppercase tracking-widest animate-pulse font-black">
                    Generating {activeTab.replace('_', ' ').toUpperCase()}...
                  </p>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase mt-1 leading-normal">
                    DocDoctor is reading codebase ASTs and compiling your markdown live...
                  </p>
                </div>
              </div>
            ) : document && document.status === "failed" ? (
              /* Premium Generation Failed UI */
              <div className="py-16 border border-dashed border-rose-500/10 bg-[#000000]/30 text-center flex flex-col items-center gap-4">
                <div className="w-8 h-8 border border-rose-500/20 bg-rose-500/5 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex flex-col gap-1.5 max-w-md">
                  <h4 className="text-xs font-black text-rose-400 font-mono uppercase">
                    {activeTab.replace('_', ' ').toUpperCase()} Generation Failed
                  </h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono mt-1">
                    Error detail: {document.error_message || "Unknown LLM connection or parsing failure."}
                  </p>
                </div>
                <button 
                  onClick={handleRetryGeneration}
                  disabled={isRetrying}
                  className="px-4 py-2 border border-white/[0.06] hover:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  {isRetrying ? "Retrying..." : "Retry Document Generation"}
                </button>
              </div>
            ) : document ? (
              /* Rich Render State */
              <>
                {/* Header Actions */}
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2 font-mono uppercase">
                      <Code className="w-4 h-4 text-amber-400" />
                      {document.title.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-bold font-mono">
                      LAST SYNC: {new Date(document.updated_at).toLocaleString().toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2 border border-white/[0.06] hover:bg-white/[0.02] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      title="Copy Raw Markdown"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 border border-white/[0.06] hover:bg-white/[0.02] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      title="Export Markdown File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* HTML Render Panel */}
                <div 
                  className="markdown-body text-zinc-300 max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
                />
              </>
            ) : (
              /* Fallback default state */
              <div className="py-20 text-center text-xs text-zinc-500 flex flex-col items-center gap-2 font-mono">
                <HelpCircle className="w-5 h-5 text-zinc-700" />
                NO CONTENT FOUND.
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
