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
      <div className="flex h-screen w-screen items-center justify-center bg-[#020406] text-white">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
          <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase mt-2 animate-pulse">
            Initializing Environment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040608] overflow-x-hidden relative">
      {/* Tech Grid Background Overlay */}
      <div className="absolute inset-0 tech-grid pointer-events-none z-0" />

      {/* Premium Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-teal-500/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Fixed Sidebar navigation */}
      <div 
        className="border-r border-white/[0.05] bg-[#040608] relative z-10"
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
        className="text-zinc-100 relative z-10"
        style={{ 
          marginLeft: "280px", 
          minHeight: "100vh"
        }}
      >
        <div className="p-5 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const saved = localStorage.getItem("docdoctor-theme") || "dark";
    if (saved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  return (
    <RepoProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </RepoProvider>
  );
}
