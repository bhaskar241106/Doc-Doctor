"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Terminal, BookOpen, MessageSquare, RefreshCw, GitBranch, 
  Trash2, Plus, Database, Activity, CheckCircle2, AlertCircle,
  Eye, EyeOff, Cpu, Globe, Save, Check, Loader2
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
      const info = await apiService.checkHealth();
      setHealthInfo(info);
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
      const info = await apiService.checkHealth();
      setHealthInfo(info);
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
      const info = await apiService.checkHealth();
      setHealthInfo(info);
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
      const info = await apiService.checkHealth();
      setHealthInfo(info);
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
    <aside className="w-full h-full flex flex-col justify-between z-40 bg-[#000000] border-r border-white/[0.03]">
      <div>
        {/* Header Branding */}
        <div className="p-6 flex items-center gap-3.5 border-b border-white/[0.03]">
          <div className="w-8 h-8 border border-white/[0.08] bg-[#09090b] flex items-center justify-center shadow-md relative group">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-widest text-white flex items-center gap-1.5 leading-none uppercase">
              Doc<span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 text-[9px]">DOCTOR</span>
            </h1>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1.5">Autonomous Intelligence</p>
          </div>
        </div>

        {/* Repository selector */}
        <div className="p-5 border-b border-white/[0.03]">
          <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block mb-2.5 px-0.5">
            Active Workspace
          </label>
          {repos.length === 0 ? (
            <div className="px-3.5 py-3 border border-zinc-900 bg-[#000000] text-center text-[10px] text-zinc-500 font-mono">
              [NO_ACTIVE_CODEBASE]
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <select
                  value={selectedRepo?.id || ""}
                  onChange={(e) => {
                    const repo = repos.find(r => r.id === parseInt(e.target.value)) || null;
                    onRepoChange(repo);
                  }}
                  className="w-full bg-[#000000] border border-white/[0.06] hover:border-white/[0.12] text-[10px] text-zinc-200 rounded-none px-3 py-2.5 outline-none focus:border-amber-500 transition-all cursor-pointer appearance-none font-mono"
                >
                  <option value="" disabled>Select active repository...</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 text-[8px]">
                  ▼
                </div>
              </div>

              {selectedRepo && (
                <div className="flex items-center justify-between text-[9px] text-zinc-500 px-0.5 mt-1 font-semibold">
                  <span className="flex items-center gap-1.5 text-zinc-400 bg-white/[0.01] border border-white/[0.04] px-2 py-0.5 font-mono">
                    <GitBranch className="w-2.5 h-2.5 text-amber-400" />
                    {selectedRepo.branch.toUpperCase()}
                  </span>
                  
                  {showConfirm ? (
                    <div className="flex items-center gap-2 bg-red-950/10 border border-red-500/10 px-2 py-0.5 font-mono">
                      <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer uppercase text-[8px]"
                      >
                        {isDeleting ? "..." : "Confirm?"}
                      </button>
                      <button 
                        onClick={() => setShowConfirm(false)}
                        className="text-zinc-500 hover:text-zinc-300 font-bold transition-colors cursor-pointer uppercase text-[8px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowConfirm(true)}
                      className="text-red-500/70 hover:text-red-400 flex items-center gap-1 transition-all hover:bg-red-500/5 px-2 py-0.5 border border-transparent hover:border-red-500/10 font-mono text-[9px] cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      DISCONNECT
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="p-5 border-b border-white/[0.03] flex flex-col gap-1">
          <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block mb-2.5 px-0.5">
            Core Modules
          </label>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all duration-150 border-l border-transparent ${
                  isActive 
                    ? "bg-white/[0.01] border-l border-amber-500 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-zinc-600"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* AI Engine Control Panel */}
        <div className="p-5 border-b border-white/[0.03]">
          <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block mb-2.5 px-0.5">
            AI Engine Control
          </label>
          
          <div className="border border-white/[0.04] p-3.5 bg-[#000000]">
            {/* Engine Selector Pill Toggle */}
            <div className="bg-black/60 p-1 flex border border-white/[0.03] mb-3">
              <button
                type="button"
                onClick={() => handleProviderChange("local")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all duration-150 ${
                  aiProvider === "local"
                    ? "bg-white text-black font-black"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent cursor-pointer"
                }`}
              >
                <Cpu className="w-2.5 h-2.5" />
                Local
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange("online")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all duration-150 ${
                  aiProvider === "online"
                    ? "bg-white text-black font-black"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent cursor-pointer"
                }`}
              >
                <Globe className="w-2.5 h-2.5" />
                Online
              </button>
            </div>

            <div className="border border-white/[0.04] bg-white/[0.01] p-3 mb-2 text-[9px] text-zinc-400">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-zinc-200 uppercase tracking-wider font-mono">Offline Ollama</p>
                  <p className="text-[8px] text-zinc-600 mt-1 leading-relaxed">
                    Force local hardware execution only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOfflineModeToggle}
                  className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider transition-all border ${
                    offlineMode
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                      : "bg-white/[0.01] border-white/[0.08] text-zinc-500"
                  }`}
                >
                  {offlineMode ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            {/* API Key Configuration */}
            <div className={`transition-all duration-200 overflow-hidden ${
              aiProvider === "online" ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
            }`}>
              <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest block mb-1.5 px-0.5">
                OpenAI API Key
              </label>
              <div className="relative flex items-center mb-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-[#000000] border border-white/[0.06] text-[10px] text-zinc-200 rounded-none pl-2.5 pr-8 py-1.5 outline-none focus:border-amber-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveKey}
                disabled={isSaving}
                className="w-full bg-white text-black hover:bg-black hover:text-white rounded-none py-1.5 text-[9px] font-black tracking-widest uppercase transition-all border border-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : saveStatus === "saved" ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Save className="w-2.5 h-2.5" />
                )}
                {isSaving ? "Saving..." : saveStatus === "saved" ? "Key Saved!" : "Save Cloud Key"}
              </button>
            </div>

            {/* Small subtle status text */}
            <div className="mt-2.5 flex items-center justify-between text-[8px] text-zinc-600 px-0.5 font-bold font-mono">
              <span>STATUS:</span>
              <span className={`uppercase tracking-wider ${
                saveStatus === "saved" 
                  ? "text-emerald-400" 
                  : saveStatus === "error" 
                  ? "text-rose-400 animate-pulse" 
                  : "text-zinc-500"
              }`}>
                {saveStatus === "saved" ? "Settings Saved" : saveStatus === "error" ? "Save Failed" : "Synchronized"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Panel */}
      <div className="p-5 border-t border-white/[0.03] bg-[#000000]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <div className="flex items-center gap-2 text-zinc-500 font-black uppercase tracking-widest">
              {aiProvider === "local" ? (
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>
                {aiProvider === "local" ? "Local Node" : "Cloud Node"}
              </span>
            </div>
            {healthInfo === null ? (
              <span className="flex items-center gap-1.5 text-zinc-600 uppercase font-black tracking-widest">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> SCAN
              </span>
            ) : healthInfo.status === "healthy" ? (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 tracking-wider font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-500" />
                ONLINE
              </span>
            ) : healthInfo.status === "degraded" ? (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 tracking-wider font-bold">
                <span className="w-1.5 h-1.5 bg-amber-500" />
                DEGRADED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 tracking-wider font-bold animate-pulse">
                <span className="w-1.5 h-1.5 bg-rose-500" />
                OFFLINE
              </span>
            )}
          </div>

          {/* Premium diagnostic info message depending on provider aware status */}
          {healthInfo && (
            <div className="border border-white/[0.04] bg-[#09090b] p-2.5 font-mono text-[8px] text-zinc-500 flex flex-col gap-1.5 leading-relaxed">
              {healthInfo.provider === "local" && healthInfo.offline_mode && (
                <>
                  <div className="flex items-center justify-between text-zinc-400 font-bold">
                    <span>MODE:</span>
                    <span className="text-amber-400 font-black">RUNNING FULLY LOCAL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>CLOUD APIs:</span>
                    <span className="text-zinc-600">DISABLED (OFFLINE)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LOCAL OLLAMA:</span>
                    <span className={healthInfo.ollama_connected ? "text-emerald-400" : "text-rose-400"}>
                      {healthInfo.ollama_connected ? "CONNECTED" : "DISCONNECTED"}
                    </span>
                  </div>
                </>
              )}
              {healthInfo.provider === "local" && !healthInfo.offline_mode && (
                <>
                  <div className="flex items-center justify-between text-zinc-400 font-bold">
                    <span>MODE:</span>
                    <span className="text-zinc-400 font-black">HYBRID (LOCAL LLM)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LOCAL OLLAMA:</span>
                    <span className={healthInfo.ollama_connected ? "text-emerald-400" : "text-rose-400"}>
                      {healthInfo.ollama_connected ? "CONNECTED" : "DISCONNECTED"}
                    </span>
                  </div>
                  {healthInfo.openai_checked && (
                    <div className="flex items-center justify-between">
                      <span>OPENAI CHECK:</span>
                      <span className={healthInfo.openai_available ? "text-emerald-400" : "text-rose-400"}>
                        {healthInfo.openai_available ? "AVAILABLE" : "UNAVAILABLE"}
                      </span>
                    </div>
                  )}
                </>
              )}
              {healthInfo.provider === "online" && healthInfo.offline_mode && (
                <>
                  <div className="flex items-center justify-between text-rose-400 font-bold animate-pulse">
                    <span>BLOCK:</span>
                    <span className="text-rose-400 font-black">CLOUD APIs DISABLED</span>
                  </div>
                  <div className="text-[7.5px] text-zinc-600 mt-1 leading-normal uppercase">
                    OpenAI Unavailable in Offline Mode. Switch provider to Local or disable Offline Mode in settings.
                  </div>
                </>
              )}
              {healthInfo.provider === "online" && !healthInfo.offline_mode && (
                <>
                  <div className="flex items-center justify-between text-zinc-400 font-bold">
                    <span>MODE:</span>
                    <span className="text-emerald-400 font-black">CLOUD EXECUTION</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>OPENAI API:</span>
                    <span className={healthInfo.openai_available ? "text-emerald-400" : "text-rose-400"}>
                      {healthInfo.openai_available ? "CONNECTED" : "UNREACHABLE"}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
