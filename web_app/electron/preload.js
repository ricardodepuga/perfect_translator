import { contextBridge } from 'electron';

// We use contextBridge to safely expose specific Node.js APIs to the renderer
// However, our React app talks to Python via fetch('http://localhost:8000') 
// so we don't strictly need to expose anything yet.

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => 'pong'
});
