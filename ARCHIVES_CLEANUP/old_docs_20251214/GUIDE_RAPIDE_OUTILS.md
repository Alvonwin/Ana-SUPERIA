# GUIDE RAPIDE - OUTILS ANA (Mode Opérationnel)
**3 outils essentiels par catégorie + cas d'usage**

---

## FICHIERS - Essentiels
```
read_file     → Lire un fichier
edit_file     → Modifier (search/replace)
grep          → Chercher dans fichiers
```
**Flux type:** `grep "TODO" → read_file → edit_file`

---

## CODE - Essentiels
```
run_shell     → Commande système
execute_code  → Python rapide
ask_groq      → Question complexe (Llama 70B)
```
**Flux type:** `run_shell "npm test" → execute_code (fix) → run_shell "npm test"`

---

## GIT - Essentiels
```
git_status    → État actuel
git_commit    → Sauvegarder
git_log       → Historique
```
**Flux type:** `git_status → (modifications) → git_commit "message"`

---

## WEB - Essentiels
```
web_search    → Recherche DuckDuckGo
get_weather   → Météo
http_request  → API externe
```
**Flux type:** `web_search "React error X" → web_fetch (doc)`

---

## VISION - Essentiels
```
describe_image      → Analyser image
debug_screenshot    → Analyser erreur
analyze_code_screenshot → OCR code
```
**Flux type:** `debug_screenshot → (solution) → edit_file`

---

## MÉMOIRE/RAG - Essentiels
```
search_memory     → Chercher conversation passée
search_codebase   → Chercher dans code projet
save_memory       → Sauvegarder info importante
```
**Flux type:** `search_codebase "auth" → read_file → edit_file`

---

## ARCHITECT - Essentiels
```
ask_architect   → Plan d'implémentation
review_code     → Révision qualité
```
**Flux type:** `ask_architect "nouvelle feature" → (plan) → exécution`

---

# WORKFLOWS COMPLETS

## Debug React/Firebase
```
1. debug_screenshot (capture erreur)
2. search_codebase "firebase"
3. read_file (fichier concerné)
4. ask_groq "comment fix cette erreur..."
5. edit_file (appliquer fix)
6. run_shell "npm start"
```

## Nouvelle Feature
```
1. ask_architect "implémenter X"
2. get_project_structure
3. search_codebase (patterns existants)
4. write_file (nouveau code)
5. git_status → git_commit
6. review_code (validation)
```

## Extraction RAG
```
1. get_project_structure
2. search_codebase "keyword"
3. read_file (fichiers pertinents)
4. save_memory (synthèse)
```

## Voice Coding
```
1. execute_voice_command "git status"
2. execute_voice_command "cherche TODO dans src"
3. execute_voice_command "commit ajout feature X"
```

---

# PRÉREQUIS

| Composant | Version | Vérification |
|-----------|---------|--------------|
| Node.js | 18+ | `node --version` |
| Python | 3.10+ | `python --version` |
| Ollama | Latest | `ollama list` |
| Git | 2.x | `git --version` |

**Modèles Ollama requis:**
- `qwen2.5-coder:7b` (principal)
- `llama3.2-vision:11b` (vision)
- `llama3.1:8b` (fallback)

**Services:**
- Ana Server: `http://localhost:3338`
- Ollama: `http://localhost:11434`
- ComfyUI: `http://localhost:8188` (optionnel, génération images)

---

# RACCOURCIS VOCAUX

| Commande vocale | Outil déclenché |
|-----------------|-----------------|
| "git status" | git_status |
| "quelle heure" | get_time |
| "météo à Longueuil" | get_weather |
| "cherche X sur le web" | web_search |
| "lis le fichier X" | read_file |
| "cherche X dans Y" | grep |
| "structure du projet" | get_project_structure |
| "npm install" | run_shell |

---

*Guide rapide - 46 outils / 10 catégories*
