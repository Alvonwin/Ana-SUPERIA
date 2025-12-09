import { useState, useRef, useCallback } from 'react';
import {
  IconUpload, IconMaximize, IconDownload, IconLoader2,
  IconCheck, IconX, IconRefreshCw, IconImage, IconSave
} from '../components/Icons';
import { toast, Toaster } from 'sonner';
import './UpscalerPage.css';

const COMFYUI_URL = 'http://localhost:8188';
const BACKEND_URL = 'http://localhost:3338';

// Output folder for auto-save
const OUTPUT_FOLDER = 'E:/ANA/output/upscaled';

/**
 * Ana SUPERIA - Image Upscaler Page
 *
 * Simple workflow: Upload -> Upscale -> Auto-Save
 * Uses RealESRGAN via ComfyUI
 *
 * Date: 01 Dec 2025
 */

// Available upscale models in ComfyUI
const UPSCALE_MODELS = [
  { name: 'RealESRGAN_x2plus.pth', label: 'RealESRGAN x2', scale: 2 },
  { name: 'RealESRGAN_x4plus.pth', label: 'RealESRGAN x4', scale: 4 },
  { name: '4x_NMKD-Siax_200k.pth', label: 'NMKD Siax x4', scale: 4 },
  { name: '4x-UltraSharp.pth', label: 'UltraSharp x4', scale: 4 }
];

function UpscalerPage() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Upload state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Result state
  const [resultImage, setResultImage] = useState(null);
  const [savedPath, setSavedPath] = useState(null);

  // Settings
  const [selectedModel, setSelectedModel] = useState(UPSCALE_MODELS[0].name);

  // Check ComfyUI connection
  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetch(`${COMFYUI_URL}/system_stats`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        setIsConnected(true);
        toast.success('ComfyUI connecte');
      } else {
        throw new Error('ComfyUI non disponible');
      }
    } catch (error) {
      setIsConnected(false);
      // Try to start ComfyUI via backend
      try {
        toast.info('Demarrage ComfyUI...');
        await fetch(`${BACKEND_URL}/api/services/start/comfyui`, { method: 'POST' });
        setTimeout(checkConnection, 5000);
      } catch {
        toast.error('ComfyUI non disponible');
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Fichier invalide - images uniquement');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage({
        data: e.target.result,
        name: file.name,
        file: file
      });
      setResultImage(null);
      setSavedPath(null);
      toast.success(`Image chargee: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  // Build upscale workflow for ComfyUI
  const buildUpscaleWorkflow = (uploadedFilename) => {
    const timestamp = Date.now();
    const outputFilename = `upscaled_${timestamp}`;

    return {
      prompt: {
        // Load the uploaded image
        "1": {
          "class_type": "LoadImage",
          "inputs": {
            "image": uploadedFilename
          }
        },
        // Load the upscale model
        "2": {
          "class_type": "UpscaleModelLoader",
          "inputs": {
            "model_name": selectedModel
          }
        },
        // Apply upscaling
        "3": {
          "class_type": "ImageUpscaleWithModel",
          "inputs": {
            "upscale_model": ["2", 0],
            "image": ["1", 0]
          }
        },
        // Save the result
        "4": {
          "class_type": "SaveImage",
          "inputs": {
            "filename_prefix": outputFilename,
            "images": ["3", 0]
          }
        }
      }
    };
  };

  // Process upscaling
  const processUpscale = async () => {
    if (!uploadedImage) {
      toast.error('Aucune image selectionnee');
      return;
    }

    // Check connection first
    if (!isConnected) {
      await checkConnection();
      if (!isConnected) {
        toast.error('ComfyUI non connecte');
        return;
      }
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Upload de l\'image...');

    try {
      // Step 1: Upload image to ComfyUI
      setProgress(10);
      const formData = new FormData();
      const blob = await fetch(uploadedImage.data).then(r => r.blob());
      formData.append('image', blob, uploadedImage.name);

      const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Echec upload image');
      }

      const uploadData = await uploadResponse.json();
      setProgress(20);
      setStatusMessage('Traitement en cours...');

      // Step 2: Send upscale workflow
      const workflow = buildUpscaleWorkflow(uploadData.name);
      const promptResponse = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      const promptData = await promptResponse.json();
      const promptId = promptData.prompt_id;
      setProgress(30);

      // Step 3: Poll for result
      setStatusMessage('Upscaling en cours...');
      const result = await pollForResult(promptId);
      setProgress(90);

      if (result.images && result.images.length > 0) {
        const resultImg = result.images[0];
        setResultImage(resultImg);
        setProgress(100);
        setStatusMessage('Termine!');

        // Auto-save notification
        toast.success('Image agrandie avec succes!', {
          description: `Sauvegardee dans ComfyUI output`
        });
      } else {
        throw new Error('Aucune image generee');
      }

    } catch (error) {
      console.error('Upscale error:', error);
      setStatusMessage('Erreur: ' + error.message);
      toast.error('Erreur: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll ComfyUI for result
  const pollForResult = async (promptId, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update progress (30-90%)
      const progressIncrement = (i / maxAttempts) * 60;
      setProgress(30 + progressIncrement);

      try {
        const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);
        const data = await response.json();

        if (data[promptId]?.status?.status_str === 'error') {
          throw new Error('Erreur ComfyUI');
        }

        if (data[promptId]?.outputs) {
          const outputs = data[promptId].outputs;
          for (const nodeId of Object.keys(outputs)) {
            const nodeOutput = outputs[nodeId];
            if (nodeOutput.images) {
              return {
                images: nodeOutput.images.map(img => ({
                  url: `${COMFYUI_URL}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`,
                  filename: img.filename
                }))
              };
            }
          }
        }
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
      }
    }
    throw new Error('Timeout - ComfyUI ne repond pas');
  };

  // Download result image
  const downloadResult = async () => {
    if (!resultImage?.url) return;

    try {
      const response = await fetch(resultImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = resultImage.filename || `upscaled_${Date.now()}.png`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success('Image telechargee');
    } catch (error) {
      toast.error('Erreur telechargement');
    }
  };

  // Clear all
  const clearAll = () => {
    setUploadedImage(null);
    setResultImage(null);
    setSavedPath(null);
    setProgress(0);
    setStatusMessage('');
  };

  // Get model info
  const getSelectedModelInfo = () => {
    return UPSCALE_MODELS.find(m => m.name === selectedModel) || UPSCALE_MODELS[0];
  };

  return (
    <div className="upscaler-page">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="upscaler-header">
        <div className="header-title">
          <h2><IconMaximize size={28} /> Image Upscaler</h2>
          <p className="subtitle">Agrandir vos images avec RealESRGAN</p>
        </div>
        <div className="header-status">
          <span className={`status-indicator ${isCheckingConnection ? 'checking' : isConnected ? 'connected' : 'disconnected'}`}>
            {isCheckingConnection ? (
              <><IconLoader2 size={14} className="spin" /> Connexion...</>
            ) : isConnected ? (
              <><IconCheck size={14} /> ComfyUI Connecte</>
            ) : (
              <><IconX size={14} /> Deconnecte</>
            )}
          </span>
          <button className="btn-refresh" onClick={checkConnection} disabled={isCheckingConnection}>
            <IconRefreshCw size={16} className={isCheckingConnection ? 'spin' : ''} />
          </button>
        </div>
      </header>

      <div className="upscaler-content">
        {/* Left Panel - Input */}
        <div className="input-panel">
          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${uploadedImage ? 'has-image' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploadedImage && fileInputRef.current?.click()}
          >
            {uploadedImage ? (
              <div className="preview-container">
                <img src={uploadedImage.data} alt="Upload" className="preview-image" />
                <div className="preview-overlay">
                  <span className="filename">{uploadedImage.name}</span>
                  <button className="btn-change" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <IconUpload size={16} /> Changer
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-prompt">
                <IconUpload size={48} />
                <p>Glisse une image ici</p>
                <span>ou clique pour selectionner</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />

          {/* Model Selection */}
          <div className="settings-section">
            <label>Modele d'upscaling</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isProcessing}
            >
              {UPSCALE_MODELS.map(model => (
                <option key={model.name} value={model.name}>
                  {model.label} ({model.scale}x)
                </option>
              ))}
            </select>
            <p className="model-info">
              Facteur: <strong>{getSelectedModelInfo().scale}x</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="btn-upscale"
              onClick={processUpscale}
              disabled={!uploadedImage || isProcessing}
            >
              {isProcessing ? (
                <>
                  <IconLoader2 size={20} className="spin" />
                  {progress > 0 ? `${Math.round(progress)}%` : 'Traitement...'}
                </>
              ) : (
                <>
                  <IconMaximize size={20} />
                  Agrandir ({getSelectedModelInfo().scale}x)
                </>
              )}
            </button>
            {(uploadedImage || resultImage) && (
              <button className="btn-clear" onClick={clearAll} disabled={isProcessing}>
                <IconX size={18} />
                Effacer
              </button>
            )}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="progress-section">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Right Panel - Result */}
        <div className="result-panel">
          <div className="result-container">
            {resultImage ? (
              <>
                <img src={resultImage.url} alt="Upscaled" className="result-image" />
                <div className="result-actions">
                  <button className="btn-download" onClick={downloadResult}>
                    <IconDownload size={18} />
                    Telecharger
                  </button>
                </div>
                <div className="result-info">
                  <IconCheck size={16} />
                  Image sauvegardee dans ComfyUI/output
                </div>
              </>
            ) : (
              <div className="empty-result">
                <IconImage size={64} opacity={0.3} />
                <p>Le resultat apparaitra ici</p>
                <span>Upload une image et clique "Agrandir"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpscalerPage;
