FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for some python packages and git
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies (supports both root-repository and backend-folder build contexts)
COPY requirements.txt* backend/requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose backend port
EXPOSE 8000

# Start FastAPI server (checks if main.py is in root or inside backend folder)
CMD ["sh", "-c", "if [ -f main.py ]; then uvicorn main:app --host 0.0.0.0 --port 8000; else uvicorn backend.main:app --host 0.0.0.0 --port 8000; fi"]
