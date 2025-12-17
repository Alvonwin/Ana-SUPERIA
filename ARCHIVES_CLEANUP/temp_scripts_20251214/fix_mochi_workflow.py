"""
Script pour corriger le workflow Mochi dans tool-agent.cjs
"""
import re

path = 'E:/ANA/server/agents/tool-agent.cjs'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# L'ancien workflow incorrect
old_workflow = '''    // Workflow Mochi basique
    const workflow = {
      prompt: {
        "1": { "inputs": { "model": "mochi_preview_fp8_scaled.safetensors" }, "class_type": "DownloadAndLoadMochiModel" },
        "2": { "inputs": { "t5_model": "t5xxl_fp8_e4m3fn_scaled.safetensors", "precision": "fp8_e4m3fn" }, "class_type": "MochiTextEncode" },
        "3": { "inputs": { "prompt": prompt, "mochi_model": ["1", 0], "t5_encoder": ["2", 0] }, "class_type": "MochiSampler" },
        "4": { "inputs": { "samples": ["3", 0] }, "class_type": "MochiDecode" },
        "5": { "inputs": { "images": ["4", 0], "frame_rate": fps, "filename_prefix": "ana_mochi" }, "class_type": "SaveAnimatedWEBP" }
      }
    };'''

# Le nouveau workflow correct
new_workflow = '''    // Workflow Mochi - Correct structure using MochiModelLoader + MochiVAELoader + CLIPLoader
    const seed = Math.floor(Math.random() * 1000000000);
    const num_frames = Math.min(Math.max(duration * 6, 7), 49); // 6 frames/sec, min 7, max 49

    const workflow = {
      prompt: {
        "1": { "inputs": { "model_name": "mochi_preview_fp8_scaled.safetensors", "precision": "fp8_e4m3fn", "attention_mode": "sdpa" }, "class_type": "MochiModelLoader" },
        "2": { "inputs": { "model_name": "mochi_vae.safetensors" }, "class_type": "MochiVAELoader" },
        "3": { "inputs": { "clip_name": "t5xxl_fp8_e4m3fn_scaled.safetensors", "type": "mochi" }, "class_type": "CLIPLoader" },
        "4": { "inputs": { "clip": ["3", 0], "prompt": prompt }, "class_type": "MochiTextEncode" },
        "5": { "inputs": { "clip": ["3", 0], "prompt": "" }, "class_type": "MochiTextEncode" },
        "6": { "inputs": { "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "width": 848, "height": 480, "num_frames": num_frames, "steps": 30, "cfg": 4.5, "seed": seed }, "class_type": "MochiSampler" },
        "7": { "inputs": { "vae": ["2", 0], "samples": ["6", 0], "enable_vae_tiling": true, "auto_tile_size": true, "frame_batch_size": 6, "tile_sample_min_height": 240, "tile_sample_min_width": 424, "tile_overlap_factor_height": 0.1666, "tile_overlap_factor_width": 0.2 }, "class_type": "MochiDecode" },
        "8": { "inputs": { "images": ["7", 0], "frame_rate": fps, "filename_prefix": "ana_mochi", "format": "video/h264-mp4", "pingpong": false, "save_output": true }, "class_type": "VHS_VideoCombine" }
      }
    };'''

if 'MochiModelLoader' not in content:
    if 'DownloadAndLoadMochiModel' in content:
        content = content.replace(old_workflow, new_workflow)
        print("SUCCESS: Workflow Mochi corrige")
    else:
        print("ERROR: Ancien workflow non trouve")
else:
    print("SKIP: Workflow deja corrige")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
