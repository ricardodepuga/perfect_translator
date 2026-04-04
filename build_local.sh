#!/bin/bash
set -e
echo "Building Python Backend..."
cd /Users/ricardopuga/Projects/perfect_translator
source venv/bin/activate
cd execution
pip install pyinstaller
pyinstaller --name api --onefile --hidden-import="websockets" --hidden-import="fastapi" --hidden-import="uvicorn" api.py
echo "Copying to bin..."
mkdir -p ../web_app/bin
cp dist/api ../web_app/bin/api
chmod +x ../web_app/bin/api
echo "Building Electron app..."
cd ../web_app
npm run package
echo "Done!"
