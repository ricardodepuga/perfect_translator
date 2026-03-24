import os
import asyncio
from openai import OpenAI
from dotenv import load_dotenv
import speech_recognition as sr
from pydub import AudioSegment

load_dotenv()

class AudioService:
    def __init__(self):
        self.provider = os.getenv("STT_PROVIDER", "openai")
        if self.provider == "openai":
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        elif self.provider == "google_free":
            self.recognizer = sr.Recognizer()

    async def transcribe(self, file_path: str, language: str = None):
        """
        Transcribes audio file using OpenAI Whisper, Mock, or Google Free.
        Returns text and detected language.
        """
        print(f"AudioService: Using provider '{self.provider}'")
        
        if self.provider == "mock":
            await asyncio.sleep(2) # Simulate processing time
            return {
                "text": "Isto é uma transcrição de teste gerada pelo modo Mock. O sistema de áudio está a funcionar.",
                "language": "pt"
            }

        if self.provider == "google_free":
            return await self._transcribe_google_free(file_path, language)

        try:
            with open(file_path, "rb") as audio_file:
                # If language is auto or None, let Whisper detect
                # If language is specific (e.g. "pt"), pass it
                kwargs = {"model": "whisper-1", "file": audio_file}
                if language and language != "auto":
                     kwargs["language"] = language

                transcript = self.client.audio.transcriptions.create(
                    **kwargs,
                    response_format="verbose_json"
                )
                
                return {
                    "text": transcript.text,
                    "language": transcript.language
                }
        except Exception as e:
            print(f"Error in transcription: {e}")
            raise e

    async def _transcribe_google_free(self, file_path: str, language: str = None):
        """
        Uses SpeechRecognition library (Google Web Speech API).
        Requires file conversion to WAV.
        """
        wav_path = file_path + ".wav"
        try:
            # Convert WebM/MP3 to WAV for SpeechRecognition
            audio = AudioSegment.from_file(file_path)
            audio.export(wav_path, format="wav")

            with sr.AudioFile(wav_path) as source:
                audio_data = self.recognizer.record(source)
                
                # Default to PT if auto, or use provided language
                lang_code = "pt-PT" 
                if language and language != "auto":
                    # Simple mapping, Google uses full codes (pt-PT, ja-JP, en-US)
                    if language == "ja": lang_code = "ja-JP"
                    elif language == "en": lang_code = "en-US"
                    elif language == "pt": lang_code = "pt-PT"
                
                # Google Web Speech API (free)
                text = self.recognizer.recognize_google(audio_data, language=lang_code)
                print(f"Google Free STT Result: {text}")
                
                # Cleanup
                if os.path.exists(wav_path):
                    os.remove(wav_path)

                return {
                    "text": text,
                    # Google API doesn't return detected language easily in free mode, 
                    # so we assume it was the one requested or PT default
                    "language": language if language and language != "auto" else "pt" 
                }
        except sr.UnknownValueError:
            return {"text": "", "language": "unknown"}
        except Exception as e:
            print(f"Google Free STT Error: {e}")
            raise e
        finally:
             if os.path.exists(wav_path):
                    os.remove(wav_path)
