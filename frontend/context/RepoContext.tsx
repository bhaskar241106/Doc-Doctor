"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService, Repository } from "@/services/api";

interface RepoContextType {
  repos: Repository[];
  selectedRepo: Repository | null;
  setSelectedRepo: (repo: Repository | null) => void;
  refreshRepos: () => Promise<void>;
  isLoading: boolean;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepoState] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRepos = async () => {
    try {
      const data = await apiService.getRepositories();
      setRepos(data);
      
      // Attempt to restore selected repo from localStorage
      const cachedId = localStorage.getItem("selected_repo_id");
      if (cachedId) {
        const matched = data.find(r => r.id === parseInt(cachedId));
        if (matched) {
          setSelectedRepoState(matched);
        } else if (data.length > 0) {
          // Fallback to latest repo if cached one is gone
          setSelectedRepoState(data[0]);
          localStorage.setItem("selected_repo_id", data[0].id.toString());
        }
      } else if (data.length > 0) {
        setSelectedRepoState(data[0]);
        localStorage.setItem("selected_repo_id", data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load repositories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedRepo = (repo: Repository | null) => {
    setSelectedRepoState(repo);
    if (repo) {
      localStorage.setItem("selected_repo_id", repo.id.toString());
    } else {
      localStorage.removeItem("selected_repo_id");
    }
  };

  useEffect(() => {
    refreshRepos();
  }, []);

  return (
    <RepoContext.Provider value={{ repos, selectedRepo, setSelectedRepo, refreshRepos, isLoading }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return context;
}
