# AUDIT ANA SUPERIA - Capacités Non Intégrées

**Date:** 28 Novembre 2025
**Auteur:** Claude
**Objectif:** Identifier tout ce qui EXISTE mais n'est PAS UTILISÉ

---

## RÉSUMÉ EXÉCUTIF

| Catégorie | Total | Intégrés | Non Intégrés |
|-----------|-------|----------|--------------|
| Backend Modules | 28 | 17 (61%) | 9 (32%) |
| Frontend Issues | 22 | - | 5 critiques |
| Endpoints Manquants | - | - | 6 |

---

## 1. BACKEND - MODULES NON INTÉGRÉS

### 1.1 IMPACT ÉLEVÉ (À intégrer en priorité)

#### fooocus-integration.cjs
- **Chemin:** `E:/ANA/server/services/fooocus-integration.cjs`
- **Description:** Service COMPLET de génération d'images SDXL
- **Capacités:**
  - `start()` - Lancer Fooocus
  - `generate(prompt, preset)` - Générer images
  - 6 presets: default, lightning, anime, realistic, portrait, landscape
  - 10 styles intégrés
  - Optimisé RTX 3070 8GB
- **Statut:** ❌ Aucun endpoint API créé, jamais importé
- **Fix:** Ajouter endpoints `/api/fooocus/*`

#### semantic-router.cjs
- **Chemin:** `E:/ANA/server/intelligence/semantic-router.cjs`
- **Description:** Routeur intelligent par type de tâche
- **Capacités:**
  - `classify(query)` - Classification sémantique
  - `route(query)` - Routing vers LLM optimal
  - 8 task types: CODING, MATH, VISION, WRITING, ANALYSIS, CONVERSATION, CREATIVE, RESEARCH
- **Statut:** ❌ Jamais importé dans ana-core.cjs
- **Fix:** Intégrer dans chaîne `/api/chat`

#### context-selector.cjs
- **Chemin:** `E:/ANA/server/intelligence/context-selector.cjs`
- **Description:** Sélection intelligente du contexte RAG
- **Capacités:**
  - `selectContext(query, sources, budget)`
  - Scoring sémantique
  - Gestion budget tokens
- **Statut:** ❌ Jamais appelé nulle part
- **Fix:** Intégrer avant appels LLM

### 1.2 IMPACT MOYEN (Partiellement intégrés)

#### tiered-memory.cjs
- **Chemin:** `E:/ANA/server/memory/tiered-memory.cjs`
- **Endpoints créés:** 5
- **Problème:** Endpoints jamais appelés par les agents
- **Architecture:** PRIMARY (session) → SECONDARY (24-48h) → TERTIARY (archive)

#### skill-learner.cjs
- **Chemin:** `E:/ANA/server/intelligence/skill-learner.cjs`
- **Endpoints créés:** 7
- **Problème:** Endpoints jamais appelés dans workflows
- **Capacités:** Extraction skills, feedback loop, meta-learning

### 1.3 IMPACT BAS (Redondances)

#### web_browser.cjs
- **Statut:** Duplicate de web-tools.cjs
- **Action:** Supprimer ou fusionner

---

## 2. FRONTEND - PAGES NON CONNECTÉES

### 2.1 CRITIQUES (Fonctionnalités cassées)

#### CodingPage - Agent Execution
- **Fichier:** `CodingPage.jsx`
- **Problème:** Envoie `coding:run` mais n'écoute AUCUNE réponse
- **States inutilisés:** agentStatus, agentActions, agentResult
- **Impact:** L'utilisateur voit "running" indéfiniment
- **Fix:** Ajouter listeners pour coding:started/action/completed/error

#### CodingPage - Terminal
- **Ligne:** 283
- **Problème:** `handleExecuteCode()` n'appelle aucun backend
- **Endpoint manquant:** `/api/code/execute`

#### LogsPage
- **Problème:** Logs fabriqués depuis /api/stats
- **Impact:** Impossible de débugger
- **Endpoint manquant:** `/api/logs`

#### VoicePage
- **Problème:** Conversations non sauvegardées
- **Impact:** Mémoire vocale perdue au refresh
- **Endpoint manquant:** `/api/memory/save-conversation`

#### SettingsPage
- **Problème:** localStorage uniquement
- **Impact:** Settings perdus entre appareils
- **Endpoint manquant:** `/api/user/settings`

### 2.2 MOYENS (Fonctionnalités incomplètes)

| Page | Problème |
|------|----------|
| n8nPage | Boutons "Installer template" sans handler |
| n8nPage | Pas de vue détaillée exécutions |
| DashboardPage | /api/agents possiblement manquant |
| VoicePage | Sélection modèle non confirmée |

---

## 3. ENDPOINTS API MANQUANTS

| Endpoint | Requis par | Priorité |
|----------|-----------|----------|
| `/api/code/execute` | CodingPage | CRITIQUE |
| `/api/logs` | LogsPage | CRITIQUE |
| `/api/memory/save-conversation` | VoicePage | CRITIQUE |
| `/api/user/settings` | SettingsPage | HAUTE |
| `/api/fooocus/*` | fooocus-integration | HAUTE |
| `/api/n8n/templates/install` | n8nPage | MOYENNE |

---

## 4. WEBSOCKET EVENTS - CodingPage

Le frontend envoie mais n'écoute pas!

| Event | Direction | Statut |
|-------|-----------|--------|
| `coding:run` | Frontend → Backend | ✅ Envoyé |
| `coding:started` | Backend → Frontend | ❌ PAS ÉCOUTÉ |
| `coding:action` | Backend → Frontend | ❌ PAS ÉCOUTÉ |
| `coding:completed` | Backend → Frontend | ❌ PAS ÉCOUTÉ |
| `coding:error` | Backend → Frontend | ❌ PAS ÉCOUTÉ |

---

## 5. PLAN D'ACTION

### PRIORITÉ 1 - Quick Wins (1-2 jours)
1. Connecter CodingPage aux events WebSocket
2. Intégrer semantic-router dans /api/chat
3. Intégrer context-selector pour RAG

### PRIORITÉ 2 - Endpoints (2-3 jours)
1. Créer `/api/code/execute`
2. Créer `/api/logs`
3. Créer `/api/memory/save-conversation`
4. Exposer fooocus via `/api/fooocus/*`

### PRIORITÉ 3 - Intégration profonde (1 semaine)
1. tiered-memory comme mémoire primaire
2. skill-learner dans feedback loop
3. Service unifié images

---

## 6. FICHIERS DE RÉFÉRENCE

### Backend à intégrer:
```
E:/ANA/server/services/fooocus-integration.cjs
E:/ANA/server/intelligence/semantic-router.cjs
E:/ANA/server/intelligence/context-selector.cjs
E:/ANA/server/memory/tiered-memory.cjs
E:/ANA/server/intelligence/skill-learner.cjs
```

### Frontend à corriger:
```
E:/ANA/ana-interface/src/pages/CodingPage.jsx
E:/ANA/ana-interface/src/pages/LogsPage.jsx
E:/ANA/ana-interface/src/pages/VoicePage.jsx
E:/ANA/ana-interface/src/pages/SettingsPage.jsx
E:/ANA/ana-interface/src/pages/n8nPage.jsx
```

---

*"Il n'y a rien de magique. Rien de mystérieux. Que des évidences. Il suffit de savoir."* - ALAIN
