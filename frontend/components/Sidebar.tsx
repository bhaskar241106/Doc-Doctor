"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Terminal, BookOpen, MessageSquare, RefreshCw, GitBranch, 
  Trash2, Plus, Database, Activity, CheckCircle2, AlertCircle,
  Eye, EyeOff, Cpu, Globe, Save, Check, Loader2
} from "lucide-react";
import { apiService, Repository } from "@/services/api";

interface SidebarProps {
  selectedRepo: Repository | null;
  onRepoChange: (repo: Repository | null) => void;
  repos: Repository[];
  onRefreshRepos: () => void;
}

export default function Sidebar({ selectedRepo, onRepoChange, repos, onRefreshRepos }: SidebarProps) {
  const pathname = usePathname();
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // AI settings states
  const [aiProvider, setAiProvider] = useState<"local" | "online">("local");
  const [apiKey, setApiKey] = useState<string>("");
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Fetch initial system settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await apiService.getSettings();
        if (settings.ai_provider === "local" || settings.ai_provider === "online") {
          setAiProvider(settings.ai_provider);
        }
        setApiKey(settings.openai_api_key || "");
        setOfflineMode(Boolean(settings.offline_mode));
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Health check polling
  useEffect(() => {
    const check = async () => {
      const ok = await apiService.checkHealth();
      setHealthOk(ok);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [aiProvider]);

  // Handler for provider changes
  const handleProviderChange = async (provider: "local" | "online") => {
    setAiProvider(provider);
    setSaveStatus("idle");
    try {
      await apiService.updateSettings(provider, apiKey, offlineMode);
      setSaveStatus("saved");
      const ok = await apiService.checkHealth();
      setHealthOk(ok);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleOfflineModeToggle = async () => {
    const nextValue = !offlineMode;
    setOfflineMode(nextValue);
    setSaveStatus("idle");
    try {
      await apiService.updateSettings(aiProvider, apiKey, nextValue);
      setSaveStatus("saved");
      const ok = await apiService.checkHealth();
      setHealthOk(ok);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Handler for API Key saving
  const handleSaveKey = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      await apiService.updateSettings(aiProvider, apiKey, offlineMode);
      setSaveStatus("saved");
      const ok = await apiService.checkHealth();
      setHealthOk(ok);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRepo) return;
    setIsDeleting(true);
    try {
      await apiService.deleteRepository(selectedRepo.id);
      onRepoChange(null);
      onRefreshRepos();
      setShowConfirm(false);
    } catch (err) {
      alert("Failed to delete repository");
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { name: "Repository Dashboard", href: "/", icon: Activity },
    { name: "Living Documents", href: "/docs", icon: BookOpen },
    { name: "Repository AI Chat", href: "/chat", icon: MessageSquare },
  ];

  return (
    <aside className="w-80 h-screen glass-panel flex flex-col justify-between sticky top-0 shrink-0 z-40">
      <div>
        {/* Header Branding */}
        <div className="p-6 flex items-center gap-3.5 border-b border-white/[0.03]">
          <div className="w-10.5 h-10.5 rounded-xl bg-gradient-to-tr from-violet-600 via-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 relative group">
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Terminal className="w-5 h-5 text-white animate-float" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
              Doc<span className="text-violet-400 font-extrabold bg-violet-500/10 border border-violet-500/15 px-1.5 py-0.5 rounded-md text-xs">DOCTOR</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Autonomous Intelligence</p>
          </div>
        </div>

        {/* Repository selector dropdown */}
        <div className="p-5 glass-card">
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2 px-1">
            Active Workspace Codebase
          </label>
          {repos.length === 0 ? (
            <div className="px-4 py-3 rounded-2xl border border-dashed border-white/[0.06] bg-[#070a13]/50 text-center text-xs text-slate-500 font-medium">
              No codebases ingested
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="relative">
                <select
                  value={selectedRepo?.id || ""}
                  onChange={(e) => {
                    const repo = repos.find(r => r.id === parseInt(e.target.value)) || null;
                    onRepoChange(repo);
                  }}
                  className="w-full bg-[#070a13] border border-white/[0.08] hover:border-white/[0.15] text-xs text-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-violet-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="" disabled>Select active repository...</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  ▼
                </div>
              </div>

              {selectedRepo && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 mt-1 font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-400 bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded-lg">
                    <GitBranch className="w-3 h-3 text-violet-400" />
                    {selectedRepo.branch}
                  </span>
                  
                  {showConfirm ? (
                    <div className="flex items-center gap-2.5 bg-red-950/20 border border-red-500/10 px-2.5 py-0.5 rounded-lg">
                      <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                      >
                        {isDeleting ? "..." : "Confirm?"}
                      </button>
                      <button 
                        onClick={() => setShowConfirm(false)}
                        className="text-slate-400 hover:text-slate-200 font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowConfirm(true)}
                      className="text-red-500/80 hover:text-red-400 flex items-center gap-1 transition-all hover:bg-red-500/10 px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="p-5 glass-card flex flex-col gap-1.5">
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2 px-1">
            Core Modules
          </label>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 relative group ${
                  isActive 
                    ? "bg-gradient-to-r from-violet-600/15 via-violet-600/5 to-transparent border-l-2 border-violet-500 text-white shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-l-2 border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-105 ${isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* AI Engine Control Panel */}
        <div className="p-5 glass-card">
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2 px-1">
            AI Engine Control
          </label>
          
          <div className="bg-[#070a13]/60 backdrop-blur-md border border-white/[0.06] hover:border-violet-500/20 p-3.5 rounded-2xl transition-all duration-300">
            {/* Engine Selector Pill Toggle */}
            <div className="bg-black/40 p-1 rounded-xl flex border border-white/[0.04] mb-3">
              <button
                type="button"
                onClick={() => handleProviderChange("local")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                  aiProvider === "local"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 scale-100"
                    : "text-slate-400 hover:text-slate-200 bg-transparent cursor-pointer"
                }`}
              >
                <Cpu className="w-3 h-3" />
                Local
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange("online")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                  aiProvider === "online"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 scale-100"
                    : "text-slate-400 hover:text-slate-200 bg-transparent cursor-pointer"
                }`}
              >
                <Globe className="w-3 h-3" />
                Online
              </button>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 mb-3 text-[10px] text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-100 uppercase tracking-wide">Offline Ollama</p>
                  <p className="text-[9px] text-slate-500 mt-1">
                    Local Ollama models only run when offline mode is enabled.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOfflineModeToggle}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                    offlineMode
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {offlineMode ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            {/* API Key Configuration */}
            <div className={`transition-all duration-300 overflow-hidden ${
              aiProvider === "online" ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
            }`}>
              <label className="text-[8px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5 px-0.5">
                OpenAI API Key
              </label>
              <div className="relative flex items-center mb-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-[#070a13] border border-white/[0.08] text-[11px] text-slate-200 rounded-lg pl-3 pr-8 py-2 outline-none focus:border-violet-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveKey}
                disabled={isSaving}
                className="w-full bg-violet-600/90 hover:bg-violet-600 text-white rounded-lg py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all shadow-md shadow-violet-600/10 hover:shadow-violet-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : saveStatus === "saved" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                {isSaving ? "Saving..." : saveStatus === "saved" ? "Key Saved!" : "Save Cloud Key"}
              </button>
            </div>

            {/* Small subtle status text */}
            <div className="mt-2.5 flex items-center justify-between text-[8px] text-slate-500 px-0.5 font-semibold">
              <span>Status:</span>
              <span className={`uppercase tracking-wider ${
                saveStatus === "saved" 
                  ? "text-emerald-400 animate-pulse" 
                  : saveStatus === "error" 
                  ? "text-rose-400 animate-pulse" 
                  : "text-slate-400"
              }`}>
                {saveStatus === "saved" ? "Settings Saved" : saveStatus === "error" ? "Save Failed" : "Synchronized"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Panel */}
      <div className="p-5 glass-card">
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            {aiProvider === "local" ? (
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-[10px] tracking-wide uppercase font-bold text-slate-400">
              {aiProvider === "local" ? "Local Node" : "Cloud Node"}
            </span>
          </div>
          {healthOk === null ? (
            <span className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
              <RefreshCw className="w-3 h-3 animate-spin" /> SCANNING
            </span>
          ) : healthOk ? (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/5 border border-rose-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              OFFLINE
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
