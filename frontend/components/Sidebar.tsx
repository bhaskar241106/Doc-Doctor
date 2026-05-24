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
    <aside className="w-full h-full flex flex-col bg-[#0a0a0a] overflow-y-auto">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">DocDoctor</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">AI Agent</div>
          </div>
        </div>
      </div>

      {/* Active Workspace */}
      <div className="px-6 py-5 border-b border-zinc-800/50">
        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Workspace</div>
        {repos.length === 0 ? (
          <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-md text-xs text-zinc-500">
            No repository
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedRepo?.id || ""}
              onChange={(e) => {
                const repo = repos.find(r => r.id === parseInt(e.target.value)) || null;
                onRepoChange(repo);
              }}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-200 px-3 py-2 rounded-md outline-none focus:border-orange-500/50 transition-colors cursor-pointer"
            >
              <option value="" disabled>Select repository</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id} className="bg-zinc-900">{r.name}</option>
              ))}
            </select>

            {selectedRepo && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{selectedRepo.branch}</span>
                </div>
                {showConfirm ? (
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={handleDelete} disabled={isDeleting} className="text-red-400 hover:text-red-300">
                      {isDeleting ? "..." : "Confirm"}
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button onClick={() => setShowConfirm(false)} className="text-zinc-500 hover:text-zinc-400">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowConfirm(true)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 border-b border-zinc-800/50">
        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2 px-3">Navigation</div>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors mb-1 ${
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}>
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* AI Engine */}
      <div className="px-6 py-5 border-b border-zinc-800/50">
        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">AI Engine</div>

        {/* Provider Toggle */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => handleProviderChange("local")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
              aiProvider === "local" ? "bg-orange-500 text-white" : "bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
            }`}>
            <Cpu className="w-3.5 h-3.5" /> Local
          </button>
          <button type="button" onClick={() => handleProviderChange("online")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
              aiProvider === "online" ? "bg-orange-500 text-white" : "bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
            }`}>
            <Globe className="w-3.5 h-3.5" /> Online
          </button>
        </div>

        {/* Offline Mode */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-md mb-3">
          <div>
            <div className="text-xs font-medium text-zinc-300">Offline Mode</div>
            <div className="text-[10px] text-zinc-500">Local only</div>
          </div>
          <button type="button" onClick={handleOfflineModeToggle}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
              offlineMode ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
            }`}>
            {offlineMode ? "ON" : "OFF"}
          </button>
        </div>

        {/* OpenAI Key */}
        {aiProvider === "online" && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">API Key</div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-200 px-3 py-2 pr-9 rounded-md outline-none focus:border-orange-500/50 transition-colors"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="button" onClick={handleSaveKey} disabled={isSaving}
              className="w-full py-2 text-xs font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Key"}
            </button>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="px-6 py-5 mt-auto">
        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Status</div>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Connection</span>
            {healthInfo === null ? (
              <span className="text-zinc-500">Checking...</span>
            ) : isHealthy ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-400">
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

        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-600">
          <span>v1.0.0</span>
          <span>DocDoctor</span>
        </div>
      </div>
    </aside>
  );
}
