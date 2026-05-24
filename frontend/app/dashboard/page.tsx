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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <FolderGit2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Doc DOCTOR
              </h1>
              <p className="text-xs text-slate-400">AI Knowledge Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">Live Sync Active</span>
            </div>
            <button className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105">
              <Activity className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Repository Hub
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl">
            Manage your code repositories, synchronize documentation, and harness AI-powered codebase intelligence
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Repository Info Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {selectedRepo ? (
              <>
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="w-6 h-6 text-amber-500" />
                      <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                        Repository
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">{selectedRepo.name}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <GitBranch className="w-4 h-4 text-emerald-400" />
                        <span className="text-white font-medium">{selectedRepo.branch}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>
                          Last sync:{" "}
                          {selectedRepo.last_sync_at
                            ? new Date(selectedRepo.last_sync_at).toLocaleDateString()
                            : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                </div>

                {/* Codebase Context */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-lg">⚡</span>
                    </div>
                    <h4 className="text-lg font-semibold">Codebase Context</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Git Source</span>
                      <span className="text-slate-300 font-mono text-xs bg-slate-800/50 px-3 py-1.5 rounded-lg truncate max-w-md">
                        {selectedRepo.clone_url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Local Path</span>
                      <span className="text-slate-300 font-mono text-xs bg-slate-800/50 px-3 py-1.5 rounded-lg truncate max-w-md">
                        {selectedRepo.local_path || `data/repos/${selectedRepo.name.toLowerCase()}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href="/docs"
                    className="group flex items-center justify-between p-4 bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-amber-400" />
                      <span className="font-medium">Documentation</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  </a>
                  <a
                    href="/chat"
                    className="group flex items-center justify-between p-4 bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-orange-400" />
                      <span className="font-medium">AI Chat</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                  <Database className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-slate-400 text-center mb-2">No repository connected</p>
                <p className="text-slate-500 text-sm">Connect a repository to get started</p>
              </div>
            )}
          </div>

          {/* Add Repository Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent backdrop-blur-xl border border-amber-500/20 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Add Repository</h3>
              <p className="text-sm text-slate-400">Connect a new repository to your workspace</p>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Repository Name
                </label>
                <input
                  type="text"
                  placeholder="E.g., MyProject"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-white placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Git URL or Path
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/... or /path/to/repo"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-white placeholder-slate-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Local paths load instantly</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-white placeholder-slate-500"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Connect Repository
                  </>
                )}
              </button>

              {selectedRepo && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Force Sync"}
                </button>
              )}
            </form>

            {/* Quick Links */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Quick Links</p>
              <div className="space-y-2">
                <a
                  href="/docs"
                  className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span className="text-sm text-slate-300">View Docs</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </a>
                <a
                  href="/chat"
                  className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span className="text-sm text-slate-300">AI Assistant</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-amber-400" />
              <h3 className="text-2xl font-bold">Recent Activity</h3>
            </div>
            <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm font-medium text-amber-400">
              {syncHistory.length} Events
            </span>
          </div>

          {syncHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                <GitBranch className="w-10 h-10 text-slate-500" />
              </div>
              <p className="text-slate-400 text-center mb-2">No commit activity yet</p>
              <p className="text-slate-500 text-sm">Trigger a sync to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {syncHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-black/20 border border-white/5 rounded-xl hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 text-xs font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-md">
                          {item.commit_hash.slice(0, 7)}
                        </span>
                        <span className="text-white font-semibold text-sm">{item.message}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {item.author}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />{" "}
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.changed_files && item.changed_files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.changed_files.slice(0, 3).map((f, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 bg-white/[0.04] text-slate-300 border border-white/[0.08] rounded-md flex items-center gap-1.5"
                        >
                          <FileCode className="w-3.5 h-3.5 text-slate-500" />
                          {f.split("/").pop()}
                        </span>
                      ))}
                      {item.changed_files.length > 3 && (
                        <span className="text-xs px-2.5 py-1 bg-white/[0.04] text-slate-400 border border-white/[0.08] rounded-md">
                          +{item.changed_files.length - 3} more
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
