"""
Corriger l'erreur de syntaxe JSX - bouton orphelin
"""
path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer le bouton orphelin
old_text = """        </button>
        <button
      </div>"""

new_text = """        </button>
      </div>"""

if old_text in content:
    content = content.replace(old_text, new_text)
    print("Correction appliquee")
else:
    print("Pattern non trouve, essai alternatif...")
    # Essayer avec des variations d'espacement
    import re
    content = re.sub(r'</button>\s*<button\s*</div>', '</button>\n      </div>', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verifier
with open(path, 'r', encoding='utf-8') as f:
    check = f.read()
if '<button\n      </div>' not in check and '<button' not in check.split('</button>')[-1].split('</div>')[0]:
    print("Syntaxe corrigee!")
else:
    print("Verification en cours...")
    # Compter les occurrences
    print(f"Nombre de <button: {check.count('<button')}")
    print(f"Nombre de </button>: {check.count('</button>')}")
print("Done!")
