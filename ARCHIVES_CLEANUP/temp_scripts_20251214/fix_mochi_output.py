"""
Script pour corriger la sortie video Mochi (utiliser SaveAnimatedWEBP au lieu de VHS_VideoCombine)
"""
path = 'E:/ANA/server/agents/tool-agent.cjs'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer VHS_VideoCombine par SaveAnimatedWEBP
old = '"8": { "inputs": { "images": ["7", 0], "frame_rate": fps, "filename_prefix": "ana_mochi", "format": "video/h264-mp4", "pingpong": false, "save_output": true }, "class_type": "VHS_VideoCombine" }'
new = '"8": { "inputs": { "images": ["7", 0], "fps": fps, "filename_prefix": "ana_mochi", "lossless": false, "quality": 90, "method": "default" }, "class_type": "SaveAnimatedWEBP" }'

if 'VHS_VideoCombine' in content:
    content = content.replace(old, new)
    print("SUCCESS: Remplace VHS_VideoCombine par SaveAnimatedWEBP")
else:
    print("INFO: VHS_VideoCombine non trouve, deja corrige?")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
