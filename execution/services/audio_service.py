import os
import asyncio
from openai import OpenAI
from dotenv import load_dotenv
from pydub import AudioSegment

load_dotenv()

class AudioService:
    def __init__(self):
        self.provider = "openai"
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "not-provided"))

    async def transcribe(self, file_path: str, language: str = None):
        """
        Transcribes audio file using OpenAI Whisper, Mock, or Google Free.
        Returns text and detected language.
        """
        print(f"AudioService: Using provider '{self.provider}'")

        try:
            from pydub import AudioSegment
            import os

            # Always normalize strictly to WAV since Chromium MediaRecorder WEBM chunks often lack strict duration headers that OpenAI SDK FFmpeg rejects
            wav_path = file_path + ".wav"
            try:
                audio = AudioSegment.from_file(file_path)
                audio.export(wav_path, format="wav")

                with open(wav_path, "rb") as audio_file:
                    kwargs = {
                        "model": "whisper-1", 
                        "file": audio_file
                    }
                    if language:
                         kwargs["language"] = language

                    transcript = self.client.audio.transcriptions.create(
                        **kwargs,
                        response_format="verbose_json"
                    )
                    
                    return {
                        "text": transcript.text,
                        "language": transcript.language
                    }
            finally:
                if os.path.exists(wav_path):
                    os.remove(wav_path)
        except Exception as e:
            print(f"Error in transcription: {e}")
            raise e


