"""
Script pour ajouter les TOOL_DEFINITIONS des outils image/video
"""
import re

path = 'E:/ANA/server/agents/tool-agent.cjs'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Les definitions a ajouter
tool_definitions = '''  // === IMAGE/VIDEO GENERATION TOOLS - Added 2025-12-09 ===
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
  },
'''

# Chercher ou inserer - apres generate_image definition, avant http_request
marker = "name: 'http_request'"
if marker in content and "name: 'generate_animation'" not in content:
    idx = content.find(marker)
    # Remonter pour trouver le debut de cet objet
    search_start = idx - 200
    brace_idx = content.rfind('{\n    type:', search_start, idx)
    if brace_idx > 0:
        content = content[:brace_idx] + tool_definitions + content[brace_idx:]
        print("SUCCESS: Added TOOL_DEFINITIONS")
    else:
        print("ERROR: Could not find insertion point")
else:
    if "name: 'generate_animation'" in content:
        print("SKIP: Definitions already present")
    else:
        print("ERROR: Marker not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
