/**
 * FIX #6: Exclure les mots temporels de la détection de ville
 *
 * Problème: "demain" est capturé comme nom de ville, wttr.in trouve "Azle" Texas
 * Solution: Ajouter une liste noire de mots temporels
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ana-core.cjs');

// Backup
const backupPath = filePath + '.backup_temporal_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup créé:', backupPath);

let content = fs.readFileSync(filePath, 'utf8');

// Pattern à remplacer
const oldCode = `          // Patterns pour extraire la ville
          const locationPatterns = [
            /météo[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,
            /temps[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,
            /température[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i
          ];
          let location = 'Longueuil'; // Défaut - Ana habite à Longueuil
          for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              location = match[1].trim();
              break;
            }
          }
          console.log('🌤️ Météo pour:', location);`;

const newCode = `          // Patterns pour extraire la ville
          const locationPatterns = [
            /météo[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,
            /temps[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,
            /température[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i
          ];
          // Mots temporels à ignorer (pas des villes!)
          const temporalWords = ['demain', 'aujourd', 'hier', 'maintenant', 'actuellement', 'présentement', 'ce soir', 'ce matin', 'cette nuit', 'semaine', 'weekend'];
          let location = 'Longueuil'; // Défaut - Ana habite à Longueuil
          for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              const extracted = match[1].trim().toLowerCase();
              // Vérifier que ce n'est pas un mot temporel
              if (!temporalWords.some(tw => extracted.startsWith(tw))) {
                location = match[1].trim();
                break;
              }
            }
          }
          console.log('🌤️ Météo pour:', location);`;

if (content.includes('temporalWords')) {
  console.log('ℹ️ Le fix est déjà appliqué');
} else if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fix mots temporels appliqué!');
  console.log('');
  console.log('Maintenant "demain", "aujourd\'hui", etc. seront ignorés');
  console.log('et Longueuil sera utilisé par défaut.');
  console.log('');
  console.log('⚠️  REDÉMARRER LE SERVEUR!');
} else {
  console.log('❌ Pattern non trouvé - le code a peut-être changé');
  console.log('Recherche du pattern dans le fichier...');

  // Essayer de trouver une version similaire
  if (content.includes("let location = 'Longueuil'")) {
    console.log('✓ Trouvé: "let location = \'Longueuil\'"');
  }
  if (content.includes('Météo pour:')) {
    console.log('✓ Trouvé: "Météo pour:"');
  }
}
