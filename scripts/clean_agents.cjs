#!/usr/bin/env node
/**
 * 🧹 Nettoyeur Agents ANA
 * Remplace toutes références "Claude" par "Ana"
 * Règle de propreté: Environnement clean TOUJOURS
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = 'E:/ANA/agents';
const BACKUP_DIR = 'E:/ANA/backups/agents_pre_clean';

// Règles de remplacement intelligentes
const replacements = [
  // Noms et références directes
  { from: /Claude Code/g, to: 'Ana' },
  { from: /Claude\s+Autonome/g, to: 'Ana Autonome' },
  { from: /\bClaude\b/g, to: 'Ana' },

  // Variables et chemins
  { from: /claude-code/g, to: 'ana' },
  { from: /claude_code/g, to: 'ana' },
  { from: /claudeCode/g, to: 'anaCore' },

  // Chemins fichiers (garder Mémoire Claude comme référence externe)
  { from: /E:\/Mémoire Claude\/agents/g, to: 'E:/ANA/agents' },

  // Constantes
  { from: /CLAUDE/g, to: 'ANA' },

  // Logs et messages
  { from: /Agents Autonomes Claude/g, to: 'Agents Autonomes Ana' },
  { from: /Agent de Claude/g, to: 'Agent d\'Ana' },
  { from: /pour Claude/g, to: 'pour Ana' },
];

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    let changeCount = 0;

    // Appliquer chaque remplacement
    for (const rule of replacements) {
      const before = content;
      content = content.replace(rule.from, rule.to);
      if (content !== before) {
        modified = true;
        changeCount++;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return changeCount;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Erreur ${filePath}:`, error.message);
    return -1;
  }
}

function cleanAgents() {
  console.log('🧹 Nettoyage agents ANA - Début\n');

  // Créer backup
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Backup dir créé: ${BACKUP_DIR}\n`);
  }

  // Lister tous les fichiers
  const files = fs.readdirSync(AGENTS_DIR);
  let totalFiles = 0;
  let totalChanges = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    const stat = fs.statSync(filePath);

    // Skip répertoires et fichiers non-code
    if (stat.isDirectory()) continue;
    if (!file.match(/\.(cjs|js|json|md|bat)$/)) {
      skipped++;
      continue;
    }

    // Backup avant modification
    const backupPath = path.join(BACKUP_DIR, file);
    fs.copyFileSync(filePath, backupPath);

    // Nettoyer
    const changes = cleanFile(filePath);
    if (changes > 0) {
      console.log(`✅ ${file}: ${changes} modifications`);
      totalFiles++;
      totalChanges += changes;
    } else if (changes === 0) {
      console.log(`   ${file}: Déjà propre`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎯 Nettoyage terminé!`);
  console.log(`   Fichiers modifiés: ${totalFiles}`);
  console.log(`   Total modifications: ${totalChanges}`);
  console.log(`   Fichiers skippés: ${skipped}`);
  console.log(`   Backups: ${BACKUP_DIR}`);
  console.log('='.repeat(50) + '\n');
}

// Auto-run
if (require.main === module) {
  cleanAgents();
}

module.exports = { cleanAgents };
