#!/bin/bash
set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Activate virtual environment
source venv/bin/activate

# Build the executable using PyInstaller
echo "Building Python sidecar..."
pyinstaller --name api --onefile --clean \
    --paths . \
    --hidden-import uvicorn \
    --hidden-import fastapi \
    --hidden-import openai \
    --hidden-import pydantic \
    --hidden-import multipart \
    --hidden-import python-multipart \
    execution/api.py

# Tauri target triple
TARGET="aarch64-apple-darwin"

# Create bin directory for tauri sidecars if it doesn't exist
mkdir -p web_app/src-tauri/bin

# Copy the executable with the Tauri expected naming convention
cp dist/api "web_app/src-tauri/bin/api-${TARGET}"
chmod +x "web_app/src-tauri/bin/api-${TARGET}"

echo "Sidecar successfully built and copied to web_app/src-tauri/bin/api-${TARGET}"
