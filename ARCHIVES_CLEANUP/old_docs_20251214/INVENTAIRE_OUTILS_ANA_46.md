# INVENTAIRE COMPLET DES OUTILS ANA SUPERIA
**Date**: 10 Décembre 2025
**Total**: 46 outils

---

## WEB (5 outils)
| Outil | Description |
|-------|-------------|
| `web_search` | Recherche d'information générale sur le web (DuckDuckGo) |
| `get_weather` | Obtenir la météo actuelle pour une ville donnée |
| `web_fetch` | Récupérer le contenu d'une page web |
| `wikipedia` | Rechercher sur Wikipedia FR |
| `http_request` | Faire une requête HTTP GET/POST vers une URL |

---

## FICHIERS (10 outils)
| Outil | Description |
|-------|-------------|
| `read_file` | Lire un fichier texte sur le disque |
| `search_in_file` | Rechercher un pattern (regex) dans un fichier |
| `read_file_chunk` | Lire une portion spécifique d'un fichier (lignes X à Y) |
| `file_info` | Obtenir des informations sur un fichier (taille, lignes) |
| `write_file` | Écrire du contenu dans un fichier |
| `list_files` | Lister les fichiers d'un répertoire |
| `edit_file` | Modifier un fichier en remplaçant une chaîne par une autre |
| `glob` | Trouver des fichiers par pattern (ex: *.js, **/*.ts) |
| `grep` | Chercher du texte ou regex dans les fichiers |
| `notebook_edit` | Éditer un notebook Jupyter (.ipynb) |

---

## CODE & EXÉCUTION (4 outils)
| Outil | Description |
|-------|-------------|
| `run_shell` | Exécuter une commande shell |
| `ask_groq` | Poser une question à Groq (ultra-rapide, Llama 70B) |
| `ask_cerebras` | Poser une question à Cerebras (le plus rapide, ~1000 tokens/s) |
| `execute_code` | Exécuter du code Python et retourner le résultat |

---

## GIT (4 outils) - *Phase 2*
| Outil | Description |
|-------|-------------|
| `git_status` | Obtenir le statut git (fichiers modifiés, branche actuelle) |
| `git_commit` | Committer les changements avec un message descriptif |
| `git_log` | Voir historique des commits |
| `git_branch` | Lister ou créer des branches |

---

## RAG / CODEBASE (2 outils) - *Phase 2*
| Outil | Description |
|-------|-------------|
| `search_codebase` | Rechercher dans le code source d'un projet (fichiers, fonctions, classes) |
| `get_project_structure` | Obtenir la structure arborescente d'un projet |

---

## VISION (6 outils) - *Phase 3*
| Outil | Description |
|-------|-------------|
| `generate_image` | Générer une image à partir d'un prompt texte via ComfyUI |
| `image_to_image` | Transformer une image existante avec un nouveau prompt |
| `inpaint_image` | Retoucher une zone spécifique d'une image (inpainting) |
| `describe_image` | Analyser et décrire une image en détail (llama3.2-vision) |
| `debug_screenshot` | Analyser une capture d'écran d'erreur et proposer des solutions |
| `analyze_code_screenshot` | Extraire et analyser du code depuis une capture d'écran |

---

## VOICE CODING (1 outil) - *Phase 3*
| Outil | Description |
|-------|-------------|
| `execute_voice_command` | Parser et exécuter une commande vocale de coding |

**Commandes vocales supportées:**
- "git status", "git commit [message]", "git log", "branches git"
- "lis le fichier X", "liste les fichiers", "cherche X dans Y"
- "quelle heure", "météo à X", "cherche sur le web X"
- "tu te rappelles X", "note que X"
- "analyse cette image", "debug ce screenshot"
- "npm install", "npm run X", "lance la commande X"

---

## ARCHITECT MODE (2 outils) - *Phase 3*
| Outil | Description |
|-------|-------------|
| `ask_architect` | Demander à l'architecte d'analyser une demande et créer un plan d'implémentation |
| `review_code` | Demander à l'architecte de réviser du code et suggérer des améliorations |

---

## MÉMOIRE (2 outils)
| Outil | Description |
|-------|-------------|
| `search_memory` | Rechercher dans ma mémoire des conversations passées avec Alain |
| `save_memory` | Sauvegarder une information importante en mémoire |

---

## GÉNÉRATION MÉDIA (2 outils)
| Outil | Description |
|-------|-------------|
| `generate_animation` | Générer un GIF animé via AnimateDiff (ComfyUI) |
| `generate_video` | Générer une vidéo via Mochi (ComfyUI) |

---

## AUTRES (8 outils)
| Outil | Description |
|-------|-------------|
| `get_time` | Obtenir l'heure et la date actuelles du système |
| `ask_user` | Poser une question à Alain et attendre sa réponse |
| `run_background` | Exécuter une commande en arrière-plan (tâches longues) |
| `kill_process` | Arrêter un processus par son PID ou nom |
| `todo_write` | Gérer ma liste de tâches persistante |
| `plan_mode` | Entrer en mode planification pour tâches complexes |
| `get_yt_transcript` | Obtenir la transcription d'une vidéo YouTube |
| `launch_agent` | Lancer un sous-agent spécialisé pour une tâche |

---

# RÉSUMÉ PAR CATÉGORIE

| Catégorie | Nombre |
|-----------|--------|
| Fichiers | 10 |
| Autres | 8 |
| Vision | 6 |
| Web | 5 |
| Code & Exécution | 4 |
| Git | 4 |
| RAG | 2 |
| Mémoire | 2 |
| Génération Média | 2 |
| Architect | 2 |
| Voice | 1 |
| **TOTAL** | **46** |

---

# FICHIERS SOURCES

| Fichier | Description |
|---------|-------------|
| `E:/ANA/server/agents/tool-agent.cjs` | Définitions et implémentations des 46 outils |
| `E:/ANA/server/core/git-manager.cjs` | Module Git (Phase 2) |
| `E:/ANA/server/core/project-indexer.cjs` | Module RAG (Phase 2) |
| `E:/ANA/server/core/voice-command-parser.cjs` | Parser commandes vocales (Phase 3) |
| `E:/ANA/server/agents/architect-agent.cjs` | Agent architecte (Phase 3) |
| `E:/ANA/intelligence/vision/llama_vision_handler.cjs` | Handler Vision (llama3.2-vision) |

---

*Généré automatiquement - OPÉRATION ANA CODE complétée*
