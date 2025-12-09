const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'validate-skills.js');
let errors = [];
let valid = 0;
let totalSkills = 0;

files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));

    // Vérifier structure
    if (!data.category) errors.push(`${file}: missing category`);
    if (!data.skills || !Array.isArray(data.skills)) {
      errors.push(`${file}: missing skills array`);
    } else {
      // Vérifier chaque skill
      data.skills.forEach((skill, i) => {
        if (!skill.id) errors.push(`${file} skill ${i}: missing id`);
        if (!skill.type) errors.push(`${file} skill ${i}: missing type`);
        if (!skill.name) errors.push(`${file} skill ${i}: missing name`);
        if (!skill.description) errors.push(`${file} skill ${i}: missing description`);
        if (!skill.pattern) errors.push(`${file} skill ${i}: missing pattern`);
        if (!skill.example) errors.push(`${file} skill ${i}: missing example`);
      });

      totalSkills += data.skills.length;

      if (data.skills.length !== 30) {
        errors.push(`${file}: has ${data.skills.length} skills (expected 30)`);
      }
    }
    valid++;
  } catch (e) {
    errors.push(`${file}: JSON PARSE ERROR - ${e.message}`);
  }
});

console.log('=== VALIDATION DES SKILLS ===');
console.log(`Fichiers JSON valides: ${valid}/${files.length}`);
console.log(`Total skills dans ces fichiers: ${totalSkills}`);
console.log('');
if (errors.length > 0) {
  console.log(`ERREURS TROUVEES (${errors.length}):`);
  errors.slice(0, 30).forEach(e => console.log(`  - ${e}`));
  if (errors.length > 30) console.log(`  ... et ${errors.length - 30} autres erreurs`);
} else {
  console.log('Aucune erreur! Tous les modules sont valides.');
}
