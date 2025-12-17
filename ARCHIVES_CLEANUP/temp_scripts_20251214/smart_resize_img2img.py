import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Current workflow with ImageScale always applied
old_workflow = '''  // Build Image-to-Image workflow
  const buildImg2ImgWorkflow = async () => {
    // Upload image to ComfyUI first
    const formData = new FormData();
    const blob = await fetch(uploadedImage.data).then(r => r.blob());
    formData.append('image', blob, uploadedImage.name);

    const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadResponse.json();
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "1": {
          "inputs": { "image": uploadData.name },
          "class_type": "LoadImage"
        },
        "10": {
          "inputs": {
            "upscale_method": "lanczos",
            "width": width,
            "height": height,
            "crop": "center",
            "image": ["1", 0]
          },
          "class_type": "ImageScale"
        },
        "2": {
          "inputs": { "pixels": ["10", 0], "vae": ["4", 2] },
          "class_type": "VAEEncode"
        },'''

# New workflow with smart resize (JS-side, only if > 1024)
new_workflow = '''  // Resize image if too large (> maxSize on any side)
  const resizeImageIfNeeded = (dataUrl, maxSize = 1024) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // If image is small enough, return original
        if (img.width <= maxSize && img.height <= maxSize) {
          resolve(dataUrl);
          return;
        }

        // Calculate new dimensions (maintain aspect ratio)
        let newWidth, newHeight;
        if (img.width > img.height) {
          newWidth = maxSize;
          newHeight = Math.round((img.height / img.width) * maxSize);
        } else {
          newHeight = maxSize;
          newWidth = Math.round((img.width / img.height) * maxSize);
        }

        // Resize using canvas
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Return resized image as data URL
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  };

  // Build Image-to-Image workflow
  const buildImg2ImgWorkflow = async () => {
    // Resize image if too large (> 1024px) before upload
    const resizedData = await resizeImageIfNeeded(uploadedImage.data, Math.max(width, height));

    // Upload image to ComfyUI
    const formData = new FormData();
    const blob = await fetch(resizedData).then(r => r.blob());
    formData.append('image', blob, uploadedImage.name);

    const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadResponse.json();
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "1": {
          "inputs": { "image": uploadData.name },
          "class_type": "LoadImage"
        },
        "2": {
          "inputs": { "pixels": ["1", 0], "vae": ["4", 2] },
          "class_type": "VAEEncode"
        },'''

if old_workflow in content:
    content = content.replace(old_workflow, new_workflow)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Implemented smart resize (JS-side, only if > target size)')
else:
    print('ERROR: Pattern not found')
    # Debug
    if 'buildImg2ImgWorkflow' in content:
        idx = content.find('buildImg2ImgWorkflow')
        print(f'Found at index {idx}')
        print(content[idx:idx+800])
