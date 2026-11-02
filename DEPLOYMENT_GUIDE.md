# 🚀 Deployment & Docker Guide — News Portal

> **Audience:** Developers new to DevOps  
> **Last Updated:** October 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Running Locally (Without Docker)](#2-running-locally-without-docker)
3. [Running Locally (With Docker)](#3-running-locally-with-docker)
4. [Docker Commands Cheat Sheet](#4-docker-commands-cheat-sheet)
5. [Viewing Logs & Debugging](#5-viewing-logs--debugging)
6. [Deployment Pipeline (Production)](#6-deployment-pipeline-production)
7. [How Credentials Work](#7-how-credentials-work)
8. [Database — What Happens on Each Build](#8-database--what-happens-on-each-build)
9. [Common Errors & Fixes](#9-common-errors--fixes)
10. [Kubernetes Commands (Production Server)](#10-kubernetes-commands-production-server)
11. [Glossary](#11-glossary)

---

## 1. Project Overview

```
news-portal/
├── frontend/                  ← Next.js app (user-facing UI, port 3000)
│   └── Dockerfile.frontend    ← Docker recipe for frontend
├── backend/                   ← Django app (API + admin, port 8000)
│   └── Dockerfile.backend     ← Docker recipe for backend
├── docker-compose.yml         ← Runs everything locally with one command
├── start.sh                   ← Local dev script (non-Docker alternative)
└── DEPLOYMENT_GUIDE.md        ← This file
```

- **Frontend:** Next.js (React) — runs on port `3000`
- **Backend:** Django + DRF + Gunicorn — runs on port `8000`
- **Database:** SQLite (local without Docker) / PostgreSQL (Docker & production)
- **Git Remote:** `http://git.mediatechtemple.in:3000/root/ss_local`

---

## 2. Running Locally (Without Docker)

Use this for quick development — no Docker needed.

### Prerequisites
- Python 3.12+ with `venv` already set up in `backend/venv/`
- Node.js 20+ with `node_modules/` already installed in `frontend/`

### Option A: Single command
```bash
bash start.sh
```

### Option B: Manual (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
cd dashboard
python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

> **Note:** This uses SQLite (`db.sqlite3`), not PostgreSQL. No `.env` file needed — defaults are built into `settings.py`.

---

## 3. Running Locally (With Docker)

Use this to test with the **exact same setup as production** (PostgreSQL + Gunicorn).

### Prerequisites
- Docker and Docker Compose installed

### Start everything
```bash
# First time or after code changes (rebuilds images)
docker compose up --build

# Run in background (frees your terminal)
docker compose up -d --build

# Subsequent runs (no code changes)
docker compose up -d
```

### Stop everything
```bash
# If running in foreground
Ctrl + C

# If running in background
docker compose down               # ✅ database data is SAFE

# ⚠️ NUCLEAR — stops + DELETES all database data
docker compose down -v
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

### Create admin user (first time only)
```bash
docker compose exec backend python manage.py createsuperuser
```

---

## 4. Docker Commands Cheat Sheet

### Starting

| Want to... | Command |
|-----------|---------|
| Start everything (rebuild) | `docker compose up --build` |
| Start in background (rebuild) | `docker compose up -d --build` |
| Start without rebuild | `docker compose up -d` |
| Start only backend | `docker compose up backend` |

### Stopping

| Want to... | Command |
|-----------|---------|
| Stop (foreground) | `Ctrl + C` |
| Stop (background) | `docker compose down` |
| Stop + delete DB data | `docker compose down -v` |
| Stop + delete everything | `docker compose down -v --rmi all` |

### Restarting

| Want to... | Command |
|-----------|---------|
| Restart everything | `docker compose restart` |
| Restart backend only | `docker compose restart backend` |
| Restart frontend only | `docker compose restart frontend` |
| Full rebuild + restart | `docker compose down && docker compose up --build` |

### Status & Info

| Want to... | Command |
|-----------|---------|
| See what's running | `docker compose ps` |
| See all images | `docker images` |
| Free disk space | `docker system prune -a` |

### Going Inside Containers

| Want to... | Command |
|-----------|---------|
| Shell into backend | `docker compose exec backend bash` |
| Shell into frontend | `docker compose exec frontend sh` |
| Open database console | `docker compose exec db psql -U newsadmin -d news_portal` |
| Run Django management command | `docker compose exec backend python manage.py <command>` |
| Run migrations manually | `docker compose exec backend python manage.py migrate` |
| Create superuser | `docker compose exec backend python manage.py createsuperuser` |
| Open Django shell | `docker compose exec backend python manage.py shell` |

---

## 5. Viewing Logs & Debugging

### Log Commands

```bash
# All logs from all services
docker compose logs

# Follow logs in real-time (like tail -f)
docker compose logs -f

# Specific service only
docker compose logs backend
docker compose logs frontend
docker compose logs db

# Follow specific service
docker compose logs -f backend

# Last N lines only
docker compose logs --tail=50 backend

# Logs with timestamps
docker compose logs -t backend
```

### What to Look For

| Service | Error | Meaning |
|---------|-------|---------|
| **db** | `password authentication failed` | Wrong DB username/password in docker-compose.yml |
| **backend** | `could not connect to server` | Backend can't reach database (DB not ready yet, try restart) |
| **backend** | `DisallowedHost` | URL not in ALLOWED_HOSTS |
| **backend** | `ModuleNotFoundError` | Missing package in requirements.txt |
| **backend** | `relation "xxx" does not exist` | Migrations didn't run — `docker compose exec backend python manage.py migrate` |
| **frontend** | `connect ECONNREFUSED` | Frontend can't reach backend API |
| **frontend** | `NEXT_PUBLIC_API_URL` empty | API URL not set — check docker-compose.yml build args |
| **any** | `Read timed out` during build | Slow internet — just retry: `docker compose up --build` |

### Debugging Workflow

```
1. Check status     → docker compose ps
2. Read logs        → docker compose logs --tail=50 backend
3. Check env vars   → docker compose exec backend env | grep DATABASE
4. Go inside        → docker compose exec backend bash
5. Restart          → docker compose restart backend
6. Full reset       → docker compose down && docker compose up --build
```

---

## 6. Deployment Pipeline (Production)

### The Flow

```
You push code (git push)
     │
     ▼
Jenkins (click "Build Now")
     │
     ├── Pulls latest code from Git
     ├── docker build -f Dockerfile.backend  → backend image
     ├── docker build -f Dockerfile.frontend → frontend image
     ├── docker push (uploads images to registry)
     └── kubectl apply (deploys to Kubernetes)
            │
            ▼
       Kubernetes pulls new images
       Stops old containers, starts new ones
       Runs migrations, connects to PostgreSQL
       Routes traffic via Ingress
       ✅ Users see the update
```

### Step by Step

1. **Push code:** `git push origin kube`
2. **Open Jenkins UI** in browser (ask team for the URL)
3. **Find your project** (listed as a job/pipeline)
4. **Click "Build Now"**
5. **Watch "Console Output"** for success/failure
6. Green ✅ = deployed, Red ❌ = read the error log

### Key Differences: Local vs Production

| | Local (docker compose) | Production (Kubernetes) |
|--|----------------------|------------------------|
| Database | Local PostgreSQL container | Managed PostgreSQL (persistent) |
| Frontend API URL | `http://localhost:8000` | Production backend URL |
| Start command | `docker compose up` | `kubectl apply -f ...` (Jenkins does this) |
| Env vars stored in | `docker-compose.yml` | Kubernetes Secrets & ConfigMaps |

---

## 7. How Credentials Work

### Locally (docker-compose.yml)
Credentials are plain text in the file — fine for local dev:
```yaml
POSTGRES_USER: newsadmin
POSTGRES_PASSWORD: newsadmin123
DATABASE_URL: postgres://newsadmin:newsadmin123@db:5432/news_portal
```

### Production (Kubernetes Secrets)
Credentials are stored securely in the cluster:
```bash
# Created once by DevOps team
kubectl create secret generic db-credentials \
  --from-literal=DATABASE_URL=postgres://user:pass@host:5432/dbname

# AI Rewriter Key (Groq)
kubectl create secret generic groq-credentials \
  --from-literal=GROQ_API_KEY=gsk_XXX

# Referenced in deployment YAML
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: DATABASE_URL
  - name: GROQ_API_KEY
    valueFrom:
      secretKeyRef:
        name: groq-credentials
        key: GROQ_API_KEY
  - name: GROQ_MODEL
    value: "openai/gpt-oss-120b"
```

### Jenkins
Credentials for Git, Docker registry, and Kubernetes access are stored in:
```
Jenkins UI → Manage Jenkins → Credentials
```

**Rule:** Never hardcode production passwords in code. They're injected as environment variables at runtime.

---

## 8. Database — What Happens on Each Build

### Short Answer: Data is NEVER lost on a new build.

```
What gets REBUILT (new image):        What PERSISTS (never touched):
✅ Your Python/Node code              ✅ All database records
✅ Your dependencies                  ✅ Users, articles, templates
✅ Your static files                  ✅ Uploaded media files
```

### The Flow on Each Build

1. Jenkins builds new Docker image → code only, no database
2. Kubernetes deploys new image → old container stops, new one starts
3. `python manage.py migrate` runs → applies schema changes (additive only)
4. App connects to the same PostgreSQL → all data intact

### Locally with Docker

- Data is stored in a **Docker volume** (`pg_data`)
- `docker compose down` → data safe ✅
- `docker compose down -v` → data DELETED ⚠️ (the `-v` flag removes volumes)

---

## 9. Common Errors & Fixes

### Build Errors

| Error | Fix |
|-------|-----|
| `Read timed out` during pip install | Slow internet — retry: `docker compose up --build` |
| `npm ci` fails | Delete `package-lock.json`, run `npm install`, commit, rebuild |
| `COPY failed: file not found` | Make sure build context is project root (check docker-compose.yml) |

### Runtime Errors

| Error | Fix |
|-------|-----|
| Frontend shows blank / API errors | Check `NEXT_PUBLIC_API_URL` in docker-compose.yml build args |
| Backend `500 Internal Server Error` | Check logs: `docker compose logs backend` |
| `DisallowedHost` | Add the domain to `ALLOWED_HOSTS` env var |
| `CORS error` in browser console | Check `CORS_ALLOW_ALL_ORIGINS` in settings.py |
| Database connection refused | Make sure `db` service is healthy: `docker compose ps` |
| Migrations not applied | Run: `docker compose exec backend python manage.py migrate` |

### Production-Specific

| Error | Fix |
|-------|-----|
| `ImagePullBackOff` in Kubernetes | Docker image not found in registry — check Jenkins push step |
| `CrashLoopBackOff` | Pod keeps crashing — check logs: `kubectl logs <pod-name>` |
| `NEXT_PUBLIC_API_URL` wrong in prod | Must be set as build arg in Jenkins — it's baked into the Next.js build |

---

## 10. Kubernetes Commands (Production Server)

Use these after SSHing into the production server.

```bash
# SSH into server
ssh username@server-ip

# List all pods
kubectl get pods
kubectl get pods -n <namespace>

# See pod details
kubectl describe pod <pod-name>

# View logs
kubectl logs <pod-name>
kubectl logs <pod-name> --tail=100
kubectl logs <pod-name> -f              # follow in real-time

# Go inside a pod
kubectl exec -it <pod-name> -- bash

# Restart a deployment
kubectl rollout restart deployment <name>

# Check services
kubectl get services

# Check environment variables
kubectl describe pod <pod-name> | grep -A 20 "Environment"
```

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **Docker Image** | Packaged snapshot of your app + all dependencies |
| **Docker Container** | A running instance of a Docker image |
| **Dockerfile** | Recipe that tells Docker how to build an image |
| **docker-compose** | Tool to run multiple containers locally with one command |
| **Kubernetes (K8s)** | Production system that runs and manages containers |
| **kubectl** | Command-line tool to talk to Kubernetes |
| **Pod** | Smallest K8s unit — usually one running container |
| **Deployment** | K8s object that manages pods |
| **Service** | K8s networking — gives pods a stable address |
| **Ingress** | Routes external traffic to services |
| **ConfigMap** | K8s non-secret configuration storage |
| **Secret** | K8s encrypted credential storage |
| **Jenkins** | Automation server that builds and deploys your code |
| **Gunicorn** | Production Python web server (replaces `manage.py runserver`) |
| **WhiteNoise** | Serves static files in production Django |
| **Volume** | Persistent storage for containers (survives restarts) |
| **SSH** | Secure Shell — remote login to a server |
| **Registry** | Storage for Docker images (like Docker Hub) |
