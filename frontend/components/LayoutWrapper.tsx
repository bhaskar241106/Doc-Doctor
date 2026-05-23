"use client";

import React from "react";
import { RepoProvider, useRepo } from "@/context/RepoContext";
import Sidebar from "./Sidebar";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { selectedRepo, setSelectedRepo, repos, refreshRepos, isLoading } = useRepo();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070a13] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-violet-400">Loading DocDoctor Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070a13]">
      {/* Fixed Sidebar navigation */}
      <Sidebar 
        selectedRepo={selectedRepo} 
        onRepoChange={setSelectedRepo} 
        repos={repos} 
        onRefreshRepos={refreshRepos} 
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen p-8 flex flex-col text-slate-200 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RepoProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </RepoProvider>
  );
}
