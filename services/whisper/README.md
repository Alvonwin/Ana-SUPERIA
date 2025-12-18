# Ana Whisper STT Service

Service de transcription vocale Whisper Medium pour Ana.

## Port

- **5001** (ne pas confondre avec Voice_Platform sur 5000)

## Installation

```bash
cd E:\ANA\services\whisper
pip install -r requirements.txt
```

## Demarrage

Double-cliquer sur `START_WHISPER.bat` ou:

```bash
python whisper_stt.py
```

## Endpoints

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check |
| POST | `/transcribe` | Transcription audio -> texte |

## Usage

### Test health check

```bash
curl http://localhost:5001/health
```

### Transcription

```bash
curl -X POST -F "audio=@fichier.wav" http://localhost:5001/transcribe
```

Reponse:
```json
{
  "text": "Texte transcrit",
  "success": true
}
```

## Structure

```
E:\ANA\services\whisper\
  whisper_stt.py      # Service Flask
  requirements.txt    # Dependances Python
  START_WHISPER.bat   # Script demarrage Windows
  README.md           # Documentation
  ffmpeg/             # ffmpeg pour conversion audio
    bin/
    doc/
    presets/
```

## Configuration

- **Modele**: openai/whisper-medium (bon compromis vitesse/qualite)
- **Langue**: Francais (force)
- **Device**: GPU (CUDA) si disponible, sinon CPU
