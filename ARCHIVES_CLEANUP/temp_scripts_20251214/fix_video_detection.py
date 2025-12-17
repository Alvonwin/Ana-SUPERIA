import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Current code only checks for gifs
old_code = '''            if (nodeOutput.gifs) {
              return {
                video: {
                  url: `${COMFYUI_URL}/view?filename=${nodeOutput.gifs[0].filename}&subfolder=${nodeOutput.gifs[0].subfolder || ''}&type=${nodeOutput.gifs[0].type}`,
                  filename: nodeOutput.gifs[0].filename
                }
              };
            }'''

# New code checks for gifs OR video output from VHS
new_code = '''            // Check for GIF output
            if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
              const gif = nodeOutput.gifs[0];
              return {
                video: {
                  url: `${COMFYUI_URL}/view?filename=${encodeURIComponent(gif.filename)}&subfolder=${encodeURIComponent(gif.subfolder || '')}&type=${gif.type || 'output'}`,
                  filename: gif.filename
                }
              };
            }
            // Check for video output (VHS_VideoCombine returns this for mp4/webm)
            if (nodeOutput.video) {
              const vid = Array.isArray(nodeOutput.video) ? nodeOutput.video[0] : nodeOutput.video;
              return {
                video: {
                  url: `${COMFYUI_URL}/view?filename=${encodeURIComponent(vid.filename)}&subfolder=${encodeURIComponent(vid.subfolder || '')}&type=${vid.type || 'output'}`,
                  filename: vid.filename
                }
              };
            }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Added video output detection for VHS_VideoCombine')
else:
    print('ERROR: Pattern not found')
    # Debug
    if 'nodeOutput.gifs' in content:
        idx = content.find('nodeOutput.gifs')
        print(f'Found at index {idx}')
        print(content[idx:idx+400])
