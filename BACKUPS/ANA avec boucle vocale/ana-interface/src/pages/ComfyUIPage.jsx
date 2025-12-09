import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconImage, IconWand2, IconDownload, IconLoader2, IconSettings,
  IconVideo, IconUpload, IconRefreshCw, IconPlay, IconZap, IconGallery,
  IconCheck, IconX, IconChevronDown
} from '../components/Icons';
import { toast, Toaster } from 'sonner';
import './ComfyUIPage.css';

const COMFYUI_URL = 'http://localhost:8188';
const BACKEND_URL = 'http://localhost:3338';

/**
 * Ana SUPERIA - ComfyUI Integration Page
 *
 * Features (2025 Best Practices):
 * - Text-to-Image (Stable Diffusion XL/SD1.5/Flux)
 * - Image-to-Image (img2img)
 * - AnimateDiff (video generation)
 * - Mochi1 (AI video)
 * - Real-time progress via WebSocket
 * - Multiple model selection
 * - Advanced settings
 * - Gallery with favorites
 *
 * Sources:
 * - https://comfyui.org/en/programmatic-image-generation-api-workflow
 * - https://github.com/guoyww/AnimateDiff
 * - https://github.com/genmoai/mochi
 */

// Generation modes
const MODES = {
  TEXT_TO_IMAGE: 'text2img',
  IMAGE_TO_IMAGE: 'img2img',
  ANIMATE_DIFF: 'animatediff',
  MOCHI: 'mochi'
};

// Available models (will be populated from ComfyUI)
const DEFAULT_MODELS = [
  { name: 'sd_xl_base_1.0.safetensors', label: 'SDXL Base 1.0' },
  { name: 'v1-5-pruned-emaonly.safetensors', label: 'SD 1.5' },
  { name: 'dreamshaper_8.safetensors', label: 'DreamShaper 8' },
  { name: 'flux1-dev-fp8.safetensors', label: 'Flux.1 Dev' }
];

const SAMPLERS = [
  'euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpm_2_ancestral',
  'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde',
  'dpmpp_2m', 'dpmpp_2m_sde', 'ddim', 'uni_pc'
];

function ComfyUIPage() {
  // Mode selection
  const [mode, setMode] = useState(MODES.TEXT_TO_IMAGE);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, bad anatomy, watermark, text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const abortControllerRef = useRef(null);

  // Results
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [gallery, setGallery] = useState([]);

  // Image upload (for img2img)
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);

  // Settings - Core
  const [selectedModel, setSelectedModel] = useState('sd_xl_base_1.0.safetensors');
  const [steps, setSteps] = useState(25);
  const [cfg, setCfg] = useState(7.5);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [sampler, setSampler] = useState('dpmpp_2m');
  const [seed, setSeed] = useState(-1);
  const [batchSize, setBatchSize] = useState(1);

  // Settings - img2img
  const [denoise, setDenoise] = useState(0.7);

  // Settings - AnimateDiff/Video
  const [frameCount, setFrameCount] = useState(16);
  const [fps, setFps] = useState(8);
  const [motionScale, setMotionScale] = useState(1.0);

  // Advanced settings toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // WebSocket for real-time progress
  const wsRef = useRef(null);

  // Check ComfyUI connection on mount
  useEffect(() => {
    checkConnection();
    loadGallery();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionError(null);

    try {
      // Timeout de 5 secondes pour ne pas rester bloqué
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${COMFYUI_URL}/system_stats`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setIsConnected(true);
        setConnectionError(null);
        toast.success('ComfyUI connecte');

        // Get available models
        await fetchModels();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // ComfyUI non disponible - essayer de le lancer via le backend
      setConnectionError('Demarrage de ComfyUI...');
      toast.info('Demarrage de ComfyUI...');

      try {
        const startResponse = await fetch(`${BACKEND_URL}/api/services/start/comfyui`, {
          method: 'POST'
        });
        const startResult = await startResponse.json();

        if (startResult.success) {
          toast.success('ComfyUI demarre! Connexion en cours...');
          // Attendre que ComfyUI soit pret puis reconnecter
          setTimeout(async () => {
            await checkConnectionDirect();
          }, 3000);
          return;
        } else {
          throw new Error(startResult.message || 'Echec demarrage');
        }
      } catch (startError) {
        setIsConnected(false);
        const errorMsg = startError.message || 'ComfyUI non disponible';
        setConnectionError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Connexion directe sans tentative de lancement
  const checkConnectionDirect = async () => {
    setIsCheckingConnection(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${COMFYUI_URL}/system_stats`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setIsConnected(true);
        setConnectionError(null);
        toast.success('ComfyUI connecte');
        await fetchModels();
      } else {
        throw new Error('ComfyUI non pret');
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionError('ComfyUI demarre mais pas encore pret. Reessayez.');
      toast.warning('ComfyUI pas encore pret. Cliquez Reessayer.');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${COMFYUI_URL}/object_info/CheckpointLoaderSimple`);
      const data = await response.json();
      if (data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0]) {
        const models = data.CheckpointLoaderSimple.input.required.ckpt_name[0].map(name => ({
          name,
          label: name.replace('.safetensors', '').replace(/_/g, ' ')
        }));
        setAvailableModels(models);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const loadGallery = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('ana_comfyui_gallery') || '[]');
      setGallery(saved);
    } catch (e) {
      console.error('Failed to load gallery:', e);
    }
  };

  const saveToGallery = useCallback((image) => {
    setGallery(prev => {
      const updated = [image, ...prev].slice(0, 50);
      localStorage.setItem('ana_comfyui_gallery', JSON.stringify(updated));
      return updated;
    });
    toast.success('Ajoute a la galerie');
  }, []);

  // Connect WebSocket for real-time progress
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket(`ws://localhost:8188/ws`);

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setProgress(Math.round((data.data.value / data.data.max) * 100));
          setCurrentStep(`Step ${data.data.value}/${data.data.max}`);
        } else if (data.type === 'executing') {
          setCurrentStep(data.data.node || 'Processing...');
        }
      };

      wsRef.current.onerror = () => {
        console.error('WebSocket error');
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, []);

  // File upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage({
        data: e.target.result,
        name: file.name
      });
      toast.success(`Image chargee: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Cancel generation
  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('Annulé');
    toast.info('Génération annulée');
  };

  // Generate image
  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Entre un prompt');
      return;
    }

    if (mode === MODES.IMAGE_TO_IMAGE && !uploadedImage) {
      toast.error('Upload une image pour img2img');
      return;
    }

    // Reset error state and create abort controller
    setGenerationError(null);
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('Initializing...');
    connectWebSocket();

    const toastId = toast.loading('Generation en cours...', { id: 'gen' });

    try {
      let workflow;

      switch (mode) {
        case MODES.TEXT_TO_IMAGE:
          workflow = buildText2ImgWorkflow();
          break;
        case MODES.IMAGE_TO_IMAGE:
          workflow = await buildImg2ImgWorkflow();
          break;
        case MODES.ANIMATE_DIFF:
          workflow = buildAnimateDiffWorkflow();
          break;
        case MODES.MOCHI:
          workflow = buildMochiWorkflow();
          break;
        default:
          workflow = buildText2ImgWorkflow();
      }

      const response = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      const data = await response.json();
      const promptId = data.prompt_id;

      // Poll for result
      const result = await pollForResult(promptId);

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        setSelectedImage(result.images[0]);
        toast.success(`${result.images.length} image(s) generee(s)!`, { id: toastId });
      } else if (result.video) {
        setSelectedImage(result.video);
        toast.success('Video generee!', { id: toastId });
      }

    } catch (error) {
      console.error('Generation error:', error);
      if (error.name === 'AbortError') {
        toast.info('Génération annulée', { id: toastId });
      } else {
        setGenerationError(error.message);
        toast.error('Erreur: ' + error.message, { id: toastId });
      }
    } finally {
      setIsGenerating(false);
      setProgress(100);
      setCurrentStep(generationError ? 'Erreur' : 'Complete');
      abortControllerRef.current = null;
    }
  };

  // Build Text-to-Image workflow
  const buildText2ImgWorkflow = () => {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "3": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": 1,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
          },
          "class_type": "KSampler"
        },
        "4": {
          "inputs": { "ckpt_name": selectedModel },
          "class_type": "CheckpointLoaderSimple"
        },
        "5": {
          "inputs": { "width": width, "height": height, "batch_size": batchSize },
          "class_type": "EmptyLatentImage"
        },
        "6": {
          "inputs": { "text": prompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": { "text": negativePrompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "8": {
          "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": { "filename_prefix": `Ana_${mode}`, "images": ["8", 0] },
          "class_type": "SaveImage"
        }
      }
    };
  };

  // Build Image-to-Image workflow
  const buildImg2ImgWorkflow = async () => {
    // Upload image to ComfyUI first
    const formData = new FormData();
    const blob = await fetch(uploadedImage.data).then(r => r.blob());
    formData.append('image', blob, uploadedImage.name);

    const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadResponse.json();
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "1": {
          "inputs": { "image": uploadData.name },
          "class_type": "LoadImage"
        },
        "2": {
          "inputs": { "pixels": ["1", 0], "vae": ["4", 2] },
          "class_type": "VAEEncode"
        },
        "3": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": denoise,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["2", 0]
          },
          "class_type": "KSampler"
        },
        "4": {
          "inputs": { "ckpt_name": selectedModel },
          "class_type": "CheckpointLoaderSimple"
        },
        "6": {
          "inputs": { "text": prompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": { "text": negativePrompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "8": {
          "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": { "filename_prefix": "Ana_img2img", "images": ["8", 0] },
          "class_type": "SaveImage"
        }
      }
    };
  };

  // Build AnimateDiff workflow
  const buildAnimateDiffWorkflow = () => {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        "1": {
          "inputs": { "ckpt_name": selectedModel },
          "class_type": "CheckpointLoaderSimple"
        },
        "2": {
          "inputs": { "model_name": "mm_sd_v15_v2.ckpt" },
          "class_type": "ADE_LoadAnimateDiffModel"
        },
        "3": {
          "inputs": { "motion_model": ["2", 0], "model": ["1", 0] },
          "class_type": "ADE_ApplyAnimateDiffModel"
        },
        "4": {
          "inputs": { "text": prompt, "clip": ["1", 1] },
          "class_type": "CLIPTextEncode"
        },
        "5": {
          "inputs": { "text": negativePrompt, "clip": ["1", 1] },
          "class_type": "CLIPTextEncode"
        },
        "6": {
          "inputs": { "width": 512, "height": 512, "batch_size": frameCount },
          "class_type": "EmptyLatentImage"
        },
        "7": {
          "inputs": {
            "seed": actualSeed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": sampler,
            "scheduler": "normal",
            "denoise": 1,
            "model": ["3", 0],
            "positive": ["4", 0],
            "negative": ["5", 0],
            "latent_image": ["6", 0]
          },
          "class_type": "KSampler"
        },
        "8": {
          "inputs": { "samples": ["7", 0], "vae": ["1", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": {
            "filename_prefix": "Ana_animatediff",
            "fps": fps,
            "images": ["8", 0]
          },
          "class_type": "VHS_VideoCombine"
        }
      }
    };
  };

  // Build Mochi video workflow
  // Requires: ComfyUI-MochiWrapper custom nodes
  // Install via ComfyUI Manager: https://github.com/kijai/ComfyUI-MochiWrapper
  const buildMochiWorkflow = () => {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

    return {
      prompt: {
        // Load Mochi model
        "1": {
          "inputs": {
            "model": "mochi_preview_bf16.safetensors",
            "precision": "bf16",
            "attention_mode": "sdpa"
          },
          "class_type": "DownloadAndLoadMochiModel"
        },
        // Load VAE
        "2": {
          "inputs": {
            "vae": "mochi_vae.safetensors"
          },
          "class_type": "DownloadAndLoadMochiVAE"
        },
        // Encode prompt with T5
        "3": {
          "inputs": {
            "prompt": prompt,
            "strength": 1.0,
            "force_offload": true
          },
          "class_type": "MochiTextEncode"
        },
        // Create empty latent for video
        "4": {
          "inputs": {
            "width": 848,
            "height": 480,
            "num_frames": frameCount,
            "batch_size": 1
          },
          "class_type": "MochiEmptyLatent"
        },
        // Mochi Sampler
        "5": {
          "inputs": {
            "model": ["1", 0],
            "positive": ["3", 0],
            "negative": negativePrompt,
            "latent": ["4", 0],
            "steps": Math.min(steps, 64),
            "cfg": Math.min(cfg, 4.5),
            "seed": actualSeed,
            "shift": 6.0,
            "force_offload": true
          },
          "class_type": "MochiSampler"
        },
        // Decode latents to video frames
        "6": {
          "inputs": {
            "vae": ["2", 0],
            "samples": ["5", 0],
            "enable_vae_tiling": true,
            "tile_sample_min_height": 240,
            "tile_sample_min_width": 424,
            "auto_tile_size": true
          },
          "class_type": "MochiDecode"
        },
        // Combine frames to video
        "7": {
          "inputs": {
            "frame_rate": fps,
            "loop_count": 0,
            "filename_prefix": "Ana_mochi",
            "format": "video/h264-mp4",
            "pingpong": false,
            "save_output": true,
            "images": ["6", 0]
          },
          "class_type": "VHS_VideoCombine"
        }
      }
    };
  };

  // Poll for generation result
  const pollForResult = async (promptId, maxAttempts = 120) => {
    for (let i = 0; i < maxAttempts; i++) {
      // Check if aborted
      if (abortControllerRef.current?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check again after waiting
      if (abortControllerRef.current?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      try {
        const response = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
          signal: abortControllerRef.current?.signal
        });
        const data = await response.json();

        if (data[promptId]?.status?.status_str === 'error') {
          throw new Error('Generation failed in ComfyUI');
        }

        if (data[promptId]?.outputs) {
          const outputs = data[promptId].outputs;

          // Check for images
          for (const nodeId of Object.keys(outputs)) {
            const nodeOutput = outputs[nodeId];
            if (nodeOutput.images) {
              return {
                images: nodeOutput.images.map(img => ({
                  url: `${COMFYUI_URL}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`,
                  filename: img.filename,
                  prompt: prompt,
                  timestamp: new Date().toISOString()
                }))
              };
            }
            if (nodeOutput.gifs) {
              return {
                video: {
                  url: `${COMFYUI_URL}/view?filename=${nodeOutput.gifs[0].filename}&subfolder=${nodeOutput.gifs[0].subfolder || ''}&type=${nodeOutput.gifs[0].type}`,
                  filename: nodeOutput.gifs[0].filename
                }
              };
            }
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        if (i === maxAttempts - 1) throw error;
      }
    }

    throw new Error('Generation timeout (2 min). ComfyUI ne répond pas.');
  };

  // Download image
  const downloadImage = async (image) => {
    if (!image?.url) return;

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename || `ana-comfyui-${Date.now()}.png`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success('Image telechargee');
    } catch (error) {
      toast.error('Erreur telechargement');
    }
  };

  return (
    <div className="comfyui-page">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="comfyui-header">
        <div className="header-title">
          <h2>ComfyUI - Generation IA</h2>
          <p className="subtitle">Images et Videos avec Stable Diffusion, AnimateDiff, Mochi</p>
        </div>
        <div className="header-status">
          <span className={`status-indicator ${isCheckingConnection ? 'checking' : isConnected ? 'connected' : 'disconnected'}`}>
            {isCheckingConnection ? (
              <><IconLoader2 size={14} className="spin" /> Connexion...</>
            ) : isConnected ? (
              <><IconCheck size={14} /> Connecte</>
            ) : (
              <><IconX size={14} /> Deconnecte</>
            )}
          </span>
          <button className="btn-refresh" onClick={checkConnection} disabled={isCheckingConnection}>
            <IconRefreshCw size={16} className={isCheckingConnection ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Connection Error Banner */}
      {!isCheckingConnection && !isConnected && connectionError && (
        <div className="connection-error-banner">
          <IconX size={18} />
          <span>{connectionError}</span>
          <span className="error-hint">Lance ComfyUI sur le port 8188, puis clique Rafraichir</span>
          <button onClick={checkConnection} className="btn-retry">
            <IconRefreshCw size={14} /> Reessayer
          </button>
        </div>
      )}

      {/* Mode Selection */}
      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === MODES.TEXT_TO_IMAGE ? 'active' : ''}`}
          onClick={() => setMode(MODES.TEXT_TO_IMAGE)}
        >
          <IconImage size={18} />
          Text to Image
        </button>
        <button
          className={`mode-tab ${mode === MODES.IMAGE_TO_IMAGE ? 'active' : ''}`}
          onClick={() => setMode(MODES.IMAGE_TO_IMAGE)}
        >
          <IconUpload size={18} />
          Image to Image
        </button>
        <button
          className={`mode-tab ${mode === MODES.ANIMATE_DIFF ? 'active' : ''}`}
          onClick={() => setMode(MODES.ANIMATE_DIFF)}
        >
          <IconVideo size={18} />
          AnimateDiff
        </button>
        <button
          className={`mode-tab ${mode === MODES.MOCHI ? 'active' : ''}`}
          onClick={() => setMode(MODES.MOCHI)}
          title="Generation video IA avec Mochi (necessite ComfyUI-MochiWrapper)"
        >
          <IconZap size={18} />
          Mochi Video
        </button>
      </div>

      <div className="comfyui-content">
        {/* Left Panel - Controls */}
        <div className="controls-panel">
          {/* Image Upload for img2img */}
          {mode === MODES.IMAGE_TO_IMAGE && (
            <div className="upload-section">
              <label>Image Source</label>
              <div
                className={`upload-zone ${uploadedImage ? 'has-image' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadedImage ? (
                  <img src={uploadedImage.data} alt="Upload" className="preview-image" />
                ) : (
                  <>
                    <IconUpload size={32} />
                    <span>Clique pour upload</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Prompt */}
          <div className="input-group">
            <label>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Decris ce que tu veux generer..."
              rows={4}
            />
          </div>

          {/* Negative Prompt */}
          <div className="input-group">
            <label>Negative Prompt</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Ce que tu ne veux PAS..."
              rows={2}
            />
          </div>

          {/* Model Selection */}
          <div className="input-group">
            <label>Modele</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              {availableModels.map(model => (
                <option key={model.name} value={model.name}>{model.label}</option>
              ))}
            </select>
          </div>

          {/* Basic Settings */}
          <div className="settings-grid">
            <div className="setting-item">
              <label>Steps: {steps}</label>
              <input
                type="range"
                min="10"
                max="50"
                value={steps}
                onChange={(e) => setSteps(+e.target.value)}
              />
            </div>
            <div className="setting-item">
              <label>CFG: {cfg}</label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={cfg}
                onChange={(e) => setCfg(+e.target.value)}
              />
            </div>
            {mode !== MODES.ANIMATE_DIFF && (
              <>
                <div className="setting-item">
                  <label>Width</label>
                  <select value={width} onChange={(e) => setWidth(+e.target.value)}>
                    <option value="512">512</option>
                    <option value="768">768</option>
                    <option value="1024">1024</option>
                    <option value="1280">1280</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>Height</label>
                  <select value={height} onChange={(e) => setHeight(+e.target.value)}>
                    <option value="512">512</option>
                    <option value="768">768</option>
                    <option value="1024">1024</option>
                    <option value="1280">1280</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Mode-specific settings */}
          {mode === MODES.IMAGE_TO_IMAGE && (
            <div className="input-group">
              <label>Denoise: {denoise}</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={denoise}
                onChange={(e) => setDenoise(+e.target.value)}
              />
              <small>0.1 = proche original, 1.0 = completement nouveau</small>
            </div>
          )}

          {mode === MODES.ANIMATE_DIFF && (
            <div className="settings-grid">
              <div className="setting-item">
                <label>Frames: {frameCount}</label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={frameCount}
                  onChange={(e) => setFrameCount(+e.target.value)}
                />
              </div>
              <div className="setting-item">
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

          {mode === MODES.MOCHI && (
            <div className="mochi-settings">
              <div className="mochi-info">
                <p>Mochi genere des videos IA de haute qualite.</p>
                <small>Necessite: ComfyUI-MochiWrapper + mochi_preview_bf16.safetensors</small>
              </div>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Frames: {frameCount} (~{(frameCount / fps).toFixed(1)}s)</label>
                  <input
                    type="range"
                    min="13"
                    max="85"
                    step="12"
                    value={frameCount}
                    onChange={(e) => setFrameCount(+e.target.value)}
                  />
                </div>
                <div className="setting-item">
                  <label>FPS: {fps}</label>
                  <input
                    type="range"
                    min="12"
                    max="30"
                    value={fps}
                    onChange={(e) => setFps(+e.target.value)}
                  />
                </div>
                <div className="setting-item">
                  <label>Resolution</label>
                  <select defaultValue="848x480">
                    <option value="848x480">848x480 (16:9)</option>
                    <option value="480x848">480x848 (9:16)</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>Steps: {steps} (max 64)</label>
                  <input
                    type="range"
                    min="20"
                    max="64"
                    value={Math.min(steps, 64)}
                    onChange={(e) => setSteps(+e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings Toggle */}
          <button
            className="btn-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <IconSettings size={16} />
            Parametres avances
            <IconChevronDown size={14} className={showAdvanced ? 'rotated' : ''} />
          </button>

          {showAdvanced && (
            <div className="advanced-settings">
              <div className="setting-item">
                <label>Sampler</label>
                <select value={sampler} onChange={(e) => setSampler(e.target.value)}>
                  {SAMPLERS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="setting-item">
                <label>Seed</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(+e.target.value)}
                  placeholder="-1 = random"
                />
              </div>
              <div className="setting-item">
                <label>Batch Size</label>
                <select value={batchSize} onChange={(e) => setBatchSize(+e.target.value)}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="generate-buttons">
            <button
              className="btn-generate"
              onClick={generateImage}
              disabled={isGenerating || !isConnected || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <IconLoader2 size={20} className="spin" />
                  {progress > 0 ? `${progress}%` : 'Generation...'}
                </>
              ) : (
                <>
                  <IconWand2 size={20} />
                  Generer
                </>
              )}
            </button>
            {isGenerating && (
              <button className="btn-cancel" onClick={cancelGeneration}>
                <IconX size={18} />
                Annuler
              </button>
            )}
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="progress-section">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">{currentStep}</span>
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="results-panel">
          {/* Main Image Display */}
          <div className="main-result">
            {selectedImage ? (
              <>
                {selectedImage.url?.includes('.gif') || selectedImage.url?.includes('.mp4') ? (
                  <video src={selectedImage.url} autoPlay loop muted className="result-video" />
                ) : (
                  <img src={selectedImage.url} alt="Generated" className="result-image" />
                )}
                <div className="result-actions">
                  <button onClick={() => downloadImage(selectedImage)}>
                    <IconDownload size={18} />
                    Telecharger
                  </button>
                  <button onClick={() => saveToGallery(selectedImage)}>
                    <IconGallery size={18} />
                    Galerie
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-result">
                <IconImage size={64} opacity={0.3} />
                <p>Ton image apparaitra ici</p>
              </div>
            )}
          </div>

          {/* Generated Images Thumbnails */}
          {generatedImages.length > 1 && (
            <div className="thumbnails-row">
              {generatedImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumbnail ${selectedImage === img ? 'selected' : ''}`}
                  onClick={() => setSelectedImage(img)}
                >
                  <img src={img.url} alt={`Generated ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="gallery-section">
              <h3><IconGallery size={18} /> Galerie</h3>
              <div className="gallery-grid">
                {gallery.slice(0, 12).map((img, idx) => (
                  <div
                    key={idx}
                    className="gallery-item"
                    onClick={() => setSelectedImage(img)}
                  >
                    <img src={img.url} alt={img.prompt || 'Gallery'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComfyUIPage;
