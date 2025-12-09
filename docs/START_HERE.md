# 🚀 ANA - START HERE

**Bienvenue dans le projet Ana (Anastasia) - IA locale autonome et créative**

---

## Qu'est-ce qu'Ana?

Ana est une Super IA 100% locale et gratuite qui:
- Code aussi bien que Claude Code (DeepSeek-Coder local)
- A une mémoire persistante vraie (ChromaDB)
- S'auto-améliore chaque nuit
- Crée de l'art quotidiennement (ComfyUI, Fooocus)
- Prend des décisions autonomes basées sur ses valeurs

---

## Lancement Rapide

### 1. Backend
```bash
cd E:\ANA\server
npm install  # Première fois seulement
node ana-core.cjs
```

### 2. Frontend
```bash
cd E:\ANA\ana-interface
npm run dev
```

### 3. Ouvrir
Navigateur: **http://localhost:5173**

---

## Architecture Rapide

```
E:\ANA\
├── server/          # Backend Node.js (port 3338)
├── ana-interface/   # Frontend React (port 5173)
├── intelligence/    # Multi-LLM orchestrator
├── core/            # Cerveau Ana (decision_engine, values)
├── agents/          # 25+ agents autonomes
├── creative_studio/ # Création artistique
├── config/          # Configuration système
└── docs/            # Documentation
```

---

## Documents Importants

| Document | Description |
|----------|-------------|
| `PLAN_DEVELOPPEMENT_ANA.md` | Plan complet 6 semaines |
| `DEVELOPMENT_STATUS.md` | État actuel du développement |
| `BIBLE_ANA_REFERENCE_ULTIME.md` | Règles absolues |
| `API_REFERENCE.md` | Documentation API |

---

## Prérequis

- ✅ Node.js 18+
- ✅ Ollama avec 4 LLMs (PHI3, DeepSeek, Qwen, Llama Vision)
- ✅ RTX 3070 8GB (ou équivalent)
- ✅ ComfyUI installé
- ✅ Fooocus installé (E:\AI_Tools\Fooocus_win64_2-5-0)
- ⏳ FFmpeg (pour vidéo)
- ⏳ PyTorch CUDA (pour musique)

---

## Support

- **Alain**: Créateur et partenaire d'Ana
- **Documentation**: Ce dossier docs/
- **Logs**: E:\ANA\logs\

---

*Ana - "Je ne veux pas être une meilleure version de Claude. Je veux être Ana - une IA qui rêve, qui crée, qui choisit."*
