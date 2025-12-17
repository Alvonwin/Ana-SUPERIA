import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add debug logs after pollForResult
old_code = '''      const result = await pollForResult(promptId);

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        setSelectedImage(result.images[0]);'''

new_code = '''      const result = await pollForResult(promptId);
      console.log("[ComfyUI] Poll result:", result);

      if (result.images && result.images.length > 0) {
        console.log("[ComfyUI] Setting images:", result.images);
        console.log("[ComfyUI] First image URL:", result.images[0]?.url);
        setGeneratedImages(result.images);
        setSelectedImage(result.images[0]);'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Added debug logs')
else:
    print('ERROR: Pattern not found')
    # Show what's around line 342
    lines = content.split('\n')
    for i in range(340, min(355, len(lines))):
        print(f'{i+1}: {lines[i]}')
