# 🩺 DocDoctor

### **The Self-Healing Codebase Intelligence Platform & Autonomous Documentation Agent**

<div align="left">

[![System Engine - Autonomous AI](https://img.shields.io/badge/System-Autonomous%20AI%20Agent-8b5cf6?style=for-the-badge&logo=robotframework&logoColor=white)](#)
[![Stack - FastAPI & Next.js](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%2015-3b82f6?style=for-the-badge&logo=nextdotjs&logoColor=white)](#)
[![Database - SQLite & ChromaDB](https://img.shields.io/badge/Databases-SQLite%20%7C%20ChromaDB-10b981?style=for-the-badge&logo=sqlite&logoColor=white)](#)
[![AI Engine - Dynamic Hybrid Switch](https://img.shields.io/badge/AI%20Engine-Offline%20%2B%20Online%20Router-f43f5e?style=for-the-badge&logo=openai&logoColor=white)](#)

</div>

---

> [!IMPORTANT]  
> **DocDoctor** completely cures the developer epidemic of stale, outdated software repositories. Operating directly at the crossroads of static AST syntax trees, sliding-window sliding chunkers, and dynamic switchable local/cloud LLMs, it turns developer push actions into pristine, self-healing, interactive engineering knowledge bases instantly and autonomously.

---

## ⚡ Core Operational Pipeline (Visual Flow)

DocDoctor coordinates codebase scanning, semantic indexing, and document synthesis in a fully automated system loop:

```mermaid
flowchart LR
    classDef stage fill:#0f172a,stroke:#8b5cf6,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef route fill:#1e1b4b,stroke:#f43f5e,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef endNode fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;

    startNode["📥 1. CONNECT<br>Git Ingestion & Clone"]:::stage

    startNode --> AST["🔍 2. SCAN<br>Compiler-Free AST syntax scanners"]:::stage
    startNode --> GitDiff["📡 2. DELTA<br>Git Commits & Webhook Diff Engine"]:::stage

    AST --> Router["🔄 3. ROUTE<br>Unified AI Router<br>(Offline Ollama &lt;=&gt; Cloud OpenAI)"]:::route
    GitDiff --> Router

    Router --> Docs["✍️ 4. SYNCHRONIZE<br>Continuous living markdown docs"]:::stage
    Router --> Embed["🧠 4. INDEX<br>Sliding Chunks ChromaDB vectors"]:::stage

    Docs --> chat["💬 5. CONVERSE<br>SSE RAG Streams & Citations"]:::endNode
    Embed --> chat
```

---

## 🎨 Dual-Engine Comparison Matrix

DocDoctor wraps standard AI calls through a **Unified AI Service Wrapper**. Toggle between engines in the Next.js Sidebar console dynamically with single-click persistence:

| Dimension | <span style="background-color: #7c3aed; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2);">🔌 OFFLINE (LOCAL NODE)</span> | <span style="background-color: #059669; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">☁️ ONLINE (CLOUD NODE)</span> |
| :--- | :--- | :--- |
| 🤖 **Active Model** | `qwen2.5-coder:7b` (Local hardware parameter execution) | `gpt-4o-mini` (Premium cloud semantic reasoning) |
| 🧠 **Embeddings Engine** | `nomic-embed-text` (768 Dimension vectors) | `text-embedding-3-small` (1536 Dimension vectors) |
| 🛡️ **IP Privacy** | 🟢 **100% Air-Gapped Security** (No data leaves local disk) | 🟡 **SSL Encrypted REST Calls** (Routed securely) |
| 💻 **Hardware Resource** | Runs directly on local GPU/VRAM or System CPU/RAM | Runs on remote servers (Zero local footprint) |
| ⚙️ **Instance Binding** | Ollama local daemon (`http://localhost:11434`) | Persistent SQLite token mapping key |

---

## 🌌 System Architecture & Data Flow Map

```mermaid
graph TD
    classDef client fill:#0f172a,stroke:#8b5cf6,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef server fill:#020617,stroke:#3b82f6,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef storage fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#f8fafc,shape:cylinder;

    A[Next.js App Client]:::client -->|API Requests| E[FastAPI Controller]:::server
    S[Sidebar settings Toggle]:::client -->|Toggles Engine| E
    
    E -->|Write config System settings| G[(SQLite Metadata DB)]:::storage
    E -->|Stream SSE completions & citations| C[RAG Chat panel]:::client
    E -->|Expose Living markdown docs| B[Living Docs Explorer]:::client

    D[GitHub push Webhook listener]:::server -->|Trigger ingestion| H[Doc Orchestrator]:::server
    H -->|Fetch repositories| I[GitPython Controller]:::server
    H -->|Scanned AST trees| J[AST Syntax Parsers]:::server
    H -->|Chunk sliding windows| L[Vector chunker Chunker]:::server
    L -->|Generate Embeddings| M[Unified AIService]:::server
    M -->|Dynamic Switch: Ollama / OpenAI| M
    M -->|Write vector blocks| N[(ChromaDB Vector Store)]:::storage
    H -->|Update living docs content| G
```

---

## 🛠️ Tech Stack & Engineering Core

* **High-Performance Backend**: FastAPI (Python 3.9+) with async background execution tasks, running Server-Sent Events (SSE) streaming connections.
* **Vibrant Developer Dashboard**: Next.js 15 (App Router, TypeScript) styled with custom glassmorphism overlays, custom scrollbars, and fluid CSS hover effects.
* **Persistent Vector Vault**: Persisted ChromaDB collection namespaces isolated on a per-repository basis to guarantee zero data leakage.
* **Syntax Extractor Scanners**: Python Abstract Syntax Tree (`ast` module) paired with compiler-free brace-matching regex parsers for JS, TS, Go, Java, and C#.
* **Metadata Warehouse**: SQLite database caching repository configurations, synchronization logs, and historical chat sessions.

---

## 💬 Live RAG Chat Demonstration (Visual HUD)

Here is a visual representation of how the streaming codebase RAG chat renders and cites source files in the Next.js interface:

> **👤 DEVELOPER**: *Explain how the AST syntax tree parser isolates function parameters.*
> 
> **🩺 DOCDOCTOR AGENT**: *(Analyzing repo with 5 retrieved vector snippets)*
> 
> > [!NOTE]  
> > **Retrieved Citations Context Map**:
> > *   📄 [ast_parser.py](file:///c:/Users/bhaskar/Desktop/DocDoctor/backend/parsers/ast_parser.py#L42-L65) (Lines: 42-65) ➜ `class ASTParser`
> > *   📄 [doc_orchestrator.py](file:///c:/Users/bhaskar/Desktop/DocDoctor/backend/agents/doc_orchestrator.py#L110-L128) (Lines: 110-128) ➜ `def _parse_source_file`
> 
> "The structural syntax analyzer extracts class and function boundaries using Python's native `ast` module. The function parameter isolation logic resides inside [ast_parser.py](file:///c:/Users/bhaskar/Desktop/DocDoctor/backend/parsers/ast_parser.py#L42-L65):
> 
> ```python
> def visit_FunctionDef(self, node):
>     # Isolated parameters tracker
>     args = [arg.arg for arg in node.args.args]
>     self.functions.append({
>         "name": node.name,
>         "args": args,
>         "docstring": ast.get_docstring(node),
>         "start_line": node.lineno
>     })
> ```
> This constructs a full parameter signature map dynamically, which is then fed into the RAG vector store pipeline!"

---

## 📡 API Specification & Control HUD

DocDoctor exposes clean REST endpoints for full state control:

### Settings Persistence
* **`GET /api/settings`**  
  Retrieves current AI provider configuration and active OpenAI key mappings.
* **`POST /api/settings`**  
  Persists toggled configurations and keys dynamically in the SQLite settings table.  
  *Payload Blueprint:*
  ```json
  {
    "ai_provider": "local" | "online",
    "openai_api_key": "sk-proj-..."
  }
  ```

### Repository Management
* **`POST /api/repositories`**  
  Registers a codebase, schedules an async background cloning task, and initiates scanning.
* **`POST /api/repositories/{repo_id}/sync`**  
  Triggers a manual delta synchronization check.
* **`DELETE /api/repositories/{repo_id}`**  
  Completely purges database logs, local source checkouts, and vectors in ChromaDB.

### Codebase RAG Conversation
* **`POST /api/chat/query`**  
  Spins up an SSE stream that serves completion tokens word-by-word alongside citation mappings.

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure **Ollama** is active on your machine and retrieve required open-source models:
```bash
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

### 1. Boot up the FastAPI Backend
Navigate to the `backend/` directory, install requirements, and boot the server:
```bash
cd backend
pip install -r requirements.txt
python main.py
```
> [!TIP]  
> Backend server will be active at **`http://localhost:8000`**. Explore interactive Swagger specifications at `http://localhost:8000/docs`.

### 2. Launch the Next.js Dashboard
Open a separate terminal window, navigate to the `frontend/` directory, install node modules, and run the hot-reloading dev server:
```bash
cd frontend
npm install
npm run dev
```
> [!NOTE]  
> The dashboard will start immediately at **`http://localhost:3000`**.

---

## 🧪 Real-Time Ingestion & Simulation

### A. Ingesting Your Codebase
1. Open the DocDoctor dashboard (`http://localhost:3000`).
2. Under **Connect Codebase**, insert:
   - **Repository Name**: `DocDoctor`
   - **Local Path**: Absolute path of this project, e.g., `c:\Users\bhaskar\Desktop\DocDoctor`
   - **Default Branch**: `main`
3. Tap **Add & Ingest Codebase**. 
4. Watch the pipeline build AST indices and draft 5 document categories dynamically.

### B. Trigger Simulated Commits
To verify real-time webhook parsing, run our automated commit activity simulator in your terminal:
```bash
python backend/tests/mock_push.py
```
Observe the dashboard reload automatically to reflect the incoming commit payload from `Bhaskar`, listing diffs and re-generating active guides instantly.

### C. Configure Cloud Routing
1. Toggle the sidebar AI Engine to **Online**.
2. Input your OpenAI API Key (`sk-proj-...`) and save.
3. Observe the dynamic active node footer transition to **Cloud Node: ONLINE**! Future chat prompts and code indexing will run instantly through premium cloud models with full context.

---

## 🔒 Security Policies

* **Zero-Leakage Vector Isolation**: Each project is bound to its own scoped ChromaDB namespace.
* **Encrypted Key Storage**: API tokens reside strictly in your local SQLite data block, never sent to external servers.
* **Air-Gapped Compliance**: Local mode runs 100% offline, making it completely compliant with enterprise security standards.

---

<div align="center">
🩺 <i>Designed to cure developer documentation syndrome. Go fully autonomous.</i>
</div>
