"use client";

import React, { useState, useEffect } from "react";
import { useRepo } from "@/context/RepoContext";
import { apiService, CommitActivity } from "@/services/api";
import { 
  GitBranch, RefreshCw, Plus, Calendar, User, 
  FileCode, Terminal, BookOpen, MessageSquare, ShieldAlert, CheckCircle2
} from "lucide-react";

export default function Dashboard() {
  const { repos, selectedRepo, setSelectedRepo, refreshRepos } = useRepo();
  
  // Repo connection form states
  const [repoName, setRepoName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Repository details and sync logs states
  const [syncHistory, setSyncHistory] = useState<CommitActivity[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("");

  // Load commit activities for active repository
  const loadRepoActivity = async (repoId: number) => {
    try {
      const data = await apiService.getCommitActivity(repoId);
      setSyncHistory(data);
    } catch (err) {
      console.error("Failed to load activity logs", err);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      loadRepoActivity(selectedRepo.id);
      
      // Auto reload activity history periodically
      const interval = setInterval(() => loadRepoActivity(selectedRepo.id), 12000);
      return () => clearInterval(interval);
    } else {
      setSyncHistory([]);
    }
  }, [selectedRepo]);

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim() || !cloneUrl.trim()) return;

    setIsConnecting(true);
    setErrorMessage("");
    try {
      const newRepo = await apiService.createRepository(repoName.trim(), cloneUrl.trim(), branch.trim());
      await refreshRepos();
      setSelectedRepo(newRepo);
      
      // Clear form
      setRepoName("");
      setCloneUrl("");
      setBranch("main");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate repository ingestion. Please check details.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSync = async () => {
    if (!selectedRepo) return;
    setIsSyncing(true);
    setSyncStatusText("Triggering agent parser sync...");
    try {
      await apiService.syncRepository(selectedRepo.id);
      setSyncStatusText("Synchronizing files and ChromaDB vectors...");
      
      // Artificial delay to wait for backend task completion
      setTimeout(async () => {
        await refreshRepos();
        await loadRepoActivity(selectedRepo.id);
        setIsSyncing(false);
        setSyncStatusText("");
      }, 5000);
    } catch (err) {
      setIsSyncing(false);
      setSyncStatusText("");
      alert("Failed to manual sync repository");
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      
      {/* Brand Integrated Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.03] pb-6 relative">
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 w-max">
            Autonomous Synchronizer
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-white leading-none uppercase">
            Repository Intelligence Hub
          </h2>
          <p className="text-[11px] text-zinc-500 max-w-xl leading-relaxed mt-1 font-medium">
            DocDoctor continuously parses your code structure via AST, populates ChromaDB with vector embeddings, 
            and generates real-time synchronized markdown documentation.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          {selectedRepo && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="glass-button w-full md:w-auto px-4.5 py-2.5 rounded-none text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Ingesting..." : "Force Sync Codebase"}
            </button>
          )}
        </div>
      </div>

      {isSyncing && (
        <div className="p-4 border border-amber-500/15 bg-amber-500/5 text-amber-400 text-[10px] font-mono flex items-center gap-3 animate-pulse">
          <div className="w-2.5 h-2.5 border border-amber-500 animate-spin shrink-0" />
          <span>{syncStatusText || "AI Syncing process running in the background. Content is refreshing..."}</span>
        </div>
      )}

      {/* Main Grid: Connected state or Connect Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Cols: Repo details OR empty onboarding card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedRepo ? (
            <>
              {/* Repository Ingestion Info Card */}
              <div className="p-6 border border-white/[0.04] bg-[#09090b] flex flex-col gap-5 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-radial-gradient from-amber-500/5 to-transparent pointer-events-none" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Codebase Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.03] border border-white/[0.04]">
                  <div className="p-4 bg-[#09090b]">
                    <span className="text-zinc-500 font-black uppercase tracking-widest text-[8px] block mb-1">Repository Name</span>
                    <span className="text-zinc-200 font-semibold text-xs font-mono">{selectedRepo.name.toUpperCase()}</span>
                  </div>
                  <div className="p-4 bg-[#09090b]">
                    <span className="text-zinc-500 font-black uppercase tracking-widest text-[8px] block mb-1">Source URL / Local Path</span>
                    <span className="text-zinc-200 font-semibold text-xs font-mono truncate block" title={selectedRepo.clone_url}>
                      {selectedRepo.clone_url}
                    </span>
                  </div>
                  <div className="p-4 bg-[#09090b]">
                    <span className="text-zinc-500 font-black uppercase tracking-widest text-[8px] block mb-1">Active Branch</span>
                    <span className="text-zinc-200 font-semibold text-xs font-mono flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3 text-amber-400" />
                      {selectedRepo.branch.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-4 bg-[#09090b]">
                    <span className="text-zinc-500 font-black uppercase tracking-widest text-[8px] block mb-1">Last Synchronization</span>
                    <span className="text-zinc-200 font-semibold text-xs font-mono">
                      {selectedRepo.last_sync_at 
                        ? new Date(selectedRepo.last_sync_at).toLocaleString() 
                        : "Ingestion in progress..."}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 mt-1">
                  <a href="/docs" className="flex-1 px-4 py-3 border border-white/[0.06] bg-transparent hover:bg-white/[0.02] text-center text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Explore Generated Docs
                  </a>
                  <a href="/chat" className="flex-1 px-4 py-3 border border-white/[0.06] bg-transparent hover:bg-white/[0.02] text-center text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5 text-rose-400" /> Chat with Codebase
                  </a>
                </div>
              </div>

              {/* Commit Sync activity list */}
              <div className="p-6 border border-white/[0.04] bg-[#09090b] flex flex-col gap-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                  Real-time Synchronization Logs
                </h3>
                {syncHistory.length === 0 ? (
                  <div className="py-12 border border-dashed border-white/[0.05] bg-[#000000]/30 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-5 h-5 border border-zinc-700 animate-spin" />
                    <p className="text-[10px] text-zinc-500 max-w-xs font-mono leading-relaxed">
                      Awaiting commit sync. Modify files in the connected folder to trigger automatic sync!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-px bg-white/[0.03] border border-white/[0.04] max-h-[350px] overflow-y-auto pr-1">
                    {syncHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-4 bg-[#09090b] flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                            <span className="font-mono text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-none text-[9px]">
                              {item.commit_hash.slice(0, 7).toUpperCase()}
                            </span>
                            {item.message}
                          </span>
                          <div className="flex items-center gap-3 text-[9px] text-zinc-500 font-bold font-mono">
                            <span className="flex items-center gap-1 uppercase">
                              <User className="w-2.5 h-2.5 text-zinc-600" /> {item.author}
                            </span>
                            <span className="flex items-center gap-1 uppercase">
                              <Calendar className="w-2.5 h-2.5 text-zinc-600" /> {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {item.changed_files && item.changed_files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 md:justify-end max-w-xs shrink-0">
                            {item.changed_files.slice(0, 2).map((f, i) => (
                              <span key={i} className="text-[9px] bg-zinc-950 text-zinc-400 px-2 py-0.5 border border-white/[0.03] rounded-none flex items-center gap-1 font-mono">
                                <FileCode className="w-2.5 h-2.5 text-zinc-600" />
                                {f.split("/").pop()}
                              </span>
                            ))}
                            {item.changed_files.length > 2 && (
                              <span className="text-[9px] text-zinc-500 font-black font-mono px-1.5 py-0.5">
                                +{item.changed_files.length - 2} MORE
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Welcome / Onboarding Card if no active repo */
            <div className="p-6 border border-white/[0.04] bg-[#09090b] flex flex-col items-center justify-center text-center gap-5 py-16 min-h-[350px] shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient from-amber-500/2 via-transparent to-transparent pointer-events-none" />
              <div className="w-10 h-10 border border-white/[0.08] bg-transparent flex items-center justify-center text-amber-400 shadow-sm relative">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-amber-500 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-xs font-black uppercase tracking-widest text-white font-mono">[CODEBASE_OFFLINE]</h3>
                <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed font-medium">
                  Connect a repository or import a local path using the connection console on the right.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Connect Repository Form */}
        <div className="flex flex-col gap-6 w-full shrink-0">
          <div className="p-6 border border-white/[0.04] bg-[#09090b] flex flex-col gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Connection Console
            </h3>
            
            <form onSubmit={handleConnectRepo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] uppercase font-black text-zinc-500 tracking-widest">Repository Name</label>
                <input
                  type="text"
                  placeholder="e.g. DocDoctor"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full bg-[#000000] border border-white/[0.06] text-[10px] text-zinc-200 rounded-none px-3.5 py-2.5 outline-none focus:border-amber-500 transition-all font-mono placeholder:text-zinc-700"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] uppercase font-black text-zinc-500 tracking-widest">Clone URL / Local Path</label>
                <input
                  type="text"
                  placeholder="https://github.com/... or C:\my-project"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full bg-[#000000] border border-white/[0.06] text-[10px] text-zinc-200 rounded-none px-3.5 py-2.5 outline-none focus:border-amber-500 transition-all font-mono placeholder:text-zinc-700"
                  required
                />
                <span className="text-[9px] text-zinc-500 font-bold leading-relaxed px-1 font-mono">
                  &gt;_ Enter absolute folder path to skip download.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] uppercase font-black text-zinc-500 tracking-widest">Default Branch</label>
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-[#000000] border border-white/[0.06] text-[10px] text-zinc-200 rounded-none px-3.5 py-2.5 outline-none focus:border-amber-500 transition-all font-mono placeholder:text-zinc-700"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3 border border-rose-500/15 bg-rose-500/5 text-rose-400 text-[10px] font-mono flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage.toUpperCase()}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full bg-white text-black font-black uppercase tracking-widest text-[10px] py-3 hover:bg-black hover:text-white border border-white transition-all duration-120 cursor-pointer flex items-center justify-center gap-2 rounded-none"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> INGESTING CODE...
                  </>
                ) : (
                  "INGEST CODEBASE"
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

