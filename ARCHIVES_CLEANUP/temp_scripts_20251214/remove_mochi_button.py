"""
Supprimer le bouton Mochi
"""
path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Trouver et supprimer les lignes du bouton Mochi (745-751)
new_lines = []
skip_until_closing = False
for i, line in enumerate(lines):
    if 'MODES.MOCHI' in line and 'className' in line:
        skip_until_closing = True
        continue
    if skip_until_closing:
        if '</button>' in line:
            skip_until_closing = False
        continue
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

# Verifier
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
count = content.lower().count('mochi')
print(f"References mochi restantes: {count}")
print("Done!")
