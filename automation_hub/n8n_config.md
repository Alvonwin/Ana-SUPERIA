# n8n Configuration pour Ana

**Date d'installation:** 2025-11-18
**Version:** 1.120.3
**Port:** 5678
**Interface:** http://localhost:5678

---

## Installation Complète

```bash
npm install -g n8n
```

**Résultat:**
- 1931 packages installés
- Clé de chiffrement auto-générée: `C:\Users\niwno\.n8n\config`
- Base de données SQLite initialisée avec toutes migrations

---

## Démarrage

```bash
n8n start
```

Le serveur démarre en arrière-plan et reste accessible sur http://localhost:5678

---

## Configuration Actuelle

### Base de données
- **Type:** SQLite (par défaut)
- **Localisation:** `C:\Users\niwno\.n8n\database.sqlite`

### Avertissements de configuration
1. `DB_SQLITE_POOL_SIZE` - Recommandé de définir > 0 pour pool de connexions
2. `N8N_RUNNERS_ENABLED` - Task runners seront obligatoires dans futures versions
3. `N8N_BLOCK_ENV_ACCESS_IN_NODE` - Accès env vars depuis Code Node changera
4. `N8N_GIT_NODE_DISABLE_BARE_REPOS` - Bare repos seront désactivés pour sécurité

### Configuration recommandée (futur)
Créer fichier `.env` dans `E:/ANA/automation_hub/`:
```env
DB_SQLITE_POOL_SIZE=5
N8N_RUNNERS_ENABLED=true
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
N8N_GIT_NODE_DISABLE_BARE_REPOS=true
```

---

## Intégration avec Ana

### 1. Workflows pour Ana

**Localisation:** `E:/ANA/automation_hub/workflows/`

**Workflows prévus:**
- `code_to_diagram.json` - Analyser code → Générer diagramme ComfyUI
- `daily_art_creation.json` - Génération quotidienne d'art
- `taaft_discovery_automation.json` - Découverte outils IA automatisée
- `memory_sync.json` - Synchronisation mémoire long-terme

### 2. API n8n

Ana peut déclencher workflows via API REST:
```javascript
const response = await fetch('http://localhost:5678/webhook/ana-workflow', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({action: 'generate_art', params: {...}})
});
```

### 3. Intégration ComfyUI

n8n peut communiquer avec ComfyUI via:
- HTTP Request nodes vers API ComfyUI
- File system monitoring (`E:/ANA/creative_studio/queue/`)
- Webhooks pour notifications de completion

---

## Premier Workflow (À créer)

**Nom:** Code Analysis → Diagram
**Trigger:** Nouveau fichier `.cjs` dans `E:/ANA/core/`
**Actions:**
1. Lire contenu fichier
2. Analyser structure (fonctions, classes, dépendances)
3. Générer description texte
4. Appeler ComfyUI pour créer diagramme visuel
5. Sauvegarder dans `E:/ANA/docs/diagrams/`

---

## Accès Interface Web

**URL locale:** http://localhost:5678
**Premier accès:** Configuration compte admin nécessaire

---

## Commandes Utiles

### Démarrer avec tunnel (accès externe)
```bash
n8n start --tunnel
```

### Démarrer avec configuration personnalisée
```bash
n8n start --config E:/ANA/automation_hub/.env
```

### Arrêter n8n
```bash
# Trouver PID
netstat -ano | findstr :5678

# Tuer processus
taskkill /F /PID <PID>
```

---

## Ressources

- **Documentation:** https://docs.n8n.io
- **Nodes disponibles:** 400+ intégrations
- **Community:** https://community.n8n.io

---

## Prochaines Actions pour Ana

1. Créer compte admin sur interface web
2. Créer premier workflow test
3. Intégrer ComfyUI avec n8n
4. Automatiser génération daily art
5. Connecter agents Ana existants via webhooks

---

**Statut:** Opérationnel
**Utilisé par:** Ana (Autonomous Neural Aspirant)
**Objectif:** Orchestration workflows automatisés pour créativité et autonomie
