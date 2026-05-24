"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RepoProvider, useRepo } from "@/context/RepoContext";
import Sidebar from "./Sidebar";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { selectedRepo, setSelectedRepo, repos, refreshRepos, isLoading } = useRepo();
  
  // Landing page uses full-screen layout without sidebar
  if (pathname === "/") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-8 h-8 border-2 border-indigo-500 animate-spin rounded-none" />
          <p className="text-[10px] font-bold tracking-[0.2em] text-indigo-400 uppercase mt-2 animate-pulse-soft">
            Initializing Environment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden">
      {/* Fixed Sidebar navigation */}
      <div 
        className="border-r border-zinc-800/50 bg-[#0a0a0a]"
        style={{ 
          width: "280px", 
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
        className="text-zinc-100"
        style={{ 
          marginLeft: "280px", 
          minHeight: "100vh"
        }}
      >
        <div className="p-8 max-w-[1400px] mx-auto">
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
