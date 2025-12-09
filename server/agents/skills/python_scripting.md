# Compétence: Scripting Python pour Modifications de Code

## Quand Utiliser
- Quand l'outil Edit de Claude Code échoue ("File unexpectedly modified")
- Pour des modifications atomiques sur des fichiers de code
- Pour des opérations regex complexes

## Pattern Standard

```python
"""
Description de ce que fait le script
"""
import re

path = 'E:/ANA/ana-interface/src/pages/MonFichier.jsx'

# 1. Lire le fichier
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Faire les modifications
# Option A: Remplacement simple
content = content.replace('ancien_texte', 'nouveau_texte')

# Option B: Regex
content = re.sub(r'pattern_regex', 'remplacement', content)

# Option C: Regex avec flags
content = re.sub(r'pattern_multilignes', 'remplacement', content, flags=re.DOTALL)

# 3. Sauvegarder
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# 4. Vérifier
with open(path, 'r', encoding='utf-8') as f:
    check = f.read()
count = check.count('element_a_verifier')
print(f"Occurrences trouvees: {count}")
print("Done!")
```

## Emplacement des Scripts
- Toujours dans: `E:/ANA/temp/`
- Nommer clairement: `fix_xyz.py`, `remove_abc.py`

## Exécution
```bash
python "E:/ANA/temp/mon_script.py"
```

## Exemples Réels

### Supprimer un bouton JSX
```python
path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'MODES.MOCHI' in line and 'className' in line:
        skip = True
        continue
    if skip and '</button>' in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
```

### Remplacer une fonction entière
```python
import re
path = 'fichier.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const maFonction = \(\) => \{.*?\n  \};'
content = re.sub(pattern, nouvelle_fonction, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
```

## Règles de Sécurité
1. TOUJOURS vérifier après modification
2. JAMAIS supprimer l'original sans backup
3. Tester le script mentalement avant de l'exécuter
