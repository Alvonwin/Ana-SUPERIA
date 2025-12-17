import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Current workflow (without resize):
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
        "2": {
          "inputs": { "pixels": ["1", 0], "vae": ["4", 2] },
          "class_type": "VAEEncode"
        },
        "3": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": denoise,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["2", 0]
          },
          "class_type": "KSampler"
        },
        "4": {
          "inputs": { "ckpt_name": selectedModel },
          "class_type": "CheckpointLoaderSimple"
        },
        "6": {
          "inputs": { "text": prompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": { "text": negativePrompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "8": {
          "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": { "filename_prefix": "Ana_img2img", "images": ["8", 0] },
          "class_type": "SaveImage"
        }
      }
    };
  };'''

# New workflow with ImageScale to resize large images to target dimensions
new_workflow = '''  // Build Image-to-Image workflow
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
        },
        "3": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": denoise,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["2", 0]
          },
          "class_type": "KSampler"
        },
        "4": {
          "inputs": { "ckpt_name": selectedModel },
          "class_type": "CheckpointLoaderSimple"
        },
        "6": {
          "inputs": { "text": prompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": { "text": negativePrompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "8": {
          "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": { "filename_prefix": "Ana_img2img", "images": ["8", 0] },
          "class_type": "SaveImage"
        }
      }
    };
  };'''

if old_workflow in content:
    content = content.replace(old_workflow, new_workflow)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Added ImageScale node to img2img workflow')
    print('Now images will be resized to target dimensions before processing')
else:
    print('ERROR: Pattern not found. Checking current content...')
    # Find buildImg2ImgWorkflow
    if 'buildImg2ImgWorkflow' in content:
        idx = content.find('buildImg2ImgWorkflow')
        print(f'Found at index {idx}')
        print('Content around that area:')
        print(content[idx:idx+500])
    else:
        print('buildImg2ImgWorkflow not found in file')
