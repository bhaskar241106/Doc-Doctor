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
    <div className="flex flex-col gap-8 max-w-6xl w-full mx-auto animate-fade-in">
      
      {/* Brand Hero Welcome Banner */}
      <div className="p-8 rounded-3xl glass-panel relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.3)]">
        <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-60 h-60 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-2.5 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2.5 py-1 rounded-full w-max">
            Autonomous Synchronizer
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Repository Intelligence Hub
          </h2>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            DocDoctor continuously parses your code structure via AST, populates ChromaDB with vector embeddings, 
            and generates real-time synchronized markdown documentation.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto">
          {selectedRepo && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="glass-button w-full md:w-auto px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Ingesting..." : "Force Sync Codebase"}
            </button>
          )}
        </div>
      </div>

      {isSyncing && (
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{syncStatusText || "AI Syncing process running in the background. Content is refreshing..."}</span>
        </div>
      )}

      {/* Main Grid: Connected state or Connect Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Cols: Repo details OR empty instruction block */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {selectedRepo ? (
            <>
              {/* Repository Ingestion Info Card */}
              <div className="p-7 rounded-3xl glass-card flex flex-col gap-5 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-radial-gradient from-violet-500/5 to-transparent pointer-events-none" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2.5">
                  <Terminal className="w-4.5 h-4.5 text-violet-400" />
                  Codebase Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 text-xs">
                  <div className="p-4 rounded-2xl bg-[#05070c]/50 border border-white/[0.04]">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block mb-1">Repository Name</span>
                    <span className="text-slate-200 font-semibold text-sm">{selectedRepo.name}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#05070c]/50 border border-white/[0.04]">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block mb-1">Source URL / Local Path</span>
                    <span className="text-slate-200 font-semibold truncate block" title={selectedRepo.clone_url}>
                      {selectedRepo.clone_url}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#05070c]/50 border border-white/[0.04]">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block mb-1">Active Branch</span>
                    <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-violet-400" />
                      {selectedRepo.branch}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#05070c]/50 border border-white/[0.04]">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block mb-1">Last Synchronization</span>
                    <span className="text-slate-200 font-semibold">
                      {selectedRepo.last_sync_at 
                        ? new Date(selectedRepo.last_sync_at).toLocaleString() 
                        : "Ingestion in progress..."}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 mt-2">
                  <a href="/docs" className="flex-1 px-4.5 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] text-center text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <BookOpen className="w-4 h-4 text-violet-400" /> Explore Generated Docs
                  </a>
                  <a href="/chat" className="flex-1 px-4.5 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] text-center text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <MessageSquare className="w-4 h-4 text-indigo-400" /> Chat with Codebase
                  </a>
                </div>
              </div>

              {/* Commit Sync activity list */}
              <div className="p-7 rounded-3xl glass-card shadow-lg flex flex-col gap-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2.5">
                  <RefreshCw className="w-4.5 h-4.5 text-indigo-400" />
                  Real-time Synchronization Logs
                </h3>
                {syncHistory.length === 0 ? (
                  <div className="py-16 border border-dashed border-white/[0.06] bg-[#05070c]/30 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-slate-700 animate-spin" />
                    <p className="text-xs text-slate-500 max-w-xs font-medium">
                      Awaiting webhook pushes or git commits. Modify files in the connected folder to trigger automatic sync!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {syncHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-4.5 rounded-2xl bg-[#05070c]/40 border border-white/[0.04] hover:border-violet-500/15 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-2.5">
                            <span className="font-mono text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 rounded-md text-[10px]">
                              {item.commit_hash.slice(0, 7)}
                            </span>
                            {item.message}
                          </span>
                          <div className="flex items-center gap-3.5 text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" /> {item.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" /> {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {item.changed_files && item.changed_files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 md:justify-end max-w-xs shrink-0">
                            {item.changed_files.slice(0, 2).map((f, i) => (
                              <span key={i} className="text-[10px] bg-slate-500/5 text-slate-400 px-2 py-0.5 border border-white/[0.03] rounded-lg flex items-center gap-1 font-mono">
                                <FileCode className="w-2.5 h-2.5 text-slate-500" />
                                {f.split("/").pop()}
                              </span>
                            ))}
                            {item.changed_files.length > 2 && (
                              <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5">
                                +{item.changed_files.length - 2} more
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
            <div className="p-8 rounded-3xl glass-card flex flex-col items-center justify-center text-center gap-6 py-24 min-h-[480px] shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/10 to-indigo-600/5 border border-violet-500/15 flex items-center justify-center text-violet-400">
                <Terminal className="w-8 h-8 text-violet-400" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">No Connected Codebase</h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  To get started, please connect a GitHub Repository or import a Local Directory path using the connection console.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Connect Repository Form */}
        <div className="flex flex-col gap-6 w-full shrink-0">
          <div className="p-7 rounded-3xl glass-card shadow-lg flex flex-col gap-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2.5">
              <Plus className="w-4.5 h-4.5 text-violet-400" />
              Connection Console
            </h3>
            
            <form onSubmit={handleConnectRepo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Repository Name</label>
                <input
                  type="text"
                  placeholder="e.g. DocDoctor"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="glass-input focus:ring-1 focus:ring-violet-500/20 text-xs rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Clone URL / Local Path</label>
                <input
                  type="text"
                  placeholder="https://github.com/... or C:\my-project"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="glass-input focus:ring-1 focus:ring-violet-500/20 text-xs rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-slate-600"
                  required
                />
                <span className="text-[10px] text-slate-500 font-medium leading-relaxed px-1">
                  💡 Tip: Enter an absolute local path (e.g. `C:\my-project`) to skip downloads and ingest instantly!
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Default Branch</label>
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="glass-input focus:ring-1 focus:ring-violet-500/20 text-xs rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 text-rose-400 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting}
                className="glass-button w-full mt-3 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
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
