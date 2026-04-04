import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true
    }
  });

  const svgContent = fs.readFileSync(path.join(__dirname, 'public', 'favicon.svg'), 'utf8');
  const html = `<html><body style="margin:0; overflow:hidden; display:flex; justify-content:center; align-items:center; width:512px; height:512px; background: transparent;">
    ${svgContent.replace('<svg ', '<svg width="512" height="512" ')}
  </body></html>`;
  
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  setTimeout(async () => {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'public', 'icon.png'), image.toPNG());
    console.log('Saved public/icon.png !');
    app.quit();
  }, 1000);
});
