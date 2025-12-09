# API Reference Ana

**Backend Port**: 3338
**Base URL**: http://localhost:3338

---

## Health & Status

### GET /health
Vérifie l'état du serveur.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-25T19:00:00.000Z"
}
```

### GET /api/stats
Statistiques du système.

---

## Chat

### POST /api/chat
Envoie un message à Ana.

**Body:**
```json
{
  "message": "Hello Ana",
  "model": "phi3:mini-128k",
  "stream": false
}
```

### POST /api/chat/v2
Chat avec orchestrator multi-LLM et failover automatique.

**Body:**
```json
{
  "prompt": "Écris une fonction Python",
  "taskType": "coding"
}
```

---

## LLMs

### GET /api/llms
Liste des LLMs disponibles.

### GET /api/orchestrator/stats
Statistiques de l'orchestrator.

### GET /api/orchestrator/models
Info sur les modèles configurés.

---

## Memory

### GET /api/memory/search
Recherche dans la mémoire.

**Query:** `?query=recherche&limit=10`

### POST /api/memory/save
Sauvegarde une mémoire.

---

## Tools

### POST /api/tools/execute
Exécute un outil.

**Body:**
```json
{
  "tool": "read_file",
  "params": {
    "path": "E:/ANA/README.md"
  }
}
```

**Outils disponibles:**
- `read_file` - Lire fichier
- `write_file` - Écrire fichier
- `edit_file` - Modifier fichier
- `list_dir` - Lister dossier
- `bash` - Exécuter commande
- `search` - Rechercher fichiers
- `git_status` - Status git

---

## Creative

### GET /api/comfyui/status
État de ComfyUI.

### POST /api/comfyui/generate
Génère une image.

### GET /api/fooocus/status
État de Fooocus.

---

## VRAM

### GET /api/vram/stats
Statistiques utilisation VRAM.

---

## n8n

### GET /api/n8n/status
État de n8n.

### GET /api/n8n/webhooks
Liste des webhooks enregistrés.

### POST /api/n8n/trigger
Déclenche un webhook.

---

## Agents

### GET /api/agents/status
État des agents.

### GET /api/agents/list
Liste tous les agents.

---

## WebSocket Events

**Endpoint:** ws://localhost:3338

### Events:
- `chat:message` - Nouveau message
- `chat:stream` - Chunk de streaming
- `agent:event` - Événement agent
- `error` - Erreur

---

*Documentation générée: 25 Novembre 2025*
