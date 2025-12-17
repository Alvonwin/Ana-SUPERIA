const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

// Backup
const backup = path + '.backup_edit_fix_' + Date.now();
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

const oldCode = `  async edit_file(args) {
    const { file_path, old_string, new_string, replace_all = false } = args;
    console.log(\`🔧 [ToolAgent] edit_file: "\${file_path}"\`);
    const fs = require('fs');
    try {
      if (!fs.existsSync(file_path)) {
        return { success: false, error: \`Fichier non trouvé: \${file_path}\` };
      }
      const content = fs.readFileSync(file_path, 'utf-8');
      if (!content.includes(old_string)) {
        return { success: false, error: 'Chaîne à remplacer non trouvée dans le fichier' };
      }
      const newContent = replace_all
        ? content.split(old_string).join(new_string)
        : content.replace(old_string, new_string);
      fs.writeFileSync(file_path, newContent, 'utf-8');
      return { success: true, message: 'Fichier modifié avec succès' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },`;

const newCode = `  async edit_file(args) {
    const { file_path, old_string, new_string, replace_all = false } = args;
    console.log(\`🔧 [ToolAgent] edit_file: "\${file_path}"\`);
    const fs = require('fs');
    try {
      if (!fs.existsSync(file_path)) {
        return { success: false, error: \`Fichier non trouvé: \${file_path}\` };
      }

      // SECURITY FIX: Si old_string vide → mode APPEND à la fin du fichier
      if (!old_string || old_string.trim() === '') {
        const content = fs.readFileSync(file_path, 'utf-8');
        const newContent = content + (content.endsWith('\\n') ? '' : '\\n') + new_string;
        fs.writeFileSync(file_path, newContent, 'utf-8');
        return { success: true, message: 'Contenu ajouté à la fin du fichier' };
      }

      const content = fs.readFileSync(file_path, 'utf-8');
      if (!content.includes(old_string)) {
        return { success: false, error: 'Chaîne à remplacer non trouvée dans le fichier' };
      }
      const newContent = replace_all
        ? content.split(old_string).join(new_string)
        : content.replace(old_string, new_string);
      fs.writeFileSync(file_path, newContent, 'utf-8');
      return { success: true, message: 'Fichier modifié avec succès' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content, 'utf8');
  console.log('✓ edit_file FIX appliqué!');
} else {
  console.log('⚠ Pattern non trouvé - vérifier manuellement');
}
