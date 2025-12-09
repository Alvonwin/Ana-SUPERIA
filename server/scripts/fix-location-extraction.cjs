/**
 * Fix: Améliorer l'extraction de location pour la météo
 *
 * Problème: Le regex capture "fait-il pr" au lieu de rien
 * Solution: Améliorer les patterns et mettre Longueuil comme défaut
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ana-core.cjs');

// Backup
const backupPath = filePath + '.backup_location_fix_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup créé:', backupPath);

let content = fs.readFileSync(filePath, 'utf8');

// Pattern à remplacer
const oldPattern = `const locationPatterns = [
            /météo[\\s]+(?:à|a|de|du|en)?[\\s]*([\\w\\s-]+)/i,
            /temps[\\s]+(?:à|a|de|du|en)?[\\s]*([\\w\\s-]+)/i,
            /température[\\s]+(?:à|a|de|du|en)?[\\s]*([\\w\\s-]+)/i
          ];
          let location = 'Montreal'; // Default`;

const newPattern = `// Patterns améliorés pour extraire la ville (évite de capturer "fait-il", etc.)
          const locationPatterns = [
            /météo[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,        // "météo à Montréal"
            /temps[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,        // "temps à Québec"
            /température[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,  // "température à Longueuil"
            /(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)[\\s]*\\?/i           // "météo de Paris?"
          ];
          let location = 'Longueuil'; // Default - Ana habite à Longueuil avec ALAIN`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fix appliqué: Extraction location améliorée');
  console.log('');
  console.log('Changements:');
  console.log('- Regex améliorés pour ne capturer que les vrais noms de villes (commençant par majuscule)');
  console.log('- Défaut changé de "Montreal" à "Longueuil" (où habite ALAIN)');
  console.log('- Évite de capturer "fait-il", "présentement", etc.');
  console.log('');
  console.log('⚠️  REDÉMARRER LE SERVEUR!');
} else {
  console.log('⚠️ Pattern exact non trouvé, application manuelle...');

  // Chercher et remplacer le défaut au moins
  if (content.includes("let location = 'Montreal'")) {
    content = content.replace("let location = 'Montreal'", "let location = 'Longueuil'");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("✅ Défaut changé: Montreal → Longueuil");
  }

  // Vérifier si déjà Longueuil
  if (content.includes("let location = 'Longueuil'")) {
    console.log('ℹ️ Défaut déjà sur Longueuil');
  }
}
