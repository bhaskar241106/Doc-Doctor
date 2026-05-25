"use client";

import React, { useState, useEffect } from "react";
import { useRepo } from "@/context/RepoContext";
import { apiService, CommitActivity } from "@/services/api";
import {
  GitBranch, RefreshCw, Plus, Calendar, User, FileCode,
  MessageSquare, ShieldAlert, Database,
  Clock, ChevronRight, FolderGit2, Activity, Zap, FileText
} from "lucide-react";

export default function Dashboard() {
  const { repos, selectedRepo, setSelectedRepo, refreshRepos } = useRepo();
  
  const [repoName, setRepoName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [syncHistory, setSyncHistory] = useState<CommitActivity[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("");

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
      setRepoName("");
      setCloneUrl("");
      setBranch("main");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate repository ingestion.");
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
    <div className="min-h-screen bg-transparent text-white relative">
      {/* Local Background Ambient glows */}
      <div className="absolute top-[15%] right-[5%] w-[400px] h-[400px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-white/[0.05] bg-black/10 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div>

              <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight">
                Doc DOCTOR
              </h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">AI Knowledge Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border rounded-full glow-active">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Live Sync Active</span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105">
              <Activity className="w-4.5 h-4.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-5 relative z-10">
        {/* Hero Section */}
        <div className="mb-5">
          <h2 className="text-3xl font-extrabold mb-1.5 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight font-display leading-tight">
            Repository Hub
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Manage your codebases, synchronize interactive documentation, and harness real-time AI-powered codebase intelligence.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          {/* Repository Info Card */}
          <div className="lg:col-span-2 glossy-card glossy-sweep p-5">
            {selectedRepo ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Database className="w-4.5 h-4.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Repository
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-display">{selectedRepo.name}</h3>
                    <div className="flex items-center gap-3.5 text-xs mt-2">
                      <div className="flex items-center gap-1 text-zinc-300">
                        <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-white font-semibold">{selectedRepo.branch}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Last sync:{" "}
                          <span className="text-zinc-200 font-medium">
                            {selectedRepo.last_sync_at
                              ? new Date(selectedRepo.last_sync_at).toLocaleDateString()
                              : "Pending"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* Codebase Context */}
                <div className="glossy-subcard p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <span className="text-sm">⚡</span>
                    </div>
                    <h4 className="text-xs font-bold text-white tracking-tight font-display">Codebase Context</h4>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">Git Source</span>
                      <span className="text-zinc-300 font-mono text-[10px] bg-zinc-950/60 border border-white/[0.04] px-2 py-0.5 rounded-lg truncate max-w-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]">
                        {selectedRepo.clone_url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">Local Path</span>
                      <span className="text-zinc-300 font-mono text-[10px] bg-zinc-950/60 border border-white/[0.04] px-2 py-0.5 rounded-lg truncate max-w-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]">
                        {selectedRepo.local_path || `data/repos/${selectedRepo.name.toLowerCase()}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="/docs"
                    className="group flex items-center justify-between p-3 bg-zinc-950/40 hover:bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/20 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)] animate-fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">Documentation</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </a>
                  <a
                    href="/chat"
                    className="group flex items-center justify-between p-3 bg-zinc-950/40 hover:bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/20 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)] animate-fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">AI Chat</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-14 h-14 bg-zinc-950/50 rounded-2xl flex items-center justify-center mb-3.5 border border-white/[0.05] shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
                  <Database className="w-7 h-7 text-zinc-600" />
                </div>
                <p className="text-zinc-400 text-center text-xs font-semibold mb-0.5">No repository connected</p>
                <p className="text-zinc-600 text-[11px]">Connect a codebase context to get started</p>
              </div>
            )}
          </div>

          {/* Add Repository Card */}
          <div className="glossy-card glossy-sweep p-5 bg-gradient-to-br from-emerald-500/[0.03] to-transparent border-emerald-500/15">
            <div className="mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-2.5 shadow-lg shadow-emerald-500/25">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-0.5 tracking-tight font-display">Add Repository</h3>
              <p className="text-[10px] text-zinc-400 leading-normal">Connect a new codebase context to your workspace</p>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-2.5">
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block">
                  Repository Name
                </label>
                <input
                  type="text"
                  placeholder="E.g., MyProject"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full px-3 py-2 glossy-input rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block">
                  Git URL or Local Path
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/... or /path/to/repo"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full px-3 py-2 glossy-input rounded-xl text-xs"
                  required
                />
                <p className="text-[9px] text-zinc-500 mt-1 font-medium leading-normal">Local paths load instantly without cloning</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block">
                  Default Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 glossy-input rounded-xl text-xs"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-1.5 animate-fade-in">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-300 leading-normal">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-2.5 glossy-btn-primary glossy-sweep rounded-xl text-xs"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Connect Repository
                  </>
                )}
              </button>

              {selectedRepo && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full py-2 glossy-btn-secondary rounded-xl text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Force Sync"}
                </button>
              )}
            </form>

            {/* Quick Links */}
            <div className="mt-4.5 pt-3.5 border-t border-white/[0.06]">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 px-1">Quick Navigation</p>
              <div className="space-y-0.5">
                <a
                  href="/docs"
                  className="w-full text-left px-2 py-1.5 hover:bg-white/[0.02] rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">View Document Indices</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </a>
                <a
                  href="/chat"
                  className="w-full text-left px-2 py-1.5 hover:bg-white/[0.02] rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Consult AI Assistant</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glossy-card glossy-sweep p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold tracking-tight font-display">Recent Activity Feed</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-400 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
              {syncHistory.length} Total Events
            </span>
          </div>

          {syncHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-14 h-14 bg-zinc-955/20 rounded-2xl flex items-center justify-center mb-3 border border-white/[0.05] shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
                <GitBranch className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-400 text-center text-xs font-semibold mb-0.5">No commit activity yet</p>
              <p className="text-zinc-600 text-[11px]">Trigger a codebase sync to ingest logs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {syncHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 glossy-subcard hover:bg-zinc-900/30 hover:border-white/[0.08] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3.5 mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md font-semibold">
                          {item.commit_hash.slice(0, 7)}
                        </span>
                        <span className="text-white font-semibold text-xs tracking-tight">{item.message}</span>
                      </div>
                      <div className="flex items-center gap-3.5 text-[9px] text-zinc-400">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-zinc-500" /> {item.author}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-zinc-500" />{" "}
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.changed_files && item.changed_files.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/[0.03]">
                      {item.changed_files.slice(0, 3).map((f, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 bg-white/[0.02] text-zinc-300 border border-white/[0.05] rounded-md flex items-center gap-1 hover:border-emerald-500/20 hover:text-white transition-all cursor-default"
                        >
                          <FileCode className="w-2.5 h-2.5 text-zinc-500" />
                          {f.split("/").pop()}
                        </span>
                      ))}
                      {item.changed_files.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/[0.02] text-zinc-500 border border-white/[0.05] rounded-md font-medium">
                          +{item.changed_files.length - 3} more files
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
