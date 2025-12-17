import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire AnimateDiff workflow function
old_workflow = '''  // Build AnimateDiff workflow
  const buildAnimateDiffWorkflow = () => {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "1": {
          "inputs": { "ckpt_name": "v1-5-pruned-emaonly.safetensors" },
          "class_type": "CheckpointLoaderSimple"
        },
        "2": {
          "inputs": { "model_name": "mm_sd_v15_v2.ckpt" },
          "class_type": "ADE_LoadAnimateDiffModel"
        },
        "3": {
          "inputs": { "motion_model": ["2", 0], "model": ["1", 0] },
          "class_type": "ADE_ApplyAnimateDiffModel"
        },
        "4": {
          "inputs": { "text": prompt, "clip": ["1", 1] },
          "class_type": "CLIPTextEncode"
        },
        "5": {
          "inputs": { "text": negativePrompt, "clip": ["1", 1] },
          "class_type": "CLIPTextEncode"
        },
        "6": {
          "inputs": { "width": 512, "height": 512, "batch_size": frameCount },
          "class_type": "EmptyLatentImage"
        },
        "7": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": 1,
            "model": ["3", 0],
            "positive": ["4", 0],
            "negative": ["5", 0],
            "latent_image": ["6", 0]
          },
          "class_type": "KSampler"
        },
        "8": {
          "inputs": { "samples": ["7", 0], "vae": ["1", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": {
            "images": ["8", 0],
            "frame_rate": fps,
            "loop_count": 0,
            "filename_prefix": "Ana_animatediff",
            "format": videoFormat === 'gif' ? 'image/gif' : videoFormat === 'webm' ? 'video/webm' : 'video/h264-mp4',
            "pingpong": false,
            "save_image": true
          },
          "class_type": "ADE_AnimateDiffCombine"
        }
      }
    };
  };'''

new_workflow = '''  // Build AnimateDiff workflow (requires SD1.5 model + AnimateDiff-Evolved)
  const buildAnimateDiffWorkflow = () => {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "1": {
          "inputs": { "ckpt_name": "v1-5-pruned-emaonly.safetensors" },
          "class_type": "CheckpointLoaderSimple"
        },
        "2": {
          "inputs": { "model_name": "mm_sd_v15_v2.ckpt" },
          "class_type": "ADE_LoadAnimateDiffModel"
        },
        "3": {
          "inputs": { "motion_model": ["2", 0] },
          "class_type": "ADE_ApplyAnimateDiffModelSimple"
        },
        "10": {
          "inputs": {
            "model": ["1", 0],
            "beta_schedule": "sqrt_linear (AnimateDiff)",
            "m_models": ["3", 0]
          },
          "class_type": "ADE_UseEvolvedSampling"
        },
        "4": {
          "inputs": { "text": prompt, "clip": ["1", 1] },
          "class_type": "CLIPTextEncode"
        },
        "5": {
          "inputs": { "text": negativePrompt, "clip": ["1", 1] },
          "class_type": "CLIPTextEncode"
        },
        "6": {
          "inputs": { "width": 512, "height": 512, "batch_size": frameCount },
          "class_type": "EmptyLatentImage"
        },
        "7": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": 1,
            "model": ["10", 0],
            "positive": ["4", 0],
            "negative": ["5", 0],
            "latent_image": ["6", 0]
          },
          "class_type": "KSampler"
        },
        "8": {
          "inputs": { "samples": ["7", 0], "vae": ["1", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": {
            "images": ["8", 0],
            "frame_rate": fps,
            "loop_count": 0,
            "filename_prefix": "Ana_animatediff",
            "format": videoFormat === 'gif' ? 'image/gif' : videoFormat === 'webm' ? 'video/webm' : 'video/h264-mp4',
            "pingpong": false,
            "save_image": true
          },
          "class_type": "ADE_AnimateDiffCombine"
        }
      }
    };
  };'''

if old_workflow in content:
    content = content.replace(old_workflow, new_workflow)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Updated AnimateDiff workflow with correct nodes')
else:
    print('ERROR: Pattern not found')
    # Debug
    if 'buildAnimateDiffWorkflow' in content:
        idx = content.find('buildAnimateDiffWorkflow')
        print(f'Found at index {idx}')
        print(content[idx:idx+1500])
