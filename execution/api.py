from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from execution.services.audio_service import AudioService
from execution.services.translation_service import TranslationService
from pydantic import BaseModel
from typing import Optional
import os

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

class TranslationRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "ja"
    use_pivot: bool = True

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Perfect Translator API is running"}

@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    try:
        # Save temp file
        temp_filename = f".tmp/{file.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(await file.read())
        
        result = await audio_service.transcribe(temp_filename, language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup could happen here
        pass

@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        result = await translation_service.translate(
            request.text, 
            request.source_lang, 
            request.target_lang,
            request.use_pivot
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
