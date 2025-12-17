import os

path = 'E:/ANA/ana-interface/src/pages/ComfyUIPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add video format selector after FPS slider in AnimateDiff section
old_ui = '''              <div className="setting-item">
                <label>FPS: {fps}</label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={fps}
                  onChange={(e) => setFps(+e.target.value)}
                />
              </div>
            </div>
          )}

          {mode === MODES.MOCHI && ('''

new_ui = '''              <div className="setting-item">
                <label>FPS: {fps}</label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={fps}
                  onChange={(e) => setFps(+e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Format</label>
                <select value={videoFormat} onChange={(e) => setVideoFormat(e.target.value)}>
                  <option value="gif">GIF (universal)</option>
                  <option value="mp4">MP4 (compact)</option>
                  <option value="webm">WebM (quality)</option>
                </select>
              </div>
            </div>
          )}

          {mode === MODES.MOCHI && ('''

if old_ui in content:
    content = content.replace(old_ui, new_ui)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Added video format selector UI')
else:
    print('ERROR: UI pattern not found')
    # Debug
    if 'FPS: {fps}' in content:
        idx = content.find('FPS: {fps}')
        print(f'Found FPS at index {idx}')
        print(content[idx:idx+500])
