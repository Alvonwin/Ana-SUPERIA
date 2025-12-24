// Configuration centralisée pour Ana Interface
// Détecte automatiquement si on est en local ou distant

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const BACKEND_URL = isLocalhost
  ? 'http://localhost:3338'
  : 'https://packet-characters-mass-ribbon.trycloudflare.com';

export const COMFYUI_URL = 'http://localhost:8188';

export default { BACKEND_URL, COMFYUI_URL };
