import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace VHS_VideoCombine with ADE_AnimateDiffCombine (which is available)
old_node = '''        "9": {
          "inputs": {
            "frame_rate": fps,
            "loop_count": 0,
            "filename_prefix": "Ana_animatediff",
            "format": videoFormat === 'gif' ? 'image/gif' : videoFormat === 'webm' ? 'video/webm' : 'video/h264-mp4',
            "pingpong": false,
            "save_output": true,
            "images": ["8", 0]
          },
          "class_type": "VHS_VideoCombine"
        }'''

new_node = '''        "9": {
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
        }'''

if old_node in content:
    content = content.replace(old_node, new_node)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Changed VHS_VideoCombine to ADE_AnimateDiffCombine')
else:
    print('ERROR: VHS_VideoCombine pattern not found')
    # Debug
    if 'VHS_VideoCombine' in content:
        idx = content.find('VHS_VideoCombine')
        print(f'Found at index {idx}')
        print(content[idx-300:idx+100])
    else:
        print('VHS_VideoCombine not in file at all')
