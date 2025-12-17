import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change selectedModel to fixed SD1.5 model for AnimateDiff
old_workflow = '''        "1": {
          "inputs": { "ckpt_name": selectedModel },
          "class_type": "CheckpointLoaderSimple"
        },'''

new_workflow = '''        "1": {
          "inputs": { "ckpt_name": "v1-5-pruned-emaonly.safetensors" },
          "class_type": "CheckpointLoaderSimple"
        },'''

if old_workflow in content:
    content = content.replace(old_workflow, new_workflow)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Changed AnimateDiff to use SD1.5 model')
else:
    print('ERROR: Pattern not found')
    if 'CheckpointLoaderSimple' in content:
        idx = content.find('buildAnimateDiffWorkflow')
        print(f'buildAnimateDiffWorkflow at index {idx}')
        print(content[idx:idx+600])
