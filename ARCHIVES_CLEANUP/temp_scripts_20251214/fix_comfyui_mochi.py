"""
Script pour corriger le workflow Mochi dans ComfyUIPage.jsx
Le workflow actuel utilise des nodes qui n'existent pas.
"""
import re

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Le nouveau workflow Mochi correct
new_workflow = '''  // Build Mochi video workflow
  // Requires: ComfyUI-MochiWrapper custom nodes
  // Install via ComfyUI Manager: https://github.com/kijai/ComfyUI-MochiWrapper
  const buildMochiWorkflow = () => {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        // Load Mochi diffusion model
        "1": {
          "inputs": {
            "model_name": "mochi_preview_fp8_scaled.safetensors",
            "precision": "fp8_e4m3fn",
            "attention_mode": "sdpa"
          },
          "class_type": "MochiModelLoader"
        },
        // Load VAE
        "2": {
          "inputs": {
            "model_name": "mochi_vae.safetensors"
          },
          "class_type": "MochiVAELoader"
        },
        // Load T5 text encoder
        "3": {
          "inputs": {
            "clip_name": "t5xxl_fp8_e4m3fn_scaled.safetensors",
            "type": "mochi"
          },
          "class_type": "CLIPLoader"
        },
        // Encode positive prompt
        "4": {
          "inputs": {
            "clip": ["3", 0],
            "prompt": prompt,
            "strength": 1.0,
            "force_offload": true
          },
          "class_type": "MochiTextEncode"
        },
        // Encode negative prompt (empty)
        "5": {
          "inputs": {
            "clip": ["3", 0],
            "prompt": negativePrompt || "",
            "strength": 1.0,
            "force_offload": true
          },
          "class_type": "MochiTextEncode"
        },
        // Mochi Sampler - generates video latents
        "6": {
          "inputs": {
            "model": ["1", 0],
            "positive": ["4", 0],
            "negative": ["5", 0],
            "width": 848,
            "height": 480,
            "num_frames": Math.max(7, Math.min(frameCount, 49)),
            "steps": Math.min(steps, 50),
            "cfg": Math.min(cfg, 4.5),
            "seed": actualSeed
          },
          "class_type": "MochiSampler"
        },
        // Decode latents to video frames
        "7": {
          "inputs": {
            "vae": ["2", 0],
            "samples": ["6", 0],
            "enable_vae_tiling": true,
            "auto_tile_size": true,
            "frame_batch_size": 6,
            "tile_sample_min_height": 240,
            "tile_sample_min_width": 424,
            "tile_overlap_factor_height": 0.1666,
            "tile_overlap_factor_width": 0.2
          },
          "class_type": "MochiDecode"
        },
        // Save as animated WEBP
        "8": {
          "inputs": {
            "images": ["7", 0],
            "fps": fps,
            "filename_prefix": "Ana_mochi",
            "lossless": false,
            "quality": 90,
            "method": "default"
          },
          "class_type": "SaveAnimatedWEBP"
        }
      }
    };
  };'''

# Trouver et remplacer l'ancienne fonction buildMochiWorkflow
# Pattern pour capturer toute la fonction
pattern = r'  // Build Mochi video workflow.*?const buildMochiWorkflow = \(\) => \{.*?\n    \};\n  \};'

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, new_workflow, content, flags=re.DOTALL)
    print("SUCCESS: Workflow Mochi corrige dans ComfyUIPage.jsx")
else:
    print("ERROR: Pattern non trouve")
    # Essayer un pattern plus simple
    if 'DownloadAndLoadMochiModel' in content:
        print("INFO: Le fichier contient encore DownloadAndLoadMochiModel")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
