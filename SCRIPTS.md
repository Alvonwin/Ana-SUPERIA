# Scripts de Qualité de Vie - ANA SUPERIA

Ce dossier contient des scripts utilitaires pour faciliter le développement et la maintenance du projet ANA.

## Scripts Disponibles

### `scripts/init.bat` - Initialisation
Installe toutes les dépendances du projet.

```batch
scripts\init.bat
```

**Actions:**
- Vérifie Node.js et Python
- Installe les dépendances backend (`server/`)
- Installe les dépendances frontend (`ana-interface/`)
- Crée les dossiers nécessaires
- Vérifie ChromaDB

**Quand l'utiliser:** Après un clone du repo ou pour mettre à jour les dépendances.

---

### `scripts/test.bat` - Tests
Exécute les suites de tests.

```batch
# Tous les tests
scripts\test.bat

# Mode watch (relance automatique)
scripts\test.bat --watch
scripts\test.bat -w

# Avec couverture de code
scripts\test.bat --coverage
scripts\test.bat -c

# Backend uniquement
scripts\test.bat --backend

# Frontend uniquement
scripts\test.bat --frontend
```

**Backend:** Utilise Vitest (`npm test` dans `server/`)

---

### `scripts/lint.bat` - Linting
Vérifie la qualité du code.

```batch
# Vérification standard
scripts\lint.bat

# Correction automatique (ESLint)
scripts\lint.bat --fix
scripts\lint.bat -f

# Frontend uniquement
scripts\lint.bat --frontend

# Backend uniquement
scripts\lint.bat --backend
```

**Frontend:** ESLint avec règles React
**Backend:** Vérification syntaxe Node.js (`node --check`)

---

### `scripts/status.bat` - État des Services
Affiche l'état de tous les services.

```batch
scripts\status.bat
```

**Vérifie:**
- ChromaDB (port 8000)
- Backend (port 3338)
- Frontend (port 5173)
- Dashboard Agents (port 3336)
- ComfyUI (port 8188)
- Ollama (port 11434)

---

### `scripts/stop.bat` - Arrêt des Services
Arrête gracieusement tous les services ANA.

```batch
scripts\stop.bat
```

**Actions:**
- Demande confirmation
- Arrête Backend, Frontend, Agents, ChromaDB
- Nettoie les processus Node.js orphelins
- Vérifie que tout est bien arrêté

---

### `scripts/health.bat` - Santé Système
Vérifie la santé complète du système.

```batch
scripts\health.bat
```

**Vérifie:**
1. Dépendances système (Node.js, npm, Python, Git)
2. Structure du projet (dossiers essentiels)
3. Fichiers de configuration (.env, system-prompt.json)
4. node_modules installés
5. Fichiers mémoire
6. Espace disque

---

### `scripts/dev.bat` - Mode Développement
Démarre en mode développement avec hot reload.

```batch
scripts\dev.bat
```

**Actions:**
- Libère les ports
- Démarre ChromaDB si nécessaire
- Lance le backend avec **nodemon** (hot reload)
- Lance le frontend avec **Vite HMR** (hot reload)
- Ouvre le navigateur automatiquement

**Idéal pour:** Développement actif avec rechargement automatique.

---

### `scripts/logs.bat` - Visualisation Logs
Interface interactive pour consulter les logs.

```batch
scripts\logs.bat
```

**Options:**
1. Conversation courante (50 dernières lignes)
2. Mémoires Ana
3. Log de consolidation
4. État de conscience
5. Compétences apprises
6. Feedback utilisateur

---

## Utilisation Rapide

| Tâche | Commande |
|-------|----------|
| Première installation | `scripts\init.bat` |
| Démarrer le système | `START_ANA.bat` |
| Mode développement | `scripts\dev.bat` |
| Vérifier l'état | `scripts\status.bat` |
| Lancer les tests | `scripts\test.bat` |
| Vérifier le code | `scripts\lint.bat` |
| Arrêter tout | `scripts\stop.bat` |
| Diagnostic complet | `scripts\health.bat` |
| Voir les logs | `scripts\logs.bat` |

---

## Workflow Recommandé

### Nouvelle Session de Développement

```batch
# 1. Vérifier la santé du système
scripts\health.bat

# 2. Démarrer en mode dev
scripts\dev.bat

# 3. Coder...

# 4. Lancer les tests
scripts\test.bat

# 5. Vérifier le linting
scripts\lint.bat

# 6. Arrêter quand terminé
scripts\stop.bat
```

### Après un Pull/Clone

```batch
# 1. Mettre à jour les dépendances
scripts\init.bat

# 2. Vérifier que tout fonctionne
scripts\health.bat

# 3. Lancer les tests
scripts\test.bat
```

---

## Notes

- Tous les scripts utilisent l'encodage UTF-8 (`chcp 65001`)
- Les scripts sont conçus pour Windows (`.bat`)
- Les couleurs indiquent le type de script:
  - 🟢 Vert: Succès/Initialisation
  - 🟡 Jaune: Tests/Développement
  - 🔵 Bleu: Information/Status
  - 🟣 Violet: Linting
  - 🔴 Rouge: Arrêt/Danger
