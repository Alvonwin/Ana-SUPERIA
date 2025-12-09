/**
 * Unit Tests - VRAM Manager
 *
 * Tests for E:\ANA\server\services\vram-manager.cjs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios before importing the module
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn()
}));

describe('VRAMManager', () => {
  let vramManager;
  let axios;

  beforeEach(async () => {
    vi.resetModules();

    // Dynamic import for mocked module
    const axiosModule = await import('axios');
    axios = axiosModule.default;

    // Import the module under test
    const module = await import('../services/vram-manager.cjs');
    vramManager = module.default || module;
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      expect(vramManager.ollamaUrl).toBe('http://localhost:11434');
      expect(vramManager.maxConcurrent).toBe(2);
      expect(vramManager.idleTimeout).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should have VRAM estimates for known models', () => {
      expect(vramManager.vramEstimates['phi3:mini-128k']).toBe(3000);
      expect(vramManager.vramEstimates['deepseek-coder-v2:16b-lite-instruct-q4_K_M']).toBe(5500);
    });

    it('should have 8GB total VRAM configured', () => {
      expect(vramManager.totalVRAM).toBe(8 * 1024); // 8GB in MB
    });
  });

  describe('getVRAMEstimate', () => {
    it('should return exact match estimate', () => {
      expect(vramManager.getVRAMEstimate('phi3:mini-128k')).toBe(3000);
    });

    it('should return partial match estimate', () => {
      expect(vramManager.getVRAMEstimate('phi3:latest')).toBe(3000);
    });

    it('should return default for unknown models', () => {
      expect(vramManager.getVRAMEstimate('unknown-model')).toBe(4000);
    });
  });

  describe('getStats', () => {
    it('should return stats object with required fields', () => {
      const stats = vramManager.getStats();

      expect(stats).toHaveProperty('loadedModels');
      expect(stats).toHaveProperty('totalVRAM_mb');
      expect(stats).toHaveProperty('totalVRAM_gb');
      expect(stats).toHaveProperty('maxVRAM_gb');
      expect(stats).toHaveProperty('usagePercent');
      expect(stats).toHaveProperty('maxConcurrent');
      expect(stats).toHaveProperty('idleTimeoutMinutes');
    });

    it('should show 0 loaded models initially', () => {
      const stats = vramManager.getStats();
      expect(stats.loadedModels).toHaveLength(0);
    });
  });

  describe('getLeastRecentlyUsed', () => {
    it('should return null when no models loaded', () => {
      expect(vramManager.getLeastRecentlyUsed()).toBeNull();
    });
  });
});
