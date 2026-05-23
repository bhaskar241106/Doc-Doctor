"use client";

import React from "react";
import { RepoProvider, useRepo } from "@/context/RepoContext";
import Sidebar from "./Sidebar";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { selectedRepo, setSelectedRepo, repos, refreshRepos, isLoading } = useRepo();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border border-amber-500 animate-spin" />
          <p className="text-[10px] font-black tracking-widest text-amber-400 uppercase mt-2">Initializing DocDoctor Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b]" style={{ display: "block" }}>
      {/* Fixed Sidebar navigation */}
      <div 
        className="border-r border-white/[0.04] bg-[#09090b]"
        style={{ 
          width: "288px", 
          left: 0, 
          top: 0, 
          height: "100vh", 
          position: "fixed",
          zIndex: 40
        }}
      >
        <Sidebar 
          selectedRepo={selectedRepo} 
          onRepoChange={setSelectedRepo} 
          repos={repos} 
          onRefreshRepos={refreshRepos} 
        />
      </div>

      {/* Main Content Area */}
      <main 
        className="text-zinc-200 overflow-x-hidden"
        style={{ 
          marginLeft: "288px", 
          minHeight: "100vh", 
          display: "flex", 
          flexDirection: "column",
          position: "relative"
        }}
      >
        <div className="p-8 flex flex-col flex-1 w-full max-w-7xl mx-auto gap-8">
          {children}
        </div>
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
