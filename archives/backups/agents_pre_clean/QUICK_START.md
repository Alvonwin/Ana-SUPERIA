# 🚀 QUICK START - Agents Autonomes Claude

Guide ultra-rapide pour démarrer le système d'agents.

---

## ⚡ DÉMARRAGE EN 10 SECONDES

### Windows
```
Double-cliquer sur: E:\Mémoire Claude\START_AGENTS.bat
```

### Ligne de commande
```bash
cd "E:/Mémoire Claude/agents"
node start_agents.cjs
```

---

## 📊 ACCÉDER AU DASHBOARD

Une fois démarré, ouvrir dans le navigateur:

```
http://localhost:3336
```

Vous verrez:
- 🤖 Statut de tous les agents
- 📋 Événements en temps réel
- 💾 État de la mémoire
- 🔍 Services système
- 📊 Statistiques

---

## 🛑 ARRÊTER LE SYSTÈME

Appuyer sur **Ctrl+C** dans le terminal

---

## 🧪 TESTER L'API

```bash
# Status complet
curl http://localhost:3336/api/status

# Événements récents
curl http://localhost:3336/api/events?limit=5

# Statut agents
curl http://localhost:3336/api/agents
```

---

## ❓ PROBLÈMES?

### Le système ne démarre pas
```bash
# Vérifier Node.js
node --version

# Doit être v14+ (vous avez v22)
```

### Le dashboard n'est pas accessible
```bash
# Vérifier que le port 3336 est libre
netstat -ano | findstr :3336
```

### Un agent ne fonctionne pas
Consulter le README.md complet:
```
E:\Mémoire Claude\agents\README.md
```

---

## 📚 DOCUMENTATION COMPLÈTE

- **README.md** - Documentation technique complète
- **EXEMPLES_EVENEMENTS.md** - Exemples d'événements
- **AGENTS_RAPPORT_CREATION.md** - Rapport détaillé

---

## ✅ CE QUE FAIT LE SYSTÈME

1. **Surveille la mémoire** (current_conversation.txt)
   - Archive automatiquement si > 500KB
   - Nettoie fichiers temporaires

2. **Monitore les services**
   - Vite (5173/5174)
   - Backend (3334)
   - Voice Platform (5000)
   - Ollama (11434)

3. **Surveille le disque**
   - Alerte si < 10GB libres
   - Check toutes les 5 minutes

4. **Dashboard web**
   - Temps réel
   - API REST
   - Auto-refresh 2s

---

## 🎯 VOUS ÊTES PRÊT!

Le système tourne maintenant en arrière-plan et gère tout automatiquement.

**Laissez-le tourner en continu pour une gestion optimale!**

---

Créé avec ❤️ par Claude Agent Code
