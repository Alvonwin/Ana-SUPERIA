#!/usr/bin/env python3
"""
Ana Whisper STT Service
Service de transcription vocale Whisper Medium pour Ana
Port: 5001 (ne pas confondre avec Voice_Platform sur 5000)

Usage:
    python whisper_stt.py

Endpoint:
    POST /transcribe - Envoyer audio (webm/wav) et recevoir texte
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
from pathlib import Path

# Add ffmpeg to PATH
FFMPEG_PATH = r"E:\ANA\services\whisper\ffmpeg\bin"
if FFMPEG_PATH not in os.environ.get("PATH", ""):
    os.environ["PATH"] = FFMPEG_PATH + os.pathsep + os.environ.get("PATH", "")
    print(f"[Ana Whisper] Added ffmpeg to PATH: {FFMPEG_PATH}")

app = Flask(__name__)
CORS(app)

# Configuration
WHISPER_MODEL = "openai/whisper-medium"  # Bon compromis vitesse/qualite
PORT = 5001

# Global model instance (lazy loaded)
stt_model = None


def load_stt():
    """Load Whisper STT model"""
    global stt_model
    if stt_model is None:
        print("[Ana Whisper] Loading Whisper Medium...")
        from transformers import pipeline
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[Ana Whisper] Using device: {device}")

        stt_model = pipeline(
            "automatic-speech-recognition",
            model=WHISPER_MODEL,
            device=device,
            generate_kwargs={"language": "french", "task": "transcribe"}
        )
        print("[Ana Whisper] Whisper loaded successfully")
    return stt_model


@app.route('/')
def home():
    """Health check"""
    return jsonify({
        "status": "running",
        "service": "Ana Whisper STT",
        "model": WHISPER_MODEL,
        "endpoint": "/transcribe"
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Ana Whisper STT",
        "model": WHISPER_MODEL
    })


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Voice-to-Text endpoint for Ana"""
    print("[Ana Whisper] === TRANSCRIBE REQUEST ===")

    # Accept audio file or raw audio data
    if 'audio' in request.files:
        audio_file = request.files['audio']
        filename = audio_file.filename or 'audio.webm'
    elif request.data:
        # Raw audio data in request body
        audio_file = request.data
        filename = 'audio.webm'
    else:
        print("[Ana Whisper] ERROR: No audio file in request")
        return jsonify({"error": "No audio file provided"}), 400

    # Determine file extension
    ext = '.webm' if 'webm' in str(filename).lower() else '.wav'

    # Save temporarily
    temp_input = tempfile.mktemp(suffix=ext)
    temp_wav = tempfile.mktemp(suffix='.wav')

    try:
        # Save input file
        if hasattr(audio_file, 'save'):
            audio_file.save(temp_input)
        else:
            with open(temp_input, 'wb') as f:
                f.write(audio_file)

        print(f"[Ana Whisper] Audio saved: {temp_input}")

        # Convert to wav if needed (webm -> wav)
        if ext == '.webm':
            import subprocess
            print(f"[Ana Whisper] Converting webm to wav...")
            result = subprocess.run([
                'ffmpeg', '-i', temp_input,
                '-ar', '16000',  # Sample rate 16kHz (optimal for Whisper)
                '-ac', '1',      # Mono
                '-y',            # Overwrite output file
                temp_wav
            ], check=True, capture_output=True)
            audio_path = temp_wav
            print(f"[Ana Whisper] Conversion successful")
        else:
            audio_path = temp_input

        # Load STT model
        stt = load_stt()

        # Transcribe
        print(f"[Ana Whisper] Transcribing...")
        result = stt(audio_path)

        # Extract text from result
        if isinstance(result, dict):
            text = result.get("text", "").strip()
        elif isinstance(result, list) and len(result) > 0:
            text = result[0].get("text", "").strip() if isinstance(result[0], dict) else str(result[0]).strip()
        else:
            text = str(result).strip()

        print(f"[Ana Whisper] Transcription: {text}")

        # Cleanup
        if os.path.exists(temp_input):
            os.remove(temp_input)
        if os.path.exists(temp_wav):
            os.remove(temp_wav)

        return jsonify({
            "text": text,
            "success": True
        })

    except Exception as e:
        import traceback
        print(f"[Ana Whisper] ERROR: {str(e)}")
        print(traceback.format_exc())

        # Cleanup on error
        if os.path.exists(temp_input):
            os.remove(temp_input)
        if os.path.exists(temp_wav):
            os.remove(temp_wav)

        return jsonify({"error": str(e), "success": False}), 500


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("  ANA WHISPER STT SERVICE")
    print("  Whisper Medium - French Speech-to-Text")
    print("=" * 60 + "\n")

    print(f"Server starting on http://localhost:{PORT}")
    print("\nEndpoints:")
    print("  - GET  /            Health check")
    print("  - GET  /health      Health check")
    print("  - POST /transcribe  Voice -> Text")
    print("\nPress CTRL+C to stop\n")

    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
