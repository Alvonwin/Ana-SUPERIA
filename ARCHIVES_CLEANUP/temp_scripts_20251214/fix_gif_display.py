import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add isVideo flag to video results
old_video_return = '''            // Check for GIF output
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

new_video_return = '''            // Check for GIF output
            if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
              const gif = nodeOutput.gifs[0];
              return {
                video: {
                  url: `${COMFYUI_URL}/view?filename=${encodeURIComponent(gif.filename)}&subfolder=${encodeURIComponent(gif.subfolder || '')}&type=${gif.type || 'output'}`,
                  filename: gif.filename,
                  isVideo: true
                }
              };
            }
            // Check for video output (VHS_VideoCombine returns this for mp4/webm)
            if (nodeOutput.video) {
              const vid = Array.isArray(nodeOutput.video) ? nodeOutput.video[0] : nodeOutput.video;
              return {
                video: {
                  url: `${COMFYUI_URL}/view?filename=${encodeURIComponent(vid.filename)}&subfolder=${encodeURIComponent(vid.subfolder || '')}&type=${vid.type || 'output'}`,
                  filename: vid.filename,
                  isVideo: true
                }
              };
            }'''

# Fix 2: Update display logic to use isVideo flag or filename check
old_display = '''                {selectedImage.url?.includes('.gif') || selectedImage.url?.includes('.mp4') ? (
                  <video src={selectedImage.url} autoPlay loop muted className="result-video" />'''

new_display = '''                {selectedImage.isVideo || selectedImage.filename?.match(/\\.(gif|mp4|webm)$/i) ? (
                  <img src={selectedImage.url} alt="Generated GIF" className="result-image" style={{maxHeight: '100%'}} />'''

if old_video_return in content:
    content = content.replace(old_video_return, new_video_return)
    print('Step 1: Added isVideo flag to video results')
else:
    print('ERROR Step 1: Video return pattern not found')

if old_display in content:
    content = content.replace(old_display, new_display)
    print('Step 2: Updated display logic to use img tag for GIFs')
else:
    print('ERROR Step 2: Display pattern not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
