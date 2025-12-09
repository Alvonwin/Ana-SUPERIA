# 📋 EXEMPLES D'ÉVÉNEMENTS ÉMIS PAR LE SYSTÈME

Ce document montre des exemples réels d'événements capturés lors du fonctionnement du système d'agents.

---

## 🚀 SÉQUENCE DE DÉMARRAGE

### Initialisation (0-2 secondes)

```javascript
// 1. Initialisation des modules
{
  event: 'agent:registered',
  data: { name: 'memory_manager' },
  timestamp: '2025-11-17T01:43:36.294Z'
}

{
  event: 'agent:registered',
  data: { name: 'system_monitor' },
  timestamp: '2025-11-17T01:43:36.295Z'
}

// 2. Démarrage Coordinator
{
  event: 'agent:coordinator:started',
  data: { startTime: 1763344121296 },
  timestamp: '2025-11-17T01:43:36.296Z'
}

// 3. Démarrage Memory Manager
{
  event: 'agent:memory_manager:started',
  data: {
    checkInterval: 30000,
    criticalSize: 500000
  },
  timestamp: '2025-11-17T01:43:36.297Z'
}

{
  event: 'agent:started',
  data: { name: 'memory_manager' },
  timestamp: '2025-11-17T01:43:36.298Z'
}

// 4. Démarrage System Monitor
{
  event: 'agent:system_monitor:started',
  data: {
    services: ['vite', 'backend', 'voice', 'ollama'],
    checkInterval: 60000
  },
  timestamp: '2025-11-17T01:43:36.312Z'
}

{
  event: 'agent:started',
  data: { name: 'system_monitor' },
  timestamp: '2025-11-17T01:43:36.313Z'
}

// 5. Démarrage Dashboard
{
  event: 'dashboard:started',
  data: { port: 3336 },
  timestamp: '2025-11-17T01:43:36.450Z'
}
```

---

## 💾 ÉVÉNEMENTS MÉMOIRE

### Détection taille critique

```javascript
{
  event: 'memory:size_critical',
  data: {
    conversationSize: 1641000,
    conversationSizeKB: 1641,
    isCritical: true,
    stage01Files: 0,
    timestamp: '2025-11-17T01:43:36.317Z'
  },
  timestamp: '2025-11-17T01:43:36.317Z'
}
```

### Archivage automatique

```javascript
{
  event: 'memory:archived',
  data: {
    originalSize: 1641000,
    archivePath: 'E:/Mémoire Claude/01_ARCHIVES_VERBATIM/conversation_2025-11-17T01-43-36.txt',
    archiveName: 'conversation_2025-11-17T01-43-36.txt',
    timestamp: '2025-11-17T01-43-36'
  },
  timestamp: '2025-11-17T01:43:36.544Z'
}
```

### Nettoyage fichiers temporaires

```javascript
{
  event: 'memory:temp_cleaned',
  data: {
    count: 2
  },
  timestamp: '2025-11-17T01:43:36.568Z'
}
```

### Health check mémoire

```javascript
{
  event: 'memory:health_check',
  data: {
    conversationSize: 45,
    conversationSizeKB: 0,
    isCritical: false,
    stage01Files: 0,
    timestamp: '2025-11-17T01:43:36.670Z'
  },
  timestamp: '2025-11-17T01:43:36.670Z'
}
```

---

## 🔍 ÉVÉNEMENTS SYSTÈME

### Health check complet

```javascript
{
  event: 'system:health_check',
  data: {
    total: 4,
    running: 4,
    down: 0,
    services: {
      vite: {
        running: true,
        port: 5173,
        name: 'Vite Dev Server',
        checkedAt: '2025-11-17T01:48:41.333Z'
      },
      backend: {
        running: true,
        port: 3334,
        name: 'Backend API',
        checkedAt: '2025-11-17T01:48:41.365Z'
      },
      voice: {
        running: true,
        port: 5000,
        name: 'Voice Platform',
        checkedAt: '2025-11-17T01:48:41.398Z'
      },
      ollama: {
        running: true,
        port: 11434,
        name: 'Ollama',
        checkedAt: '2025-11-17T01:48:41.430Z'
      }
    },
    disk: {
      freeGB: 756,
      totalGB: 932,
      usedGB: 176,
      percentFree: 81,
      checkedAt: '2025-11-17T01:48:41.384Z'
    },
    timestamp: '2025-11-17T01:48:41.430Z'
  },
  timestamp: '2025-11-17T01:48:41.430Z'
}
```

### Service down (exemple)

```javascript
{
  event: 'system:service_down',
  data: {
    service: 'vite',
    ports: [5173, 5174]
  },
  timestamp: '2025-11-17T...'
}
```

### Service up (exemple)

```javascript
{
  event: 'system:service_up',
  data: {
    service: 'vite',
    port: 5173
  },
  timestamp: '2025-11-17T...'
}
```

### Disque faible (exemple)

```javascript
{
  event: 'system:disk_low',
  data: {
    freeGB: 8,
    totalGB: 932,
    usedGB: 924,
    percentFree: 1,
    checkedAt: '2025-11-17T...'
  },
  timestamp: '2025-11-17T...'
}
```

---

## 🎯 ÉVÉNEMENTS COORDINATOR

### Action coordinateur

```javascript
{
  event: 'coordinator:action',
  data: {
    type: 'memory_critical_handled',
    data: {
      conversationSize: 1641000,
      conversationSizeKB: 1641,
      isCritical: true
    }
  },
  timestamp: '2025-11-17T01:43:36.318Z'
}
```

### Alerte manuelle requise (exemple)

```javascript
{
  event: 'coordinator:alert',
  data: {
    type: 'service_down',
    service: 'voice',
    action: 'manual_intervention_needed'
  },
  timestamp: '2025-11-17T...'
}
```

---

## 📊 STATISTIQUES EVENTBUS

Après 5 minutes de fonctionnement:

```json
{
  "uptime": "5m 23s",
  "totalEvents": 42,
  "eventsByType": {
    "agent": 7,
    "dashboard": 1,
    "memory": 15,
    "system": 18,
    "coordinator": 1
  },
  "listeners": 0
}
```

---

## 🔄 CYCLE TYPIQUE (1 minute)

```
00:00 - agent:coordinator:started
00:00 - agent:memory_manager:started
00:00 - agent:system_monitor:started
00:00 - dashboard:started
00:15 - memory:size_critical (si applicable)
00:15 - memory:archived (si critique)
00:15 - memory:temp_cleaned
00:30 - memory:health_check
00:41 - system:health_check
01:00 - memory:health_check
01:30 - memory:health_check
```

---

## 💡 UTILISATION DANS LE CODE

### Écouter événement mémoire critique

```javascript
const eventBus = require('./agents/shared_event_bus.cjs')

eventBus.on('memory:size_critical', (data) => {
  console.log('⚠️ ALERTE MÉMOIRE!')
  console.log('Taille:', data.conversationSizeKB, 'KB')

  // Réagir en conséquence
  if (data.conversationSizeKB > 2000) {
    // Action urgente
  }
})
```

### Écouter tous les événements mémoire

```javascript
eventBus.on('memory:*', (data) => {
  console.log('Événement mémoire:', data)
})
```

### Récupérer historique

```javascript
const recentEvents = eventBus.getHistory(10)
console.log('10 derniers événements:', recentEvents)

const memoryEvents = eventBus.getEventsByType('memory')
console.log('Tous événements mémoire:', memoryEvents)
```

### Émettre événement custom

```javascript
// Méthode standard
eventBus.emit('custom:event', {
  myData: 'value'
})

// Méthode typée (recommandé)
eventBus.emitMemoryEvent('custom_action', {
  action: 'cleanup',
  result: 'success'
})
```

---

## 📈 PATTERNS D'ÉVÉNEMENTS

### Pattern: Détection → Action → Confirmation

```javascript
// 1. Détection
{ event: 'memory:size_critical', ... }

// 2. Action coordinateur
{ event: 'coordinator:action', type: 'memory_critical_handled' }

// 3. Confirmation
{ event: 'memory:archived', ... }
```

### Pattern: Check périodique

```javascript
// Toutes les 30 secondes
{ event: 'memory:health_check', ... }

// Toutes les 60 secondes
{ event: 'system:health_check', ... }
```

### Pattern: Lifecycle

```javascript
// Démarrage
{ event: 'agent:registered', ... }
{ event: 'agent:started', ... }

// Fonctionnement
// ... événements métier ...

// Arrêt
{ event: 'agent:stopped', ... }
```

---

## 🎯 CAS D'USAGE

### Cas 1: Monitoring externe

Scraper les événements pour outil externe:

```bash
# Récupérer événements toutes les 5 secondes
while true; do
  curl -s http://localhost:3336/api/events?limit=50 > events.json
  sleep 5
done
```

### Cas 2: Alerting Slack/Discord

```javascript
eventBus.on('system:service_down', async (data) => {
  await fetch('https://hooks.slack.com/...', {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 Service ${data.service} est DOWN!`
    })
  })
})
```

### Cas 3: Logs persistants

```javascript
eventBus.on('*', (event, data) => {
  const logEntry = JSON.stringify({
    timestamp: new Date(),
    event,
    data
  })

  fs.appendFileSync('agents.log', logEntry + '\n')
})
```

---

**Créé par**: Claude
**Date**: 2025-11-16
**Version**: 1.0.0
