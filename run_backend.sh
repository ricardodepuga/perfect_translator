#!/bin/bash
echo "Stopping existing backend on port 8000..."
# Try to kill existing process on port 8000. Swallow errors if no process found.
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo "Starting new backend..."
source venv/bin/activate
uvicorn execution.api:app --reload --host 0.0.0.0 --port 8000
