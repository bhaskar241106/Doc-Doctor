<div align="center">

```
██████╗  ██████╗  ██████╗    ██████╗  ██████╗  ██████╗████████╗ ██████╗ ██████╗
██╔══██╗██╔═══██╗██╔════╝    ██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
██║  ██║██║   ██║██║         ██║  ██║██║   ██║██║        ██║   ██║   ██║██████╔╝
██║  ██║██║   ██║██║         ██║  ██║██║   ██║██║        ██║   ██║   ██║██╔══██╗
██████╔╝╚██████╔╝╚██████╗    ██████╔╝╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║  ██║
╚═════╝  ╚═════╝  ╚═════╝    ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
```

# 🚀 DEPLOYMENT GUIDE

### *Autonomous AI Developer Knowledge Agent — Full Stack Production Operations Manual*

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6B6B?style=for-the-badge)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-4CAF50?style=for-the-badge)

</div>

---

## 📋 Table of Contents

| # | Section | Description |
|---|---------|-------------|
| 1 | [🧩 System Architecture](#-system-architecture) | How DocDoctor is wired together |
| 2 | [⚙️ Prerequisites](#-prerequisites) | Software and hardware requirements |
| 3 | [🤖 AI Model Setup](#-ai-model-setup) | Installing and pulling Ollama models |
| 4 | [🔧 Environment Configuration](#-environment-configuration) | All environment variables explained |
| 5 | [🖥️ Local Development](#-local-development) | Running locally for development |
| 6 | [🐳 Docker Deployment](#-docker-deployment) | Containerised production deployment |
| 7 | [☁️ Cloud Deployment](#-cloud-deployment) | Deploying to VPS / cloud server |
| 8 | [📊 Process Management](#-process-management) | Systemd, PM2, Gunicorn, and supervisor configs |
| 9 | [🔐 Security Hardening](#-security-hardening) | Secrets, CORS, HTTPS, firewall rules |
| 10 | [📈 Monitoring & Health](#-monitoring--health) | Health endpoints, logging, and uptime |
| 11 | [💾 Backup & Recovery](#-backup--recovery) | Database and vector store backup strategies |
| 12 | [🛠️ Troubleshooting](#-troubleshooting) | Common issues and their fixes |

---

## 🧩 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DocDoctor System Map                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Browser  ──►  Next.js Frontend  ──►  FastAPI Backend  ──►  SQLite DB      │
│   :3000            (Port 3000)           (Port 8000)       (data/*.db)      │
│                                              │                              │
│                                    ┌─────────┴──────────┐                  │
│                                    │                    │                  │
│                              Ollama LLM          ChromaDB Vectors           │
│                            (Port 11434)          (data/chroma/)            │
│                          qwen2.5-coder:7b       nomic-embed-text           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Port Reference

| Service | Default Port | Protocol | Purpose |
|---------|-------------|----------|---------|
| 🌐 Next.js Frontend | `3000` | HTTP | UI and SSR |
| ⚡ FastAPI Backend | `8000` | HTTP | REST API + SSE Streams |
| 🤖 Ollama | `11434` | HTTP | Local LLM inference |

---

## ⚙️ Prerequisites

### 🖥️ Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 20 GB free | 50 GB SSD |
| **GPU** | None (CPU mode) | NVIDIA 6GB+ VRAM |

### 📦 Required Software

```bash
# 1. Python 3.11+
python --version   # Should output Python 3.11.x or higher

# 2. Node.js 18+ and npm
node --version     # Should output v18.x or higher
npm --version

# 3. Git
git --version

# 4. Ollama
# Install from: https://ollama.com/download
ollama --version
```

> [!TIP]
> On **Windows**, use the `winget` package manager for quick installs:
> ```powershell
> winget install Python.Python.3.11
> winget install OpenJS.NodeJS.LTS
> winget install Git.Git
> ```

---

## 🤖 AI Model Setup

DocDoctor requires two Ollama models — a **language model** for documentation generation and a **text embedding model** for semantic search.

### Step 1 — Start Ollama Service

```bash
# macOS / Linux
ollama serve

# Windows — Ollama auto-starts as a background service after install
# Verify it's running:
curl http://localhost:11434/api/tags
```

### Step 2 — Pull Required Models

```bash
# 🧠 LLM for code understanding and document generation
ollama pull qwen2.5-coder:7b

# 🔢 Embedding model for semantic RAG search
ollama pull nomic-embed-text
```

> [!NOTE]
> Download sizes:
> - `qwen2.5-coder:7b` → **~4.7 GB**
> - `nomic-embed-text` → **~274 MB**

### Step 3 — Verify Models

```bash
ollama list
```

Expected output:
```
NAME                    ID              SIZE    MODIFIED
qwen2.5-coder:7b        ...             4.7 GB  2 minutes ago
nomic-embed-text        ...             274 MB  1 minute ago
```

> [!TIP]
> For **GPU acceleration**, ensure NVIDIA CUDA drivers are installed. Ollama automatically detects and uses your GPU.

---

## 🔧 Environment Configuration

### Backend `.env` File

Create or edit `backend/.env`:

```env
# ════════════════════════════════════════
#  DocDoctor Backend Configuration
# ════════════════════════════════════════

# ── AI Provider Settings ─────────────────
AI_PROVIDER=local                         # Options: local | online
OFFLINE_MODE=false                        # true = block all cloud APIs

# ── Ollama Local LLM ─────────────────────
OLLAMA_BASE_URL=http://localhost:11434    # Ollama API endpoint
OLLAMA_LLM_MODEL=qwen2.5-coder:7b        # Language model name
OLLAMA_EMBED_MODEL=nomic-embed-text      # Embedding model name

# ── OpenAI Cloud (Optional) ──────────────
OPENAI_API_KEY=                          # Paste your key here if using cloud
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# ── Storage Paths ─────────────────────────
METADATA_DB_PATH=backend/data/docdoctor.db
CHROMA_PATH=backend/data/chroma
DOCS_OUTPUT_PATH=backend/data/docs
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | ✅ | `local` | AI backend: `local` (Ollama) or `online` (OpenAI) |
| `OFFLINE_MODE` | ✅ | `false` | When `true`, blocks all cloud API calls |
| `OLLAMA_BASE_URL` | ✅ | `http://localhost:11434` | Ollama service URL |
| `OLLAMA_LLM_MODEL` | ✅ | `qwen2.5-coder:7b` | Generation model |
| `OLLAMA_EMBED_MODEL` | ✅ | `nomic-embed-text` | Embedding model |
| `OPENAI_API_KEY` | ⚠️ Optional | `""` | Required only for `online` provider |
| `METADATA_DB_PATH` | ✅ | `backend/data/docdoctor.db` | SQLite metadata database path |
| `CHROMA_PATH` | ✅ | `backend/data/chroma` | ChromaDB persistent vector store path |
| `DOCS_OUTPUT_PATH` | ✅ | `backend/data/docs` | Generated markdown document cache |

---

## 🖥️ Local Development

### Quick Start (Windows)

```powershell
# 1. Clone the repository
git clone https://github.com/bhaskar241106/Doc-Doctor.git
cd Doc-Doctor

# 2. Double-click one of the controller scripts:
#    start-all.bat        → Start backend + frontend together
#    start-backend.bat    → Start only FastAPI backend
#    start-frontend.bat   → Start only Next.js frontend

# Or use the interactive menu inside each script!
.\start-all.bat
```

### Quick Start (macOS / Linux)

```bash
# 1. Clone the repository
git clone https://github.com/bhaskar241106/Doc-Doctor.git
cd Doc-Doctor

# ── Backend Setup ──────────────────────────────────────────────────
# 2. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .\.venv\Scripts\activate         # Windows

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Start the FastAPI backend server
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# ── Frontend Setup (new terminal tab) ────────────────────────────────
# 5. Install Node.js dependencies
cd frontend
npm install

# 6. Start the Next.js development server
npm run dev
```

### Accessing the App

| URL | Service |
|-----|---------|
| `http://localhost:3000` | 🌐 DocDoctor Web UI |
| `http://localhost:8000/docs` | 📄 FastAPI Swagger UI |
| `http://localhost:8000/api/health` | 💚 Health Check Endpoint |

---

## 🐳 Docker Deployment

### Dockerfile — Backend

```dockerfile
# ╔══════════════════════════════════════╗
# ║   DocDoctor Backend — Dockerfile     ║
# ╚══════════════════════════════════════╝
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY backend/.env .env

# Expose backend port
EXPOSE 8000

# Start Uvicorn server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile — Frontend

```dockerfile
# ╔══════════════════════════════════════╗
# ║   DocDoctor Frontend — Dockerfile    ║
# ╚══════════════════════════════════════╝
FROM node:18-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
# ╔══════════════════════════════════════════════════════╗
# ║           DocDoctor — docker-compose.yml             ║
# ╚══════════════════════════════════════════════════════╝
version: "3.9"

services:

  # ── Ollama Local LLM ──────────────────────────────────
  ollama:
    image: ollama/ollama:latest
    container_name: docdoctor-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    # Uncomment below for GPU passthrough (NVIDIA):
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

  # ── FastAPI Backend ────────────────────────────────────
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: docdoctor-backend
    ports:
      - "8000:8000"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - AI_PROVIDER=local
      - OFFLINE_MODE=false
      - METADATA_DB_PATH=/app/data/docdoctor.db
      - CHROMA_PATH=/app/data/chroma
      - DOCS_OUTPUT_PATH=/app/data/docs
    volumes:
      - ./data:/app/data
    depends_on:
      - ollama
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ── Next.js Frontend ───────────────────────────────────
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: docdoctor-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  ollama_data:
```

### Running with Docker Compose

```bash
# 1. Build and start all services
docker compose up -d --build

# 2. Pull AI models inside the Ollama container
docker exec docdoctor-ollama ollama pull qwen2.5-coder:7b
docker exec docdoctor-ollama ollama pull nomic-embed-text

# 3. Check health status
docker compose ps
curl http://localhost:8000/api/health

# 4. View live logs
docker compose logs -f backend
docker compose logs -f frontend

# 5. Shut down
docker compose down
```

---

## ☁️ Cloud Deployment

### 🟢 Ubuntu VPS Setup (DigitalOcean / Linode / Hetzner)

```bash
# ── System Update ─────────────────────────────────────
sudo apt update && sudo apt upgrade -y

# ── Install Python 3.11 ────────────────────────────────
sudo apt install -y python3.11 python3.11-venv python3-pip git curl

# ── Install Node.js 18 ────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ── Install Ollama ─────────────────────────────────────
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text

# ── Clone Repository ───────────────────────────────────
git clone https://github.com/bhaskar241106/Doc-Doctor.git /opt/docdoctor
cd /opt/docdoctor

# ── Install Backend Dependencies ───────────────────────
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# ── Install Frontend Dependencies ──────────────────────
cd frontend
npm ci
npm run build
cd ..
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/docdoctor

# ── Frontend proxy ──────────────────────────────────────────
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass          http://localhost:3000;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade $http_upgrade;
        proxy_set_header    Connection 'upgrade';
        proxy_set_header    Host $host;
        proxy_cache_bypass  $http_upgrade;
    }

    # ── Backend API proxy ───────────────────────────────────
    location /api/ {
        proxy_pass          http://localhost:8000;
        proxy_http_version  1.1;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_read_timeout  300s;    # Important for long LLM generation streams
        proxy_buffering     off;     # Required for SSE streaming
    }
}
```

```bash
# Enable the site and restart nginx
sudo ln -s /etc/nginx/sites-available/docdoctor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Enable HTTPS with Let's Encrypt (optional but recommended)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 📊 Process Management

### Systemd Service — Backend

```ini
# /etc/systemd/system/docdoctor-backend.service

[Unit]
Description=DocDoctor FastAPI Backend
After=network.target ollama.service

[Service]
Type=exec
User=ubuntu
WorkingDirectory=/opt/docdoctor
ExecStart=/opt/docdoctor/.venv/bin/uvicorn backend.main:app \
          --host 0.0.0.0 \
          --port 8000 \
          --workers 2 \
          --log-level info
EnvironmentFile=/opt/docdoctor/backend/.env
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Systemd Service — Frontend

```ini
# /etc/systemd/system/docdoctor-frontend.service

[Unit]
Description=DocDoctor Next.js Frontend
After=network.target docdoctor-backend.service

[Service]
Type=exec
User=ubuntu
WorkingDirectory=/opt/docdoctor/frontend
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=1536
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start both services
sudo systemctl daemon-reload
sudo systemctl enable docdoctor-backend docdoctor-frontend
sudo systemctl start docdoctor-backend docdoctor-frontend

# Check service status
sudo systemctl status docdoctor-backend
sudo systemctl status docdoctor-frontend

# View logs
sudo journalctl -u docdoctor-backend -f
sudo journalctl -u docdoctor-frontend -f
```

---

## 🔐 Security Hardening

> [!CAUTION]
> Always follow these security steps before exposing DocDoctor to the public internet.

### 🔒 Firewall Rules (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# Block direct access to internal service ports from outside
sudo ufw deny 8000/tcp    # Block backend direct access (go through nginx)
sudo ufw deny 11434/tcp   # Block Ollama direct access

sudo ufw enable
sudo ufw status
```

### 🔑 Environment Variable Security

```bash
# Set strict permissions on .env file
chmod 600 backend/.env
chown ubuntu:ubuntu backend/.env

# Never commit .env to version control — verify .gitignore includes:
echo "backend/.env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 🛡️ CORS Configuration

Edit `backend/main.py` to restrict origins to your exact domain in production:

```python
# For production, replace ["*"] with your actual frontend domain:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],   # ← Restrict this
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)
```

### 🔐 API Key Storage

> [!IMPORTANT]
> Never hardcode API keys in source files. Always use environment variables stored in `backend/.env` which is excluded from git via `.gitignore`.

---

## 📈 Monitoring & Health

### Health Check Endpoint

```bash
# Quick health check
curl http://localhost:8000/api/health

# Expected healthy response (local mode):
{
  "status": "healthy",
  "provider": "local",
  "offline_mode": false,
  "ollama_checked": true,
  "ollama_connected": true,
  "openai_checked": false,
  "openai_available": null,
  "reason": null
}
```

### Health Status Reference

| Status | Meaning |
|--------|---------|
| `healthy` | All active services connected and responsive |
| `degraded` | App running but some services unavailable (e.g. offline mode with cloud provider) |
| `unhealthy` | Core service (Ollama / DB) unreachable |

### Log Locations

| Environment | Backend Logs | Frontend Logs |
|-------------|-------------|---------------|
| **Local Dev** | Terminal stdout | Terminal stdout |
| **Systemd** | `journalctl -u docdoctor-backend` | `journalctl -u docdoctor-frontend` |
| **Docker** | `docker compose logs backend` | `docker compose logs frontend` |

---

## 💾 Backup & Recovery

### Database Backup

```bash
# SQLite backup (safe to run while app is running)
cp backend/data/docdoctor.db backend/data/docdoctor.db.backup.$(date +%Y%m%d)

# Automated daily backup via cron (add to crontab):
# 0 2 * * * cp /opt/docdoctor/backend/data/docdoctor.db /opt/backups/docdoctor-$(date +\%Y\%m\%d).db
```

### Vector Store Backup

```bash
# ChromaDB is stored as plain files — just copy the directory
cp -r backend/data/chroma backend/data/chroma.backup.$(date +%Y%m%d)
```

### Full Data Backup

```bash
# Backup the entire data directory
tar -czf docdoctor-backup-$(date +%Y%m%d).tar.gz backend/data/
```

> [!WARNING]
> The `backend/data/` directory contains your entire database, vector embeddings, and all generated documentation. **Back it up regularly** before upgrades or migrations.

---

## 🛠️ Troubleshooting

### ❌ Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, restart the service
sudo systemctl restart ollama       # Linux
# On Windows, restart from system tray or:
# Stop-Process -Name "ollama" -Force; Start-Process ollama
```

### ❌ Streaming Connection Error (async generator)

This was a known bug — fixed in the latest version. Ensure you're on the latest commit:
```bash
git pull origin main
```

### ❌ Port already in use

```bash
# Find and kill the process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS:
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### ❌ Frontend out of memory / hanging

```bash
# Set Node.js memory cap before starting
$env:NODE_OPTIONS="--max-old-space-size=1536"   # PowerShell
export NODE_OPTIONS="--max-old-space-size=1536"  # Bash

npm run dev
```

### ❌ Documents stuck in "generating" state

```bash
# Delete the stuck document record directly from SQLite
sqlite3 backend/data/docdoctor.db
> UPDATE documents SET status='failed', error_message='Manual reset' WHERE status='generating';
> .quit
```
Then click **Retry Document Generation** in the UI.

### ❌ ChromaDB collection error after upgrade

```bash
# Reset the vector store (WARNING: re-ingestion required)
rm -rf backend/data/chroma
mkdir backend/data/chroma
```

---

<div align="center">

---

**Built with 🖤 by [Bhaskar](https://github.com/bhaskar241106)**

*DocDoctor — Autonomous AI Developer Knowledge Agent*

[![GitHub](https://img.shields.io/badge/View_on_GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/bhaskar241106/Doc-Doctor)

</div>
