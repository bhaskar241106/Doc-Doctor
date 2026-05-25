"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Terminal, BookOpen, MessageSquare, RefreshCw, GitBranch,
  Trash2, Plus, Cpu, Globe, Save, Check, Loader2, Eye, EyeOff,
  LayoutDashboard, ChevronRight, Wifi, WifiOff, Zap
} from "lucide-react";
import { apiService, Repository, HealthResponse } from "@/services/api";

interface SidebarProps {
  selectedRepo: Repository | null;
  onRepoChange: (repo: Repository | null) => void;
  repos: Repository[];
  onRefreshRepos: () => void;
}

export default function Sidebar({ selectedRepo, onRepoChange, repos, onRefreshRepos }: SidebarProps) {
  const pathname = usePathname();
  const [healthInfo, setHealthInfo] = useState<HealthResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("docdoctor-theme") || "dark";
    setTheme(saved as any);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("docdoctor-theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  const [aiProvider, setAiProvider] = useState<"local" | "online">("local");
  const [apiKey, setApiKey] = useState<string>("");
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

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

  useEffect(() => {
    const check = async () => {
      const info = await apiService.checkHealth();
      setHealthInfo(info);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [aiProvider]);

  const handleProviderChange = async (provider: "local" | "online") => {
    setAiProvider(provider);
    setSaveStatus("idle");
    try {
      await apiService.updateSettings(provider, apiKey, offlineMode);
      setSaveStatus("saved");
      const info = await apiService.checkHealth();
      setHealthInfo(info);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleOfflineModeToggle = async () => {
    const next = !offlineMode;
    setOfflineMode(next);
    try {
      await apiService.updateSettings(aiProvider, apiKey, next);
      setSaveStatus("saved");
      const info = await apiService.checkHealth();
      setHealthInfo(info);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleSaveKey = async () => {
    setIsSaving(true);
    try {
      await apiService.updateSettings(aiProvider, apiKey, offlineMode);
      setSaveStatus("saved");
      const info = await apiService.checkHealth();
      setHealthInfo(info);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
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
    } catch {
      alert("Failed to delete repository");
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Living Docs", href: "/docs", icon: BookOpen },
    { name: "AI Chat", href: "/chat", icon: MessageSquare },
  ];

  const isHealthy = healthInfo?.status === "healthy";
  const isDegraded = healthInfo?.status === "degraded";

  return (
    <aside className="w-full h-full flex flex-col bg-[#040608]/80 backdrop-blur-md overflow-y-auto">

      {/* Logo */}
      <div className="px-4.5 py-2.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">DocDoctor</div>
            <div className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase mt-0.5">AI Agent</div>
          </div>
        </div>
      </div>

      {/* Active Workspace */}
      <div className="px-4.5 py-2.5 border-b border-white/[0.05]">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Workspace</div>
        {repos.length === 0 ? (
          <div className="px-3 py-1.5 bg-zinc-950/40 border border-white/[0.05] rounded-lg text-xs text-zinc-500 shadow-[inset_0_1px_0px_rgba(255,255,255,0.03)]">
            No repository
          </div>
        ) : (
          <div className="space-y-1.5">
            <select
              value={selectedRepo?.id || ""}
              onChange={(e) => {
                const repo = repos.find(r => r.id === parseInt(e.target.value)) || null;
                onRepoChange(repo);
              }}
              className="w-full glossy-input text-xs text-zinc-200 px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
            >
              <option value="" disabled>Select repository</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id} className="bg-zinc-950">{r.name}</option>
              ))}
            </select>

            {selectedRepo && (
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold">{selectedRepo.branch}</span>
                </div>
                {showConfirm ? (
                  <div className="flex items-center gap-1 text-xs">
                    <button onClick={handleDelete} disabled={isDeleting} className="text-red-400 hover:text-red-300 transition-colors">
                      {isDeleting ? "..." : "Confirm"}
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button onClick={() => setShowConfirm(false)} className="text-zinc-500 hover:text-zinc-400 transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowConfirm(true)} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-2 py-2.5 border-b border-white/[0.05]">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 px-2">Navigation</div>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all duration-200 mb-0.5 border-l-2 ${
                isActive
                  ? "bg-white/[0.04] text-white border-emerald-500 font-semibold shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border-transparent"
              }`}>
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* AI Engine */}
      <div className="px-4.5 py-3 border-b border-white/[0.05]">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">AI Engine</div>

        {/* Provider Toggle */}
        <div className="flex gap-1.5 mb-2.5">
          <button type="button" onClick={() => handleProviderChange("local")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] ${
              aiProvider === "local" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-500/10" 
                : "bg-zinc-950/40 border border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}>
            <Cpu className="w-3.5 h-3.5" /> Local
          </button>
          <button type="button" onClick={() => handleProviderChange("online")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] ${
              aiProvider === "online" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-500/10" 
                : "bg-zinc-950/40 border border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}>
            <Globe className="w-3.5 h-3.5" /> Online
          </button>
        </div>

        {/* Offline Mode */}
        <div className="flex items-center justify-between px-2.5 py-1.5 glossy-subcard mb-2.5">
          <div>
            <div className="text-xs font-semibold text-zinc-300">Offline Mode</div>
            <div className="text-[9px] text-zinc-500 font-medium">Local only</div>
          </div>
          <button type="button" onClick={handleOfflineModeToggle}
            className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all duration-300 ${
              offlineMode 
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                : "bg-white/5 border border-white/5 text-zinc-500"
            }`}>
            {offlineMode ? "ON" : "OFF"}
          </button>
        </div>

        {/* OpenAI Key */}
        {aiProvider === "online" && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">API Key</div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full glossy-input text-xs text-zinc-200 px-2.5 py-1.5 pr-8 rounded-lg outline-none"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button type="button" onClick={handleSaveKey} disabled={isSaving}
              className="w-full py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg transition-all duration-300 disabled:opacity-50 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Key"}
            </button>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="px-4.5 py-3 mt-auto">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Status</div>
        
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Connection</span>
            {healthInfo === null ? (
              <span className="text-zinc-500">Checking...</span>
            ) : isHealthy ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                Offline
              </span>
            )}
          </div>

          {healthInfo && (
            <>
              {healthInfo.provider === "local" && healthInfo.ollama_connected && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Ollama</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
              )}
              {healthInfo.provider === "online" && healthInfo.openai_available && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">OpenAI</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800/55 flex items-center justify-between text-[9px] text-zinc-600">
          <span>v1.0.0</span>
          <button 
            type="button" 
            onClick={toggleTheme}
            className="hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider text-[8px]"
            title="Toggle color theme"
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          <span>DocDoctor</span>
        </div>
      </div>
    </aside>
  );
}
