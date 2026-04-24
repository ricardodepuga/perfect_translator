import json
print(json.dumps({
    "type": "session.update",
    "session": {
        "input_audio_transcription": {
            "model": "whisper-1",
            "language": "pt"
        }
    }
}))
