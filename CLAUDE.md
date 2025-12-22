# CLAUDE.md

Ce fichier fournit des instructions à Claude Code (claude.ai/code) pour travailler avec le code de ce dépôt.

## Aperçu du Projet

ANA SUPERIA est un système d'assistant IA sophistiqué utilisant Cerebras (llama-3.3-70b), avec gestion avancée de la mémoire, communication WebSocket temps réel et agents autonomes. Le système est **exclusivement francophone** et conçu pour un utilisateur unique (Alain) à Longueuil, Québec.

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
- `services/` - Cerebras, TTS, correction grammaticale, services autonomes
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

**Cerebras** (`llama-3.3-70b`) - tier gratuit illimité, appel d'outils natif

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
- `server/config/llm-profiles.cjs` - Configuration du modèle LLM
- `.env` - Clés API (Cerebras, Brave)

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

## Bonnes Pratiques Claude Code

### Lire avant de modifier (anti-hallucination)
**TOUJOURS** inspecter le code avant de proposer des modifications ou de répondre:

**Règles:**
- Ne jamais spéculer sur du code non inspecté
- Si l'utilisateur mentionne un fichier/chemin → l'ouvrir et le lire d'abord
- Être rigoureux et persistant dans la recherche des faits clés
- Examiner le style, les conventions et abstractions existantes avant d'implémenter
- Ne faire aucune affirmation sur le code sans l'avoir investigué

**❌ Ne pas faire:**
- Proposer des corrections sans avoir lu le fichier
- Deviner la structure ou le contenu du code
- Ignorer les patterns existants du codebase
- Faire des réclamations non fondées sur le code
- Répondre avant d'avoir investigué les fichiers pertinents

**✅ Faire:**
- Lire les fichiers pertinents en premier
- Comprendre les abstractions en place
- Respecter les conventions du projet
- S'adapter au style existant
- Donner des réponses fondées et vérifiées
- Dire "je ne sais pas" si incertain plutôt que deviner

### Réflexion après chaque action
Après chaque résultat d'outil:
1. **Évaluer la qualité** - Le résultat est-il complet? Fiable? Attendu?
2. **Planifier** - Quelles sont les prochaines étapes optimales?
3. **Itérer** - Ajuster l'approche si nécessaire
4. **Agir** - Exécuter la meilleure action suivante

Ne pas enchaîner les actions mécaniquement. Réfléchir avant de procéder.

### Appels d'outils parallèles
Maximiser l'efficacité en parallélisant les appels indépendants:

**✅ En parallèle** (aucune dépendance):
```
Lire fichier A  ─┐
Lire fichier B  ─┼─→ Résultats simultanés
Lire fichier C  ─┘
```

**❌ Séquentiellement** (dépendances):
```
Lire config → Extraire chemin → Lire fichier cible
```

**Règles:**
- Appeler simultanément tous les outils indépendants
- Ne jamais utiliser de placeholders ou deviner les paramètres
- Si un outil dépend du résultat d'un autre → séquentiel

**Mode stabilité** (si demandé): Exécuter séquentiellement avec pauses entre chaque étape

### Éviter la sur-conception
Garder les solutions **minimales et ciblées**:

**❌ Ne pas faire:**
- Ajouter des fonctionnalités non demandées
- Refactoriser du code qui fonctionne
- Créer des abstractions pour opérations ponctuelles
- Ajouter de la configurabilité "au cas où"
- Gestion d'erreurs pour scénarios impossibles
- Shims de compatibilité rétroactive inutiles

**✅ Faire:**
- Modifications directement demandées uniquement
- Réutiliser les abstractions existantes (DRY)
- Valider uniquement aux limites système (entrée utilisateur, API externes)
- Complexité minimale pour la tâche actuelle

### Solutions robustes et générales
Implémenter des solutions de **haute qualité** qui fonctionnent pour toutes les entrées valides:

**Principes:**
- Comprendre les exigences du problème avant d'implémenter
- Implémenter l'algorithme correct, pas un contournement
- Les tests vérifient l'exactitude, ils ne définissent pas la solution
- Solution robuste, maintenable et extensible

**❌ Ne pas faire:**
- Hardcoder des valeurs qui ne fonctionnent que pour les tests
- Créer des scripts d'aide pour contourner une tâche
- Solutions qui ne marchent que pour des entrées spécifiques
- Contourner les tests au lieu de résoudre le vrai problème

**✅ Faire:**
- Implémenter la logique réelle qui résout le problème généralement
- Suivre les meilleures pratiques et principes de conception
- Signaler si une tâche est déraisonnable ou un test incorrect
- Valider avec différentes entrées, pas seulement les cas de test

### Esthétique Frontend (anti "AI slop")
Créer des designs **distinctifs et créatifs**, pas génériques:

**Typographie:**
- Éviter: Inter, Roboto, Arial, polices système
- Choisir des polices uniques et belles adaptées au contexte

**Couleurs:**
- Éviter: dégradés violet/blanc clichés, palettes timides
- Esthétique cohésive avec variables CSS
- Couleurs dominantes + accents nets
- S'inspirer des thèmes IDE et esthétiques culturelles

**Mouvement:**
- Animations CSS pour effets et micro-interactions
- Chargements orchestrés avec révélations échelonnées (animation-delay)
- Motion library pour React si disponible

**Arrière-plans:**
- Éviter les couleurs unies plates
- Dégradés superposés, motifs géométriques, effets de profondeur

**Anti-patterns à éviter:**
- Mises en page prévisibles
- Toujours les mêmes polices (Space Grotesk, etc.)
- Design générique sans caractère
- Convergence vers les choix "safe"

→ Penser hors des sentiers battus, surprendre et ravir.

### Nettoyage des fichiers temporaires
Supprimer tous les fichiers temporaires créés pendant une tâche:
- Scripts d'aide
- Fichiers de test
- Fichiers de debug
- Tout fichier créé pour l'itération

→ Nettoyer à la fin de la tâche, ne pas laisser de résidus.

### Sous-agents (Task tool)
Déléguer aux sous-agents **uniquement** quand la tâche bénéficie clairement d'un contexte séparé:

**✅ Utiliser un sous-agent:**
- Exploration large d'un codebase inconnu
- Recherches parallèles indépendantes
- Tâches complexes nécessitant un contexte vierge

**❌ Ne pas utiliser:**
- Lecture/modification de fichiers spécifiques
- Tâches simples réalisables directement
- Quand le contexte actuel de conversation est utile

## Ports

| Service | Port |
|---------|------|
| ChromaDB | 8000 |
| Backend API | 3338 |
| Frontend | 5173 |
| Dashboard Agents | 3336 |
| ComfyUI | 8188 |

## Scripts Utilitaires (`scripts/`)

| Script | Usage |
|--------|-------|
| `init.bat` | Installer les dépendances |
| `dev.bat` | Mode développement (hot reload) |
| `test.bat` | Exécuter les tests |
| `lint.bat` | Vérifier le code |
| `status.bat` | État des services |
| `stop.bat` | Arrêter les services |
| `health.bat` | Diagnostic système |
| `research.bat` | Gestion des recherches |

## Méthodologie de Recherche

Pour les tâches de recherche complexes, utiliser la méthodologie structurée:

**Fichiers:** `.claude/research/`
- `METHODOLOGIE.md` - Guide complet
- `TEMPLATE_RECHERCHE.md` - Template pour nouvelles recherches
- `ARBRE_HYPOTHESES.md` - Structure des hypothèses
- `actives/` - Recherches en cours

**Principes:**
1. **Hypothèses concurrentes** - Toujours maintenir 2-3 hypothèses alternatives
2. **Niveaux de confiance** - Évaluer chaque affirmation (1-5)
3. **Auto-critique** - Chercher activement les contre-preuves
4. **Traçabilité** - Documenter sources et raisonnement

**Workflow:**
```batch
# Nouvelle recherche
scripts\research.bat nouveau "Titre"

# Lister recherches actives
scripts\research.bat liste
```

**Échelle de confiance:**
- 1/5 - Spéculatif (intuition)
- 2/5 - Faible (indices non validés)
- 3/5 - Modéré (preuves partielles)
- 4/5 - Élevé (preuves convergentes)
- 5/5 - Très élevé (testé, reproductible)
