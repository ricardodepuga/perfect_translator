/* global process */
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
// Since package.json is "type": "module", we must define __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let pythonProcess = null;

const createPythonSidecar = () => {
  if (pythonProcess) return;

  // Determine path to backend relative to app state
  if (!app.isPackaged) {
    // Development mode: spawn raw python from parent directory
    const projectRoot = path.resolve(__dirname, '../../');
    const pythonExecutable = path.join(projectRoot, 'venv/bin/python');
    console.log(`[Electron] Starting dev python sidecar module from root: ${projectRoot}`);
    // Run as module to preserve 'execution.' import paths!
    pythonProcess = spawn(pythonExecutable, ['-m', 'execution.api'], {
      stdio: 'inherit',
      cwd: projectRoot
    });
  } else {
    // Production mode: run bundled pyinstaller binary
    // We'll configure electron-builder to copy it to resourcesPath
    const bundledApiDir = path.join(process.resourcesPath, 'bin');
    // Let's assume we name the output binary simply 'api' when packaging
    const binaryPath = path.join(bundledApiDir, 'api');
    console.log(`[Electron] Starting bundled python sidecar: ${binaryPath}`);
    pythonProcess = spawn(binaryPath, [], { stdio: 'inherit' });
  }

  if (pythonProcess) {
    pythonProcess.on('close', (code) => {
      console.log(`[Electron] Python sidecar exited with code ${code}`);
      pythonProcess = null;
    });
  }
};

const quitPythonSidecar = () => {
  if (pythonProcess) {
    console.log('[Electron] Killing python sidecar...');
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (!app.isPackaged) {
    // In dev, Vite runs on localhost:5173
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load built HTML
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  // Start Python backend
  createPythonSidecar();

  // Start Web GUI
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Important: When Electron quits gracefully, we MUST kill the python sidecar
app.on('before-quit', () => {
  quitPythonSidecar();
});
