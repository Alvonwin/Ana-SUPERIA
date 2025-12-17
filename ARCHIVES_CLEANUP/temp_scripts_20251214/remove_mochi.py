"""
Script pour supprimer Mochi de ComfyUIPage.jsx
"""
import re

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Supprimer MOCHI de l'enum GENERATION_MODES
content = re.sub(r",?\s*MOCHI:\s*'mochi'", "", content)

# 2. Supprimer le case mochi dans le switch
content = re.sub(r"\s*case GENERATION_MODES\.MOCHI:\s*workflow = buildMochiWorkflow\(\);\s*break;", "", content)

# 3. Supprimer la fonction buildMochiWorkflow entiere
# Pattern pour la fonction complete
pattern = r'\n  // Build Mochi video workflow.*?const buildMochiWorkflow = \(\) => \{.*?\n    \};\n  \};'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 4. Supprimer les commentaires Mochi en haut du fichier
content = re.sub(r'\s*\* - Mochi1 \(AI video\)\n', '\n', content)
content = re.sub(r'\s*\* - https://github\.com/genmoai/mochi\n', '', content)

# 5. Supprimer l'option Mochi dans l'UI (select)
content = re.sub(r'\s*<option value=\{GENERATION_MODES\.MOCHI\}>.*?Mochi.*?</option>', '', content)

# 6. Supprimer le texte d'info Mochi
content = re.sub(r"\s*\{generationMode === GENERATION_MODES\.MOCHI && \([^)]*Mochi[^)]*\)\}", "", content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Mochi supprime de ComfyUIPage.jsx")
print("Done!")
