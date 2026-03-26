# Worker Service

## Run locally

```bash
cd apps/worker
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Purpose
- Background scoring and enrichment jobs
- Future crawler and notifier workers
- Can be connected to queue events emitted by web app
