"""
Script pour supprimer completement Mochi de ComfyUIPage.jsx
"""
import re

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Supprimer le case MOCHI dans le switch
content = re.sub(r'\s*case MODES\.MOCHI:\s*workflow = buildMochiWorkflow\(\);\s*break;', '', content)

# 2. Supprimer ", Mochi" du subtitle
content = content.replace(', Mochi', '')

# 3. Supprimer le bouton/tab Mochi (lignes 748-754)
mochi_tab_pattern = r'\s*<button\s*className=\{`mode-tab \$\{mode === MODES\.MOCHI \? \'active\' : \'\'\}`\}\s*onClick=\{\(\) => setMode\(MODES\.MOCHI\)\}[^>]*>\s*[^<]*Mochi Video[^<]*</button>'
content = re.sub(mochi_tab_pattern, '', content, flags=re.DOTALL)

# 4. Supprimer les mochi-settings (lignes 915-...)
mochi_settings_pattern = r'\s*\{mode === MODES\.MOCHI && \(\s*<div className="mochi-settings">.*?</div>\s*\)\}'
content = re.sub(mochi_settings_pattern, '', content, flags=re.DOTALL)

# 5. Supprimer MOCHI de l'enum MODES s'il existe encore
content = re.sub(r",?\s*MOCHI:\s*'mochi'", '', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verifier
with open(path, 'r', encoding='utf-8') as f:
    new_content = f.read()

remaining = len([line for line in new_content.split('\n') if 'mochi' in line.lower()])
print(f"References Mochi restantes: {remaining}")
print("Done!")
