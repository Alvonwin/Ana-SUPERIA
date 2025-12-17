import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the URL construction - add encodeURIComponent and default type
old_line = "url: `${COMFYUI_URL}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`,"
new_line = "url: `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`,"

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Fixed URL encoding in ComfyUIPage.jsx')
else:
    print('ERROR: Pattern not found')
    # Show what's actually there
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'view?filename' in line:
            print(f'Line {i+1}: {repr(line)}')
