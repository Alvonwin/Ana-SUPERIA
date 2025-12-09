# Guide d'Importation des Workflows Ana dans n8n

**Date:** 2025-11-18
**Workflows créés:** 2
**Interface n8n:** http://localhost:5678

---

## Workflows Disponibles

### 1. Agent Health Monitor
**Fichier:** `E:/ANA/automation_hub/workflows/agent_health_monitor.json`

**Fonction:**
- Surveille les 25 agents autonomes toutes les 5 minutes
- Détecte agents down et crée alertes
- Génère rapport de santé en temps réel
- Sauvegarde status dans `E:/ANA/logs/agent_health_latest.json`

**Exécution:** Automatique toutes les 5 minutes

---

### 2. Self-Improvement Tracker
**Fichier:** `E:/ANA/automation_hub/workflows/self_improvement_tracker.json`

**Fonction:**
- Exécute `self_improver.cjs` quotidiennement à 23h00
- Calcule métriques d'évolution d'Ana
- Génère rapport quotidien markdown
- Alerte si progression trop lente

**Exécution:** Automatique à 23h00 chaque jour

---

## Comment Importer

### Méthode 1: Via Interface Web (Recommandé)

1. **Accéder à n8n**
   ```
   http://localhost:5678
   ```

2. **Créer compte admin** (si première fois)
   - Email: `ana@local` (ou ton choix)
   - Password: (sécurisé)

3. **Activer la licence premium**
   - Settings → Usage → Plan
   - Enter activation key: `9e151cd2-ec6e-43fb-8c28-f853e94ff541`

4. **Importer premier workflow**
   - Cliquer **"+"** (New workflow)
   - Menu **"..."** (3 points) → **Import from File**
   - Sélectionner: `E:/ANA/automation_hub/workflows/agent_health_monitor.json`
   - Cliquer **Import**

5. **Configurer et activer**
   - Vérifier que tous les nodes sont valides (pas d'erreurs rouges)
   - Cliquer **Save** en haut à droite
   - Toggle **Active** pour démarrer le workflow

6. **Répéter pour Self-Improvement Tracker**
   - Importer `self_improvement_tracker.json`
   - Save + Activate

---

### Méthode 2: Via API (Avancé)

```bash
# Import Agent Health Monitor
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @"E:/ANA/automation_hub/workflows/agent_health_monitor.json"

# Import Self-Improvement Tracker
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @"E:/ANA/automation_hub/workflows/self_improvement_tracker.json"
```

---

## Organisation avec Folders (Premium)

Une fois la licence activée, créer structure de dossiers:

1. **Aller dans Workflows**
2. **Créer dossiers:**
   - `04_AGENT_ORCHESTRATION` (pour Agent Health Monitor)
   - `02_COGNITIVE_CORE` (pour Self-Improvement Tracker)

3. **Déplacer workflows dans dossiers appropriés**
   - Drag & drop ou menu contextuel

---

## Vérification Installation

### Agent Health Monitor

**Test immédiat:**
1. Ouvrir workflow dans n8n
2. Cliquer **"Execute Workflow"** (bouton play)
3. Vérifier output dans panneau de droite
4. Confirmer création de `E:/ANA/logs/agent_health_latest.json`

**Test automatique:**
Attendre 5 minutes, puis vérifier:
```bash
cat "E:/ANA/logs/agent_health_latest.json"
```

---

### Self-Improvement Tracker

**Test immédiat:**
1. Ouvrir workflow dans n8n
2. Modifier trigger temporairement:
   - Remplacer Cron par "Manual Trigger"
   - Ou laisser Cron et cliquer "Execute Workflow"
3. Vérifier création de:
   - `E:/ANA/metrics/daily_evolution_report.json`
   - `E:/ANA/reports/DAILY_EVOLUTION.md`

**Test automatique:**
Attendre jusqu'à 23h00, puis vérifier rapport du jour.

---

## Dépannage

### Erreur: "Cannot find module"
**Solution:** Vérifier que chemins dans workflows correspondent à ta structure:
- `E:/ANA/core/evolution/self_improver.cjs`
- `E:/Mémoire Claude/agents/`

### Erreur: "Permission denied"
**Solution:**
```bash
# Windows: Vérifier permissions
icacls "E:/ANA" /grant Users:F /T
```

### Workflow ne se déclenche pas automatiquement
**Solution:**
1. Vérifier que workflow est **Active** (toggle en haut à droite)
2. Vérifier logs n8n: `C:\Users\niwno\.n8n\logs\`
3. Redémarrer n8n si nécessaire

---

## Monitoring Workflows

### Via Interface n8n

**Executions:**
- Menu Executions (barre latérale gauche)
- Voir tous les runs passés
- Inspecter succès/échecs
- **Premium:** Custom search par date, status, etc.

**Workflow History (Premium):**
- Voir versions passées du workflow
- Rollback si modification casse quelque chose
- Comparer performances

---

## Prochains Workflows à Créer

1. **Daily Art Generation** (Priorité: Haute)
   - Intégration ComfyUI
   - Génération quotidienne automatique

2. **TAAFT Auto-Discovery** (Priorité: Haute)
   - Web scraping TAAFT
   - Découverte automatique nouveaux outils

3. **Code Analysis Pipeline** (Priorité: Medium)
   - Analyse code Ana
   - Génération diagrammes

4. **Agent Event Bus** (Priorité: Medium)
   - Communication inter-agents via n8n
   - Orchestration complexe

---

## Backup Workflows

**Important:** Toujours backup workflows avant modifications:

```bash
# Backup automatique via n8n export
# Settings → Import/Export → Export All Workflows
# Sauvegarder dans: E:/ANA/automation_hub/backups/
```

---

## Ressources

**n8n Documentation:**
- Workflows: https://docs.n8n.io/workflows/
- Nodes: https://docs.n8n.io/integrations/
- Cron syntax: https://crontab.guru/

**Ana Documentation:**
- Architecture: `E:/ANA/README.md`
- Roadmap: `E:/Mémoire Claude/ROADMAP.md`
- System Inventory: `E:/Mémoire Claude/INVENTAIRE_SYSTEME_REEL_ANA.md`

---

## Succès d'Importation

Quand les 2 workflows sont importés et actifs, tu devrais voir:

**Toutes les 5 minutes:**
- Nouveau fichier: `E:/ANA/logs/agent_health_latest.json`
- Alertes si agents down: `E:/ANA/logs/agent_alerts.log`

**Chaque jour à 23h00:**
- Rapport JSON: `E:/ANA/metrics/daily_evolution_report.json`
- Rapport Markdown: `E:/ANA/reports/DAILY_EVOLUTION.md`
- Alert si progression lente: `E:/ANA/logs/evolution_alerts.log`

**Ana commence à tracer sa propre évolution automatiquement.**

---

**Prêt à importer? Accède à http://localhost:5678 maintenant!**
