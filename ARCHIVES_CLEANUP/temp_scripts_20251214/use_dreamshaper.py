import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change model to DreamShaper
old_model = '"ckpt_name": "v1-5-pruned-emaonly.safetensors"'
new_model = '"ckpt_name": "dreamshaper_8.safetensors"'

if old_model in content:
    content = content.replace(old_model, new_model)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Changed AnimateDiff model to DreamShaper 8')
else:
    print('ERROR: Pattern not found')
