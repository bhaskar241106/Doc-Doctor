const API_BASE_URL = "http://localhost:8000/api";

export interface Repository {
  id: number;
  name: string;
  clone_url: string;
  branch: string;
  local_path: string;
  created_at: string;
  last_sync_at: string | null;
}

export interface CommitActivity {
  id: number;
  repo_id: number;
  commit_hash: string;
  author: string;
  message: string;
  timestamp: string;
  changed_files: string[];
}

export interface Document {
  id: number;
  repo_id: number;
  doc_type: "readme" | "api_docs" | "architecture" | "onboarding" | "pr_summary" | "deployment";
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  status?: "pending" | "generating" | "completed" | "failed" | "missing";
  error_message?: string;
}

export interface ChatSession {
  id: string;
  repo_id: number;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations: string[];
  timestamp: string;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  provider: "local" | "online";
  offline_mode: boolean;
  ollama_checked: boolean;
  ollama_connected: boolean | null;
  openai_checked: boolean;
  openai_available: boolean | null;
  reason: string | null;
}

export const apiService = {
  // Health check
  async checkHealth(): Promise<HealthResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  // Repositories
  async getRepositories(): Promise<Repository[]> {
    const res = await fetch(`${API_BASE_URL}/repositories`);
    if (!res.ok) throw new Error("Failed to load repositories");
    return res.json();
  },

  async createRepository(name: string, cloneUrl: string, branch: string = "main"): Promise<Repository> {
    const res = await fetch(`${API_BASE_URL}/repositories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clone_url: cloneUrl, branch }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to connect repository");
    }
    return res.json();
  },

  async deleteRepository(repoId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/repositories/${repoId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete repository");
  },

  async syncRepository(repoId: number): Promise<Repository> {
    const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/sync`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to sync repository");
    return res.json();
  },

  // Commit Logs
  async getCommitActivity(repoId: number): Promise<CommitActivity[]> {
    const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/activity`);
    if (!res.ok) throw new Error("Failed to fetch repository activity logs");
    return res.json();
  },

  // Document management
  async getDocuments(repoId: number): Promise<Document[]> {
    const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/documents`);
    if (!res.ok) throw new Error("Failed to load generated documentation");
    return res.json();
  },

  async getDocumentByType(repoId: number, docType: string): Promise<Document | null> {
    const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/documents/${docType}`);
    
    if (res.status === 202) {
      return {
        id: -1,
        repo_id: repoId,
        doc_type: docType as any,
        title: `Generating ${docType.replace('_', ' ').toUpperCase()}...`,
        content: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "generating"
      };
    }
    
    if (res.status === 500) {
      const errBody = await res.json();
      return {
        id: -1,
        repo_id: repoId,
        doc_type: docType as any,
        title: `${docType.replace('_', ' ').toUpperCase()} Generation Failed`,
        content: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "failed",
        error_message: errBody.error || "Generation failed"
      };
    }

    if (res.status === 404 || res.status === 400) {
      return null;
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Failed to load ${docType}`);
    }
    
    return res.json();
  },

  async regenerateDocument(repoId: number, docType: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/documents/${docType}/regenerate`, {
      method: "POST"
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to trigger regeneration");
    }
    return res.json();
  },

  // Chat services
  async createChatSession(repoId: number, title: string = "Chat Session"): Promise<ChatSession> {
    const res = await fetch(`${API_BASE_URL}/chat/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId, title }),
    });
    if (!res.ok) throw new Error("Failed to create chat session");
    return res.json();
  },

  async getChatSessions(repoId: number): Promise<ChatSession[]> {
    const res = await fetch(`${API_BASE_URL}/chat/session/${repoId}`);
    if (!res.ok) throw new Error("Failed to fetch chat sessions");
    return res.json();
  },

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/messages`);
    if (!res.ok) throw new Error("Failed to fetch chat history");
    return res.json();
  },

  // Chat Query stream callback wrapper
  async streamChatQuery(
    message: string,
    sessionId: string,
    onChunk: (chunk: string) => void,
    onCitations: (citations: string[]) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error("Chat service responded with an error status.");
      }

      if (!response.body) {
        throw new Error("Readable response stream unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse event stream lines
        const lines = buffer.split("\n\n");
        // Keep the last partial line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataContent = line.slice(6).trim();
            if (dataContent === "[DONE]") {
              onComplete();
              return;
            }

            try {
              const payload = JSON.parse(dataContent);
              if (payload.citations) {
                onCitations(payload.citations);
              }
              if (payload.delta) {
                onChunk(payload.delta);
              }
            } catch (err) {
              // Ignore partial chunk syntax errors
            }
          }
        }
      }
      onComplete();
    } catch (err: any) {
      onError(err);
    }
  },

  // Settings
  async getSettings(): Promise<{ ai_provider: string; openai_api_key: string; offline_mode: boolean }> {
    const res = await fetch(`${API_BASE_URL}/settings`);
    if (!res.ok) throw new Error("Failed to load settings");
    return res.json();
  },

  async updateSettings(aiProvider: string, openaiApiKey: string, offlineMode: boolean): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_provider: aiProvider, openai_api_key: openaiApiKey, offline_mode: offlineMode }),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  }
};
