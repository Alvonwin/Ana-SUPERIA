"""
Script pour ajouter les outils image/video a tool-agent.cjs
"""
import re

path = 'E:/ANA/server/agents/tool-agent.cjs'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter les nouveaux outils dans validToolNames
old_tools = "'get_news', 'wikipedia_search', 'convert_units'\n  ];"
new_tools = """'get_news', 'wikipedia_search', 'convert_units',
    'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image'
  ];"""

if 'generate_animation' not in content:
    content = content.replace(old_tools, new_tools)
    print("Step 1: Added new tools to validToolNames")
else:
    print("Step 1: Tools already in validToolNames")

# 2. Ajouter les definitions des nouveaux outils (apres generate_image definition)
tool_definitions = '''
  // === IMAGE/VIDEO GENERATION TOOLS - Added 2025-12-09 ===
  {
    type: 'function',
    function: {
      name: 'generate_animation',
      description: 'Generer un GIF anime via AnimateDiff (ComfyUI). Utilise DreamShaper 8 pour meilleure qualite.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description de l\\'animation a generer' },
          negative_prompt: { type: 'string', description: 'Ce qu\\'on ne veut pas voir', default: 'blurry, low quality' },
          frame_count: { type: 'integer', description: 'Nombre de frames (8-24)', default: 16 },
          fps: { type: 'integer', description: 'Images par seconde', default: 8 },
          format: { type: 'string', enum: ['gif', 'mp4', 'webm'], default: 'gif' }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Generer une video via Mochi (ComfyUI). Haute qualite mais lent.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description de la video a generer' },
          duration: { type: 'integer', description: 'Duree en secondes (2-10)', default: 5 },
          fps: { type: 'integer', description: 'Images par seconde', default: 24 }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'image_to_image',
      description: 'Transformer une image existante avec un nouveau prompt (img2img).',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers l\\'image source' },
          prompt: { type: 'string', description: 'Description de la transformation' },
          negative_prompt: { type: 'string', description: 'Ce qu\\'on ne veut pas', default: '' },
          denoise: { type: 'number', description: 'Force de transformation 0.0-1.0', default: 0.75 }
        },
        required: ['image_path', 'prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'inpaint_image',
      description: 'Retoucher une zone specifique d\\'une image (inpainting).',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers l\\'image source' },
          mask_path: { type: 'string', description: 'Chemin vers le masque (blanc=zone a modifier)' },
          prompt: { type: 'string', description: 'Description de ce qui doit remplacer la zone masquee' },
          negative_prompt: { type: 'string', description: 'Ce qu\\'on ne veut pas', default: '' }
        },
        required: ['image_path', 'mask_path', 'prompt']
      }
    }
  },'''

# Inserer apres la definition de generate_image
if 'generate_animation' not in content:
    insert_marker = '''      name: 'generate_image',
      description: 'Generer une image a partir d\\'un prompt texte via ComfyUI.','''

    # Chercher la fin de la definition de generate_image
    gen_image_match = re.search(r"name: 'generate_image'.*?}\s*},", content, re.DOTALL)
    if gen_image_match:
        insert_pos = gen_image_match.end()
        content = content[:insert_pos] + tool_definitions + content[insert_pos:]
        print("Step 2: Added tool definitions")
    else:
        print("ERROR: Could not find generate_image definition")
else:
    print("Step 2: Tool definitions already present")

# 3. Ajouter les implementations des nouveaux outils
implementations = '''

  // === IMAGE/VIDEO GENERATION IMPLEMENTATIONS - Added 2025-12-09 ===
  async generate_animation(args) {
    const { prompt, negative_prompt = 'blurry, low quality', frame_count = 16, fps = 8, format = 'gif' } = args;
    console.log(`[ToolAgent] generate_animation: "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\\'est pas demarre.' };
    }

    const seed = Math.floor(Math.random() * 1000000000);
    const workflow = {
      prompt: {
        "1": { "inputs": { "ckpt_name": "dreamshaper_8.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "2": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
        "3": { "inputs": { "motion_model": ["2", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
        "10": { "inputs": { "model": ["1", 0], "beta_schedule": "sqrt_linear (AnimateDiff)", "m_models": ["3", 0] }, "class_type": "ADE_UseEvolvedSampling" },
        "4": { "inputs": { "text": prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "text": negative_prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
        "6": { "inputs": { "width": 512, "height": 512, "batch_size": frame_count }, "class_type": "EmptyLatentImage" },
        "7": { "inputs": { "seed": seed, "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["10", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
        "8": { "inputs": { "samples": ["7", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
        "9": { "inputs": { "images": ["8", 0], "frame_rate": fps, "loop_count": 0, "filename_prefix": "ana_animatediff", "format": format === 'gif' ? 'image/gif' : format === 'webm' ? 'video/webm' : 'video/h264-mp4', "pingpong": false, "save_image": true }, "class_type": "ADE_AnimateDiffCombine" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      return { success: true, message: 'Animation en cours de generation', prompt_id: response.data.prompt_id, output_dir: 'E:/AI_Tools/ComfyUI/ComfyUI/output' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async generate_video(args) {
    const { prompt, duration = 5, fps = 24 } = args;
    console.log(`[ToolAgent] generate_video (Mochi): "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\\'est pas demarre.' };
    }

    // Workflow Mochi basique
    const workflow = {
      prompt: {
        "1": { "inputs": { "model": "mochi_preview_bf16.safetensors" }, "class_type": "DownloadAndLoadMochiModel" },
        "2": { "inputs": { "t5_model": "t5xxl_fp16.safetensors", "precision": "fp16" }, "class_type": "MochiTextEncode" },
        "3": { "inputs": { "prompt": prompt, "mochi_model": ["1", 0], "t5_encoder": ["2", 0] }, "class_type": "MochiSampler" },
        "4": { "inputs": { "samples": ["3", 0] }, "class_type": "MochiDecode" },
        "5": { "inputs": { "images": ["4", 0], "frame_rate": fps, "filename_prefix": "ana_mochi" }, "class_type": "SaveAnimatedWEBP" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      return { success: true, message: 'Video Mochi en cours (peut prendre plusieurs minutes)', prompt_id: response.data.prompt_id, output_dir: 'E:/AI_Tools/ComfyUI/ComfyUI/output' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async image_to_image(args) {
    const { image_path, prompt, negative_prompt = '', denoise = 0.75 } = args;
    console.log(`[ToolAgent] image_to_image: "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(image_path)) {
      return { success: false, error: `Image non trouvee: ${image_path}` };
    }

    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\\'est pas demarre.' };
    }

    // Copier l'image dans input de ComfyUI
    const filename = path.basename(image_path);
    const destPath = `E:/AI_Tools/ComfyUI/ComfyUI/input/${filename}`;
    fs.copyFileSync(image_path, destPath);

    const workflow = {
      prompt: {
        "1": { "inputs": { "image": filename }, "class_type": "LoadImage" },
        "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
        "4": { "inputs": { "text": prompt, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "text": negative_prompt, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
        "6": { "inputs": { "seed": Math.floor(Math.random() * 1000000), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": denoise, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
        "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
        "8": { "inputs": { "filename_prefix": "ana_img2img", "images": ["7", 0] }, "class_type": "SaveImage" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      return { success: true, message: 'Transformation img2img en cours', prompt_id: response.data.prompt_id, output_dir: 'E:/AI_Tools/ComfyUI/ComfyUI/output' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async inpaint_image(args) {
    const { image_path, mask_path, prompt, negative_prompt = '' } = args;
    console.log(`[ToolAgent] inpaint_image: "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(image_path)) {
      return { success: false, error: `Image non trouvee: ${image_path}` };
    }
    if (!fs.existsSync(mask_path)) {
      return { success: false, error: `Masque non trouve: ${mask_path}` };
    }

    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\\'est pas demarre.' };
    }

    // Copier les fichiers dans input
    const imgFilename = path.basename(image_path);
    const maskFilename = 'mask_' + path.basename(mask_path);
    fs.copyFileSync(image_path, `E:/AI_Tools/ComfyUI/ComfyUI/input/${imgFilename}`);
    fs.copyFileSync(mask_path, `E:/AI_Tools/ComfyUI/ComfyUI/input/${maskFilename}`);

    const workflow = {
      prompt: {
        "1": { "inputs": { "image": imgFilename }, "class_type": "LoadImage" },
        "2": { "inputs": { "image": maskFilename, "channel": "red" }, "class_type": "LoadImageMask" },
        "3": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "4": { "inputs": { "pixels": ["1", 0], "vae": ["3", 2], "mask": ["2", 0] }, "class_type": "VAEEncodeForInpaint" },
        "5": { "inputs": { "text": prompt, "clip": ["3", 1] }, "class_type": "CLIPTextEncode" },
        "6": { "inputs": { "text": negative_prompt, "clip": ["3", 1] }, "class_type": "CLIPTextEncode" },
        "7": { "inputs": { "seed": Math.floor(Math.random() * 1000000), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["3", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["4", 0] }, "class_type": "KSampler" },
        "8": { "inputs": { "samples": ["7", 0], "vae": ["3", 2] }, "class_type": "VAEDecode" },
        "9": { "inputs": { "filename_prefix": "ana_inpaint", "images": ["8", 0] }, "class_type": "SaveImage" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      return { success: true, message: 'Inpainting en cours', prompt_id: response.data.prompt_id, output_dir: 'E:/AI_Tools/ComfyUI/ComfyUI/output' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },'''

# Inserer apres l'implementation de generate_image (apres la fermeture de la fonction)
if 'async generate_animation' not in content:
    # Chercher la fin de generate_image implementation
    gen_impl_match = re.search(r"async generate_image\(args\).*?return \{ success: false, error: err\.message \};\s*}\s*},", content, re.DOTALL)
    if gen_impl_match:
        insert_pos = gen_impl_match.end()
        content = content[:insert_pos] + implementations + content[insert_pos:]
        print("Step 3: Added tool implementations")
    else:
        print("ERROR: Could not find generate_image implementation end")
else:
    print("Step 3: Tool implementations already present")

# Sauvegarder
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
