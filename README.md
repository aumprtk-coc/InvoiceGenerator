# InvoiceGenerator

This repository contains a FastAPI backend and a React frontend. The easiest way to run the full stack locally is with Docker Compose (no need to install Python/Node locally).

## Run with Docker (recommended)

Prerequisites: Docker Desktop installed and running.

From the repository root:

```powershell
docker compose up --build
```

This will start:
- MongoDB on port 27017
- Backend (FastAPI) on port 8000 -> http://localhost:8000/api/
- Frontend (React dev server) on port 3000 -> http://localhost:3000

To stop and remove containers:

```powershell
docker compose down -v
```

## Run locally without Docker (optional)

1. Backend

```powershell
cd .\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
# ensure .env is configured (MONGO_URL, DB_NAME, SMTP_USER, SMTP_PASSWORD)
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

2. Frontend

```powershell
cd .\frontend
npm install
npm start
```

The frontend expects the backend at http://localhost:8000 (CORS origins configured in `backend/.env`).

## Pushing changes

Standard git workflow applies:

```powershell
git add -A
git commit -m "Add Docker support and run instructions"
git push origin main
```

