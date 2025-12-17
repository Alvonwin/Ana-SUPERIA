/**
 * Améliorer edit_file pour créer des backups automatiques
 */
const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

const oldEditFile = `  async edit_file(args) {
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

const newEditFile = `  async edit_file(args) {
    const { file_path, old_string, new_string, replace_all = false } = args;
    console.log(\`🔧 [ToolAgent] edit_file: "\${file_path}"\`);
    const fs = require('fs');
    const path = require('path');
    try {
      if (!fs.existsSync(file_path)) {
        return { success: false, error: \`Fichier non trouvé: \${file_path}\` };
      }
      const content = fs.readFileSync(file_path, 'utf-8');
      if (!content.includes(old_string)) {
        return {
          success: false,
          error: 'Chaîne à remplacer non trouvée dans le fichier',
          hint: 'Vérifie que old_string est EXACTEMENT identique au contenu du fichier (espaces, sauts de ligne inclus)'
        };
      }
      // BACKUP AUTOMATIQUE avant modification
      const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const backupPath = file_path + '.backup_' + timestamp + '_ana';
      fs.copyFileSync(file_path, backupPath);
      console.log(\`📁 [ToolAgent] Backup créé: \${backupPath}\`);

      const newContent = replace_all
        ? content.split(old_string).join(new_string)
        : content.replace(old_string, new_string);
      fs.writeFileSync(file_path, newContent, 'utf-8');
      return {
        success: true,
        message: 'Fichier modifié avec succès',
        backup: backupPath
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },`;

if (content.includes(oldEditFile)) {
  content = content.replace(oldEditFile, newEditFile);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[EDIT_FILE] Upgraded with automatic backup and better error hints');
} else {
  console.log('[EDIT_FILE] Pattern not found');
}
