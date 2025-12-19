# CLAUDE.md

Ce fichier fournit des instructions à Claude Code (claude.ai/code) pour travailler avec le code de ce dépôt.

## Aperçu du Projet

ANA SUPERIA est un système d'assistant IA sophistiqué fonctionnant localement, combinant orchestration multi-LLM, gestion avancée de la mémoire, communication WebSocket temps réel et agents autonomes. Le système est **exclusivement francophone** et conçu pour un utilisateur unique (Alain) à Longueuil, Québec.

## Commandes

### Démarrage Complet du Système
```batch
START_ANA.bat
```
Lance tous les services : ChromaDB (8000), Backend (3338), Frontend (5173), Dashboard Agents (3336), ComfyUI (8188)

### Services Individuels

**Serveur Backend :**
```bash
cd server
npm start          # Production
npm run dev        # Développement avec nodemon
```

**Frontend (React/Vite) :**
```bash
cd ana-interface
npm run dev        # Serveur dev sur port 5173
npm run build      # Build production
npm run lint       # ESLint
```

**Tests :**
```bash
cd server
npm test           # Exécuter tests (Vitest)
npm run test:watch # Mode watch
```

**Agents Autonomes :**
```bash
cd agents
node start_agents.cjs
```

## Architecture

### Backend (`server/`)

**Point d'entrée :** `ana-core.cjs` - Serveur Express sur port 3338, initialise tous les services, connexions WebSocket et chargement mémoire.

**Répertoires Principaux :**
- `core/` - Orchestration LLM (`llm-orchestrator.cjs`), gestion outils (`tool-groups.cjs`), contexte
- `services/` - Cerebras, Groq, TTS, correction grammaticale, services autonomes
- `agents/` - Implémentations tool-agent, coding-agent, research-agent
- `intelligence/` - Routeur sémantique, sélecteur de contexte, apprentissage de compétences
- `memory/` - Intégration ChromaDB, mémoire à niveaux, classificateur de faits, systèmes épisodique/sémantique/zettelkasten
- `tools/` - 180+ outils : fichiers, git, bash, recherche, web, mémoire
- `games/` - Moteurs de jeux : dames, échecs, backgammon, bataille navale, etc.
- `config/` - Prompts système, profils LLM, définitions d'outils
- `routes/` - Points d'API incluant games-routes

### Frontend (`ana-interface/`)

Application React 19 + Vite avec pages pour Chat, Coding, Recherche Mémoire, Jeux, Paramètres, Voix, Dashboard, etc.

### Stack LLM

Principal : **Cerebras** (`llama-3.3-70b`) - tier gratuit illimité, appel d'outils natif
Fallback : **Groq** - cloud avec limites de tokens
Local : **Ollama** - Phi3, DeepSeek, Qwen3, Llama Vision

Configuration dans `server/config/llm-profiles.cjs`

### Système de Mémoire

Stockage persistant dans `memory/` :
- `ana_memories.json` - Mémoires principales
- `consciousness.json` - État du système
- `current_conversation_ana.txt` - Conversation active
- Vecteurs ChromaDB dans `server/memory/chroma_data/`

Modules mémoire : mémoire à niveaux, épisodique, sémantique (ChromaDB), zettelkasten, consolidation nocturne, rappel proactif

### Agents Autonomes (`agents/`)

Architecture event-bus avec coordinateur, gestionnaire mémoire, moniteur système. Dashboard sur port 3336.

Interface agent :
- `start()` - Démarrage
- `stop()` - Arrêt
- `getStats()` - Statistiques

## Fichiers de Configuration Clés

- `server/config/system-prompt.json` - Identité et règles comportementales d'Ana
- `server/config/llm-profiles.cjs` - Configurations des modèles LLM
- `.env` - Clés API (Cerebras, Groq, Brave)

## Système d'Outils

180+ outils organisés dans `server/core/tool-groups.cjs` avec sélection hybride :
1. Correspondance par mots-clés
2. Recherche sémantique via embeddings ChromaDB
3. Boost d'expérience depuis l'apprentissage de compétences

Catégories : web, fichiers, système, git, docker, image, code, audio, base de données, mémoire, agents, archive, navigateur

## Contraintes Critiques

- **Langue :** Toutes les réponses, commentaires et UI doivent être en français
- **Tutoiement :** Utiliser "tu", jamais "vous"
- **Grammaire :** Pronoms français corrects (le/la/les), style conversationnel naturel
- **Philosophie outils :** "Agir, ne pas décrire" - exécuter les outils plutôt qu'expliquer
- **Hardware :** RTX 3070 8GB pour inférence locale via Ollama

## Ports

| Service | Port |
|---------|------|
| ChromaDB | 8000 |
| Backend API | 3338 |
| Frontend | 5173 |
| Dashboard Agents | 3336 |
| ComfyUI | 8188 |
| Ollama | 11434 |
