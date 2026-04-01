import sys
import os

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from execution.services.audio_service import AudioService
from execution.services.translation_service import TranslationService
from execution.services.realtime_service import RealtimeService
from pydantic import BaseModel
from typing import Optional
import os

# Ensure macOS homebrew paths are available for ffmpeg (pydub) since Tauri sidecars don't inherit the shell's PATH
os.environ["PATH"] += os.pathsep + "/usr/local/bin" + os.pathsep + "/opt/homebrew/bin"

app = FastAPI(title="Perfect Translator API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
audio_service = AudioService()
translation_service = TranslationService()
realtime_service = RealtimeService()

class ConfigRequest(BaseModel):
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None

class TranslationRequest(BaseModel):
    text: str
    source_lang: str = "pt"
    target_lang: str = "ja"
    use_pivot: bool = True

@app.post("/config")
def update_config(config: ConfigRequest):
    global audio_service, translation_service

    if config.openai_api_key is not None:
        os.environ["OPENAI_API_KEY"] = config.openai_api_key
    if config.openai_model is not None:
        os.environ["OPENAI_MODEL"] = config.openai_model

    print("Re-initializing services with new config...")
    audio_service = AudioService()
    translation_service = TranslationService()
    
    return {"status": "ok", "message": "Configuration updated successfully"}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Perfect Translator API is running"}

@app.get("/provider")
def get_provider_info():
    try:
        provider = "openai"
        return {"success": True, "provider": provider}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket, source_lang: str = "pt", target_lang: str = "ja", use_pivot: str = "true"):
    await realtime_service.handle_connection(websocket, source_lang, target_lang, use_pivot)

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form("pt")
):
    temp_file_path = None # Initialize to None
    try:
        import uuid
        # Force .webm extension regardless of frontend filename payload to satisfy OpenAI's strict format parser
        temp_file_path = f"temp_{uuid.uuid4().hex}.webm"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())

        result = await audio_service.transcribe(temp_file_path, language)
        
        return result
    except Exception as e:
        print(f"Backend transcribe error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro STT ({audio_service.provider}): {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/translate")
async def translate_text(request: TranslationRequest):
    try:
        result = await translation_service.translate(
            request.text, 
            request.source_lang, 
            request.target_lang,
            request.use_pivot
        )
        return result
    except Exception as e:
        print(f"Backend translate error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro Tradução ({translation_service.provider}): {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
