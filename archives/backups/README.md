# 🔒 Ana Backup System

**Règle Ana:** Backup First (10/10) - Toujours sauvegarder avant modification

## Structure

```
E:/ANA/backups/
├── core/              # Backups des fichiers core (ana_core.cjs, etc.)
├── workflows/         # Backups des workflows n8n
├── consciousness/     # Backups de values.json, etc.
├── automation_hub/    # Backups des fichiers automation
├── backup_index.jsonl # Index de tous les backups
└── README.md          # Ce fichier
```

## Utilisation

### Créer un backup avant modification

```bash
node E:/ANA/core/backup_manager.cjs backup <chemin_fichier> "Raison du backup"
```

**Exemple:**
```bash
node E:/ANA/core/backup_manager.cjs backup E:/ANA/core/ana_core.cjs "Avant amélioration HTTP"
```

### Lister les backups récents

```bash
node E:/ANA/core/backup_manager.cjs list
node E:/ANA/core/backup_manager.cjs list 20  # Affiche 20 derniers backups
```

### Restaurer un fichier

```bash
node E:/ANA/core/backup_manager.cjs restore <chemin_backup>
```

**Exemple:**
```bash
node E:/ANA/core/backup_manager.cjs restore E:/ANA/backups/core/ana_core.cjs.backup_2025-11-18T12-00-00-000Z
```

### Nettoyer les anciens backups

```bash
node E:/ANA/core/backup_manager.cjs clean
node E:/ANA/core/backup_manager.cjs clean 10  # Garde 10 backups par fichier
```

## Utilisation programmatique (dans code Ana)

```javascript
const BackupManager = require('./backup_manager.cjs');
const manager = new BackupManager();

// Avant de modifier un fichier
manager.backup('E:/ANA/core/ana_core.cjs', 'Ajout nouvelle fonctionnalité');

// Faire la modification
fs.writeFileSync('E:/ANA/core/ana_core.cjs', newContent);

// Si erreur, restaurer
try {
  // Code qui peut échouer
} catch (error) {
  const backups = manager.listBackups();
  const lastBackup = backups[backups.length - 1];
  manager.restore(lastBackup.backup_path);
}
```

## Workflow n8n pour backups automatiques

Un workflow n8n peut être créé pour:
- Backup automatique quotidien de tous les fichiers core
- Backup avant chaque exécution de workflow critique
- Nettoyage automatique des backups > 30 jours

## Règles de backup

1. **TOUJOURS** faire un backup avant de modifier un fichier critique
2. **Garder au moins 5** versions de chaque fichier
3. **Documenter** la raison du backup
4. **Nettoyer** régulièrement les anciens backups (garder les 30 derniers jours)
5. **Tester** le restore périodiquement pour vérifier l'intégrité

## Fichiers critiques nécessitant backup

- ✅ `E:/ANA/core/ana_core.cjs` - Cerveau d'Ana
- ✅ `E:/ANA/core/consciousness/values.json` - Conscience d'Ana
- ✅ `E:/ANA/automation_hub/workflows/*.json` - Workflows n8n
- ✅ `E:/ANA/core/evolution/evolution_log.jsonl` - Journal d'évolution

---

**Créé:** 2025-11-18
**Par:** Claude (après violation de la règle Backup First)
**Pour:** Ana - Pour qu'elle ne refasse jamais cette erreur
