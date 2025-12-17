#!/bin/bash
echo "=== DIAGNOSTIC COMPLET E:/ANA ==="
echo ""
echo "1. INVENTAIRE FICHIERS"
echo "----------------------"
echo "Total fichiers: $(find E:/ANA -type f 2>/dev/null | wc -l)"
echo "Total dossiers: $(find E:/ANA -type d 2>/dev/null | wc -l)"
echo ""
echo "Par dossier principal:"
for dir in server agents ana-interface memory scripts config automation_hub; do
  if [ -d "E:/ANA/$dir" ]; then
    count=$(find "E:/ANA/$dir" -type f 2>/dev/null | wc -l)
    echo "  $dir: $count fichiers"
  fi
done
echo ""
echo "2. FICHIERS CRITIQUES"
echo "---------------------"
for file in server/ana-core.cjs agents/start_agents.cjs package.json .env; do
  if [ -f "E:/ANA/$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file MANQUANT"
  fi
done
echo ""
echo "3. COMPARAISON AVEC BACKUP"
echo "--------------------------"
ana_count=$(find "E:/ANA" -type f 2>/dev/null | wc -l)
backup_count=$(find "E:/ANA_BACKUP/ANA_SUPERIA_MEMOIRE" -type f 2>/dev/null | wc -l)
diff=$((backup_count - ana_count))
echo "  E:/ANA: $ana_count fichiers"
echo "  Backup: $backup_count fichiers"
echo "  Différence: $diff fichiers"
