import os
import json
import asyncio
import websockets
from fastapi import WebSocket, WebSocketDisconnect

class RealtimeService:
    def __init__(self):
        # We use the recommended realtime preview model
        self.url = "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5"

    async def handle_connection(self, websocket: WebSocket, source_lang: str, target_lang: str, use_pivot: str = "true"):
        await websocket.accept()
        openai_api_key = os.getenv("OPENAI_API_KEY")

        if not openai_api_key or openai_api_key == "not-provided":
            await websocket.close(code=1008, reason="OpenAI API Key not set")
            return
            
        openai_api_key = openai_api_key.strip()
        print(f"Connecting to Realtime with key: {openai_api_key[:8]}... (len: {len(openai_api_key)})")
        
        headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "OpenAI-Beta": "realtime=v1"
        }

        LANG_MAP = {
            "pt": "Portuguese",
            "en": "English",
            "ja": "Japanese",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian"
        }
        source_name = LANG_MAP.get(source_lang, source_lang)
        target_name = LANG_MAP.get(target_lang, target_lang)

        try:
            async with websockets.connect(self.url, additional_headers=headers) as openai_ws:
                print(f"Connected to OpenAI Realtime API for {source_name} -> {target_name}")
                
                # Determine Instructions based on Pivot configuration
                # Only strictly disable if target is English to avoid paradoxical "translate english to english"
                if use_pivot.lower() == "true" and target_lang != "en":
                    base_instructions = f"You are a fast, real-time audio translator. Whenever the user speaks in {source_name}, you must immediately translate it into {target_name}. To achieve maximum structural accuracy, internally translate the speech into English first, and then translate that English into {target_name}. Speak the final {target_name} translation clearly and provide the transcript. DO NOT output the internal English translation. DO NOT act as a conversational assistant. Only output the direct translation of the user's input without any commentary."
                else:
                    base_instructions = f"You are a fast, real-time audio translator. Whenever the user speaks in {source_name}, you must immediately translate it into {target_name}. Speak the translation clearly and provide the transcript. DO NOT act as a conversational assistant. DO NOT acknowledge or refer to instructions. Only output the direct translation of the user's input without any commentary."

                session_update = {
                    "type": "session.update",
                    "session": {
                        "instructions": base_instructions,
                        "voice": "alloy",
                        "input_audio_format": "pcm16",
                        "output_audio_format": "pcm16",
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.8,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 800
                        },
                        "input_audio_transcription": {
                            "model": "whisper-1"
                        }
                    }
                }
                await openai_ws.send(json.dumps(session_update))

                async def receive_from_client():
                    try:
                        while True:
                            data = await websocket.receive_text()
                            # print("Client -> OpenAI:", data[:50] + "...")
                            await openai_ws.send(data)
                    except WebSocketDisconnect:
                        print("Client disconnected gracefully.")
                    except Exception as e:
                        print(f"Client to OpenAI error: {e}")
                    finally:
                        try:
                            await openai_ws.close()
                        except:
                            pass

                async def receive_from_openai():
                    try:
                        async for msg in openai_ws:
                            msg_dict = json.loads(msg)
                            msg_type = msg_dict.get("type", "")
                            if msg_type not in ["input_audio_buffer.append"]:
                                print(f"OpenAI -> Client: {msg_type}")
                            await websocket.send_text(msg)
                    except websockets.exceptions.ConnectionClosed:
                        print("OpenAI connection closed.")
                    except Exception as e:
                        print(f"OpenAI to Client error: {e}")
                    finally:
                        try:
                            await websocket.close()
                        except:
                            pass

                await asyncio.gather(receive_from_client(), receive_from_openai())

        except Exception as e:
            print(f"WebSocket Relay error: {e}")
            try:
                await websocket.close(code=1011, reason="Relay failed")
            except:
                pass
