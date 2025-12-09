/**
 * useServiceManager Hook
 *
 * Gère le lazy loading des services Ana (agents, ComfyUI, n8n)
 * Affiche toasts "En chargement..." pendant démarrage
 *
 * Best Practices 2025:
 * - Lazy loading avec React hooks
 * - Toast notifications avec Sonner
 * - Service lifecycle management
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { BACKEND_URL } from '../config';

const ANA_BACKEND = BACKEND_URL;

// Mapping pages -> services requis
// NOTE: '/dashboard' retiré car agents sont maintenant démarrés par START_ANA.bat
// Seuls les services lazy-loaded (comfyui, n8n) restent ici
const PAGE_SERVICES = {
  '/images': ['comfyui'],
  '/workflows': ['n8n']
};

export function useServiceManager() {
  const [servicesStatus, setServicesStatus] = useState({
    agents: { status: 'stopped', loading: false },
    comfyui: { status: 'stopped', loading: false },
    n8n: { status: 'stopped', loading: false }
  });

  /**
   * Fetch current status of all services
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${ANA_BACKEND}/api/services/status`);
      if (response.data.success) {
        const newStatus = {};
        for (const [key, value] of Object.entries(response.data.services)) {
          newStatus[key] = {
            status: value.status,
            loading: value.status === 'starting',
            pid: value.pid,
            port: value.port
          };
        }
        setServicesStatus(newStatus);
      }
    } catch (error) {
      console.error('Error fetching services status:', error);
    }
  }, []);

  /**
   * Start a service
   */
  const startService = useCallback(async (serviceName) => {
    const serviceNames = {
      agents: 'Agents Ana',
      comfyui: 'ComfyUI',
      n8n: 'n8n'
    };

    const displayName = serviceNames[serviceName] || serviceName;

    // Update loading state
    setServicesStatus(prev => ({
      ...prev,
      [serviceName]: { ...prev[serviceName], loading: true, status: 'starting' }
    }));

    // Show loading toast
    const toastId = toast.loading(`Démarrage ${displayName}...`, {
      description: 'Préparation de l\'environnement...',
      duration: 30000 // 30s max
    });

    try {
      const response = await axios.post(`${ANA_BACKEND}/api/services/start/${serviceName}`);

      if (response.data.success) {
        // Success
        setServicesStatus(prev => ({
          ...prev,
          [serviceName]: {
            status: 'running',
            loading: false,
            pid: response.data.pid
          }
        }));

        toast.success(`${displayName} démarré !`, {
          id: toastId,
          description: `PID: ${response.data.pid}`,
          duration: 3000
        });

        return true;
      } else {
        // Failed
        setServicesStatus(prev => ({
          ...prev,
          [serviceName]: { ...prev[serviceName], loading: false, status: 'error' }
        }));

        toast.error(`Erreur ${displayName}`, {
          id: toastId,
          description: response.data.message,
          duration: 5000
        });

        return false;
      }
    } catch (error) {
      // Error
      setServicesStatus(prev => ({
        ...prev,
        [serviceName]: { ...prev[serviceName], loading: false, status: 'error' }
      }));

      toast.error(`Erreur ${displayName}`, {
        id: toastId,
        description: error.response?.data?.message || error.message,
        duration: 5000
      });

      return false;
    }
  }, []);

  /**
   * Stop a service
   */
  const stopService = useCallback(async (serviceName) => {
    const serviceNames = {
      agents: 'Agents Ana',
      comfyui: 'ComfyUI',
      n8n: 'n8n'
    };

    const displayName = serviceNames[serviceName] || serviceName;

    try {
      const response = await axios.post(`${ANA_BACKEND}/api/services/stop/${serviceName}`);

      if (response.data.success) {
        setServicesStatus(prev => ({
          ...prev,
          [serviceName]: { status: 'stopped', loading: false, pid: null }
        }));

        toast.info(`${displayName} arrêté`, { duration: 2000 });
        return true;
      }

      return false;
    } catch (error) {
      toast.error(`Erreur arrêt ${displayName}`, {
        description: error.message,
        duration: 3000
      });
      return false;
    }
  }, []);

  /**
   * Ensure services for a page are running
   * Called when user navigates to a page
   */
  const ensureServicesForPage = useCallback(async (pathname) => {
    const requiredServices = PAGE_SERVICES[pathname];

    if (!requiredServices) {
      // No services required for this page
      return;
    }

    console.log(`[ServiceManager] Page ${pathname} requires:`, requiredServices);

    // Fetch current status first
    await fetchStatus();

    // Start each required service if not already running
    for (const serviceName of requiredServices) {
      const serviceState = servicesStatus[serviceName];

      if (serviceState.status !== 'running' && !serviceState.loading) {
        console.log(`[ServiceManager] Starting ${serviceName} for ${pathname}`);
        await startService(serviceName);
      } else if (serviceState.status === 'running') {
        console.log(`[ServiceManager] ${serviceName} already running`);
      }
    }
  }, [servicesStatus, startService, fetchStatus]);

  /**
   * Check if a service is running
   */
  const isServiceRunning = useCallback((serviceName) => {
    return servicesStatus[serviceName]?.status === 'running';
  }, [servicesStatus]);

  /**
   * Initial status fetch on mount
   */
  useEffect(() => {
    fetchStatus();

    // Refresh status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    servicesStatus,
    startService,
    stopService,
    ensureServicesForPage,
    isServiceRunning,
    fetchStatus
  };
}
