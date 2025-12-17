const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

// Backup
fs.copyFileSync(path, path + '.backup_before_4tools_' + Date.now());
console.log('Backup created');

let content = fs.readFileSync(path, 'utf8');

// 1. Ajouter les 4 TOOL_DEFINITIONS manquantes (avant la fermeture du tableau)
const newDefinitions = `
  // === 4 NOUVEAUX OUTILS PARITÉ CLAUDE CODE - 2025-12-08 ===
  {
    type: 'function',
    function: {
      name: 'execute_code',
      description: 'Exécuter du code Python et retourner le résultat.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code Python à exécuter' },
          language: { type: 'string', description: 'Langage (python par défaut)', default: 'python' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Générer une image à partir d\\'un prompt texte via ComfyUI.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description de l\\'image à générer' },
          negative_prompt: { type: 'string', description: 'Ce qu\\'on ne veut pas voir', default: '' },
          width: { type: 'integer', description: 'Largeur', default: 512 },
          height: { type: 'integer', description: 'Hauteur', default: 512 }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'http_request',
      description: 'Faire une requête HTTP GET/POST vers une URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL cible' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
          headers: { type: 'object', description: 'Headers HTTP' },
          body: { type: 'string', description: 'Corps de la requête (POST/PUT)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_yt_transcript',
      description: 'Obtenir la transcription d\\'une vidéo YouTube.',
      parameters: {
        type: 'object',
        properties: {
          video_url: { type: 'string', description: 'URL de la vidéo YouTube' },
          language: { type: 'string', description: 'Langue préférée', default: 'fr' }
        },
        required: ['video_url']
      }
    }
  },`;

// Trouver où insérer (avant launch_agent ou avant ];)
const insertPoint = content.indexOf("  // === LAUNCH AGENT TOOL ===");
if (insertPoint > 0) {
  content = content.slice(0, insertPoint) + newDefinitions + '\n' + content.slice(insertPoint);
  console.log('DEFINITIONS added before launch_agent');
} else {
  console.log('ERROR: Could not find insertion point for definitions');
  process.exit(1);
}

// 2. Ajouter les 4 TOOL_IMPLEMENTATIONS
const newImplementations = `

  // === 4 NOUVEAUX OUTILS PARITÉ CLAUDE CODE - 2025-12-08 ===

  async execute_code(args) {
    const { code, language = 'python' } = args;
    console.log(\`🔧 [ToolAgent] execute_code: \${language}\`);
    const { spawn } = require('child_process');

    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';

      const proc = spawn('python', ['-c', code], {
        timeout: 30000,
        cwd: 'E:/ANA/temp'
      });

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

      proc.on('close', (exitCode) => {
        resolve({
          success: exitCode === 0,
          output: output.trim(),
          error: errorOutput.trim(),
          exitCode
        });
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      // Timeout
      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: 'Timeout après 30 secondes' });
      }, 30000);
    });
  },

  async generate_image(args) {
    const { prompt, negative_prompt = '', width = 512, height = 512 } = args;
    console.log(\`🔧 [ToolAgent] generate_image: "\${prompt.substring(0, 50)}..."\`);

    // Vérifier si ComfyUI tourne
    const axios = require('axios');
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return {
        success: false,
        error: 'ComfyUI n\\'est pas démarré. Lance ComfyUI d\\'abord.',
        suggestion: 'Démarre ComfyUI depuis E:/AI_Tools/ComfyUI'
      };
    }

    // Créer le workflow basique
    const workflow = {
      prompt: {
        "3": {
          "class_type": "KSampler",
          "inputs": {
            "seed": Math.floor(Math.random() * 1000000),
            "steps": 20,
            "cfg": 7,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
          }
        },
        "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" } },
        "5": { "class_type": "EmptyLatentImage", "inputs": { "width": width, "height": height, "batch_size": 1 } },
        "6": { "class_type": "CLIPTextEncode", "inputs": { "text": prompt, "clip": ["4", 1] } },
        "7": { "class_type": "CLIPTextEncode", "inputs": { "text": negative_prompt, "clip": ["4", 1] } },
        "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
        "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "ana_generated", "images": ["8", 0] } }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      return {
        success: true,
        message: 'Image en cours de génération',
        prompt_id: response.data.prompt_id,
        output_dir: 'E:/AI_Tools/ComfyUI/output'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async http_request(args) {
    const { url, method = 'GET', headers = {}, body } = args;
    console.log(\`🔧 [ToolAgent] http_request: \${method} \${url}\`);
    const axios = require('axios');

    try {
      const config = {
        method: method.toLowerCase(),
        url,
        headers,
        timeout: 30000
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        config.data = body;
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        headers: response.headers,
        data: typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        status: err.response?.status
      };
    }
  },

  async get_yt_transcript(args) {
    const { video_url, language = 'fr' } = args;
    console.log(\`🔧 [ToolAgent] get_yt_transcript: \${video_url}\`);

    // Extraire l'ID de la vidéo
    const videoIdMatch = video_url.match(/(?:v=|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return { success: false, error: 'URL YouTube invalide' };
    }
    const videoId = videoIdMatch[1];

    // Utiliser l'API YouTube pour obtenir les sous-titres
    const axios = require('axios');
    try {
      // Essayer de récupérer via un service gratuit
      const response = await axios.get(\`https://www.youtube.com/watch?v=\${videoId}\`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // Chercher les captions dans la page
      const captionMatch = response.data.match(/"captionTracks":\\[(.*?)\\]/);
      if (!captionMatch) {
        return { success: false, error: 'Pas de sous-titres disponibles pour cette vidéo' };
      }

      // Parser et retourner les infos
      return {
        success: true,
        videoId,
        message: 'Sous-titres disponibles',
        note: 'Pour la transcription complète, utilise un service comme youtubetranscript.com'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },`;

// Trouver où insérer les implémentations (après le dernier async)
// Chercher "async launch_agent" ou la fin de TOOL_IMPLEMENTATIONS
const launchAgentImpl = content.indexOf('// === LAUNCH_AGENT IMPLEMENTATION ===');
const endOfImpl = content.lastIndexOf('  async launch_agent(args)');

if (endOfImpl > 0) {
  content = content.slice(0, endOfImpl) + newImplementations + '\n\n' + content.slice(endOfImpl);
  console.log('IMPLEMENTATIONS added before launch_agent');
} else {
  // Chercher la fin de run_background ou kill_process
  const killProcess = content.indexOf('  async kill_process(args)');
  if (killProcess > 0) {
    // Trouver la fin de cette fonction
    let braceCount = 0;
    let funcEnd = killProcess;
    let inFunc = false;
    for (let i = killProcess; i < content.length; i++) {
      if (content[i] === '{') { braceCount++; inFunc = true; }
      if (content[i] === '}') { braceCount--; }
      if (inFunc && braceCount === 0) {
        funcEnd = i + 1;
        // Chercher la virgule après
        while (funcEnd < content.length && (content[funcEnd] === ',' || content[funcEnd] === '\n' || content[funcEnd] === ' ')) {
          funcEnd++;
        }
        break;
      }
    }
    content = content.slice(0, funcEnd) + newImplementations + '\n' + content.slice(funcEnd);
    console.log('IMPLEMENTATIONS added after kill_process');
  } else {
    console.log('ERROR: Could not find insertion point for implementations');
    process.exit(1);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: 4 new tools added to tool-agent.cjs');
