import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove debug logs
old_code = '''      const result = await pollForResult(promptId);
      console.log("[ComfyUI] Poll result:", result);

      if (result.images && result.images.length > 0) {
        console.log("[ComfyUI] Setting images:", result.images);
        console.log("[ComfyUI] First image URL:", result.images[0]?.url);
        setGeneratedImages(result.images);
        setSelectedImage(result.images[0]);'''

new_code = '''      const result = await pollForResult(promptId);

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        setSelectedImage(result.images[0]);'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Removed debug logs')
else:
    print('INFO: Debug logs already removed or pattern changed')
