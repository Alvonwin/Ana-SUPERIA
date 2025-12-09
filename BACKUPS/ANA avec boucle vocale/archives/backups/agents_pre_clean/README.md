# 🤖 ÉCOSYSTÈME D'AGENTS AUTONOMES CLAUDE

Système complet d'agents autonomes qui tournent en arrière-plan pour assister Claude dans la gestion de la mémoire et du système ARCHON.

---

## 📁 STRUCTURE DU SYSTÈME

```
agents/
├── shared_event_bus.cjs          # 🔗 Bus d'événements central
├── agent_coordinator.cjs         # 🎯 Coordinateur principal
├── agent_memory_manager.cjs      # 💾 Gestion de la mémoire
├── agent_system_monitor.cjs      # 🔍 Surveillance système
├── dashboard_server.cjs          # 📊 Dashboard web
├── start_agents.cjs              # 🚀 Script de démarrage
└── README.md                     # 📖 Ce fichier
```

---

## 🚀 DÉMARRAGE RAPIDE

### Méthode 1: Script Windows (.bat)

Double-cliquez sur:
```
E:\Mémoire Claude\START_AGENTS.bat
```

### Méthode 2: Ligne de commande

```bash
cd "E:/Mémoire Claude/agents"
node start_agents.cjs
```

### Méthode 3: Démarrage en arrière-plan

```bash
cd "E:/Mémoire Claude/agents"
node start_agents.cjs &
```

---

## 🎯 AGENTS DISPONIBLES

### 1. Agent Coordinator (🎯)
**Rôle**: Chef d'orchestre

- Gère le cycle de vie des agents
- Délègue les tâches aux agents spécialisés
- Coordonne la communication inter-agents
- Monitore l'état global du système

### 2. Memory Manager (💾)
**Rôle**: Gestion proactive de la mémoire

- Surveille `current_conversation.txt` toutes les 30s
- Archive automatiquement si > 500KB
- Nettoie fichiers temporaires
- Crée statistiques mémoire
- Alerte si critique

**Événements émis**:
- `memory:size_critical` - Conversation trop volumineuse
- `memory:archived` - Archive créée avec succès
- `memory:temp_cleaned` - Fichiers temporaires supprimés
- `memory:health_check` - Check périodique (toutes les 10 vérifications)

### 3. System Monitor (🔍)
**Rôle**: Surveillance santé système

- Vérifie services (Vite, Backend, Voice, Ollama) toutes les 60s
- Monitore espace disque E: toutes les 5min
- Détecte problèmes critiques
- Alerte automatique

**Services surveillés**:
- Vite Dev Server (ports 5173, 5174)
- Backend API (port 3334)
- Voice Platform (port 5000)
- Ollama (port 11434)

**Événements émis**:
- `system:service_down` - Service arrêté
- `system:service_up` - Service redémarré
- `system:disk_low` - Espace disque < 10GB
- `system:health_check` - Check périodique

---

## 📊 DASHBOARD WEB

Une fois les agents démarrés, accéder au dashboard:

**URL**: http://localhost:3336

### Fonctionnalités du Dashboard

- **Vue en temps réel** de l'état de tous les agents
- **Statistiques détaillées** (uptime, tâches, événements)
- **Événements récents** avec horodatage
- **Santé du système** (healthy/degraded)
- **Actualisation automatique** toutes les 2 secondes

### API Disponibles

```bash
# Status complet
GET http://localhost:3336/api/status

# Événements récents
GET http://localhost:3336/api/events?limit=10

# Statut des agents
GET http://localhost:3336/api/agents

# Stats EventBus
GET http://localhost:3336/api/eventbus
```

---

## 🔗 EVENT BUS

Tous les agents communiquent via un Event Bus partagé.

### Types d'événements

```javascript
// Mémoire
'memory:size_critical'      // Conversation > 500KB
'memory:archived'           // Archive créée
'memory:stage01_ready'      // Fichiers prêts pour stage_02
'memory:temp_cleaned'       // Nettoyage temporaire effectué
'memory:health_check'       // Vérification santé périodique

// Système
'system:service_down'       // Service arrêté
'system:service_up'         // Service démarré
'system:disk_low'           // Espace disque critique
'system:health_check'       // Check santé

// Agents
'agent:registered'          // Agent enregistré
'agent:started'             // Agent démarré
'agent:stopped'             // Agent arrêté

// Dashboard
'dashboard:started'         // Dashboard lancé
'dashboard:stopped'         // Dashboard arrêté
```

### Utilisation dans le code

```javascript
const eventBus = require('./shared_event_bus.cjs')

// Écouter un événement
eventBus.on('memory:size_critical', (data) => {
  console.log('Mémoire critique!', data)
})

// Émettre un événement
eventBus.emit('memory:archived', {
  size: 1024000,
  path: '/archives/...'
})

// Événements typés (recommandé)
eventBus.emitMemoryEvent('size_critical', { size: 600000 })
eventBus.emitSystemEvent('service_down', { service: 'vite' })
```

---

## ⚙️ CONFIGURATION

### Memory Manager

```javascript
checkInterval: 30000        // 30 secondes
criticalSize: 500000        // 500KB
tempCleanupInterval: 300000 // 5 minutes
```

### System Monitor

```javascript
checkInterval: 60000        // 1 minute
diskCheckInterval: 300000   // 5 minutes
criticalDiskGB: 10          // Alerte si < 10GB
```

### Dashboard Server

```javascript
PORT: 3336
refreshInterval: 2000       // 2 secondes (côté client)
maxEvents: 50               // Historique max
```

---

## 🛑 ARRÊT PROPRE

Le système gère l'arrêt propre de plusieurs manières:

### Arrêt manuel
Appuyez sur `Ctrl+C` dans le terminal

### Arrêt programmatique
```javascript
await coordinator.stop()
```

### Signaux gérés
- `SIGINT` (Ctrl+C)
- `SIGTERM` (kill)
- `uncaughtException`
- `unhandledRejection`

---

## 📈 STATISTIQUES

### Récupérer les stats d'un agent

```javascript
// Memory Manager
const stats = memoryManager.getStats()
// {
//   checksPerformed: 42,
//   archivesCreated: 3,
//   tempFilesDeleted: 15,
//   lastCheck: '2025-11-16T...',
//   running: true
// }

// System Monitor
const stats = systemMonitor.getStats()
// {
//   running: true,
//   checksPerformed: 30,
//   services: {...},
//   disk: {...}
// }

// Coordinator
const stats = coordinator.getStats()
// {
//   running: true,
//   uptime: '2h 15m',
//   agents: { total: 2, running: 2 },
//   tasks: { received: 0, completed: 0, ... }
// }
```

---

## 🔧 DÉVELOPPEMENT

### Ajouter un nouvel agent

1. Créer le fichier `agent_<nom>.cjs`
2. Implémenter les méthodes:
   - `start()` - Démarrage
   - `stop()` - Arrêt
   - `getStats()` - Statistiques

3. Enregistrer dans `start_agents.cjs`:
```javascript
const newAgent = require('./agent_<nom>.cjs')
coordinator.registerAgent('<nom>', newAgent)
await coordinator.startAgent('<nom>')
```

### Structure d'un agent

```javascript
const eventBus = require('./shared_event_bus.cjs')

class MyAgent {
  constructor() {
    this.running = false
    this.stats = {}
  }

  async start() {
    this.running = true
    eventBus.emit('agent:my_agent:started', {})
    this.mainLoop()
  }

  async mainLoop() {
    while (this.running) {
      // Faire le travail
      await this.sleep(10000)
    }
  }

  async stop() {
    this.running = false
    eventBus.emit('agent:my_agent:stopped', {})
  }

  getStats() {
    return {
      running: this.running,
      ...this.stats
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = new MyAgent()
```

---

## 📝 LOGS

Tous les événements importants sont loggés dans la console avec emojis:

```
💾 [MemoryManager] Archivage: conversation_2025-11-16.txt
✅ [MemoryManager] Archivé: 1641KB
🔍 [SystemMonitor] Disque E: 756GB libres (81%)
🤖 [EventBus] memory:archived
```

---

## 🐛 TROUBLESHOOTING

### Les agents ne démarrent pas

1. Vérifier que Node.js est installé: `node --version`
2. Vérifier qu'on est dans le bon dossier: `cd "E:/Mémoire Claude/agents"`
3. Vérifier les permissions fichiers

### Le dashboard n'est pas accessible

1. Vérifier que le port 3336 n'est pas utilisé
2. Vérifier les logs: chercher "📊 Dashboard Server démarré"
3. Essayer: `curl http://localhost:3336/api/status`

### Un agent ne répond plus

```javascript
// Redémarrer un agent spécifique
await coordinator.stopAgent('memory_manager')
await coordinator.startAgent('memory_manager')
```

---

## 🎓 INTÉGRATION AVEC SYSTÈME V3

Les agents s'intègrent parfaitement avec le système mémoire V3 existant:

- **hook_v3_claude_code.js** - Peut écouter événements agents
- **sync_memory.js** - Peut être déclenché par agents
- **cognitive_analyzer.js** - Peut utiliser stats des agents

---

## 📚 RESSOURCES

- **Architecture complète**: `E:/Mémoire Claude/03_METAMEMOIRE/ARCHITECTURE_AGENTS_AUTONOMES_COMPLETE.md`
- **Dashboard**: http://localhost:3336
- **API Docs**: http://localhost:3336/api/status

---

## 🚀 PROCHAINES ÉTAPES

Agents planifiés mais non encore implémentés:

1. **Synthesis Engine** (📝) - Synthèses automatiques
2. **Learning Monitor** (🎓) - Apprentissage des erreurs
3. **Research Agent** (🔬) - Recherche intelligente
4. **Code Agent** (💻) - Génération code volumineuse

---

**Créé par**: Claude (système autonome)
**Date**: 2025-11-16
**Version**: 1.0.0
**Status**: ✅ Production Ready
