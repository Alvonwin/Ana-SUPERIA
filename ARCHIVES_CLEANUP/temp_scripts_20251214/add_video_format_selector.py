import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add videoFormat state after motionScale
old_state = '''  // Settings - AnimateDiff/Video
  const [frameCount, setFrameCount] = useState(16);
  const [fps, setFps] = useState(8);
  const [motionScale, setMotionScale] = useState(1.0);

  // Advanced settings toggle'''

new_state = '''  // Settings - AnimateDiff/Video
  const [frameCount, setFrameCount] = useState(16);
  const [fps, setFps] = useState(8);
  const [motionScale, setMotionScale] = useState(1.0);
  const [videoFormat, setVideoFormat] = useState('gif'); // gif, mp4, webm

  // Advanced settings toggle'''

if old_state in content:
    content = content.replace(old_state, new_state)
    print('Step 1: Added videoFormat state')
else:
    print('ERROR Step 1: State pattern not found')

# 2. Update AnimateDiff workflow to use videoFormat
old_workflow = '''        "9": {
          "inputs": {
            "filename_prefix": "Ana_animatediff",
            "fps": fps,
            "images": ["8", 0]
          },
          "class_type": "VHS_VideoCombine"
        }'''

new_workflow = '''        "9": {
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

if old_workflow in content:
    content = content.replace(old_workflow, new_workflow)
    print('Step 2: Updated AnimateDiff workflow')
else:
    print('ERROR Step 2: Workflow pattern not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! Now need to add UI selector.')
