/**
 * Unit Tests - Multi-LLM Orchestrator
 *
 * Tests for E:\ANA\intelligence\orchestrator.cjs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock vram-manager
vi.mock('../services/vram-manager.cjs', () => ({
  default: {
    ensureModelLoaded: vi.fn().mockResolvedValue({ success: true }),
    updateLastUsed: vi.fn()
  }
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn()
}));

describe('MultiLLMOrchestrator', () => {
  let orchestrator;

  beforeEach(async () => {
    vi.resetModules();

    // Import the module under test
    const module = await import('../../intelligence/orchestrator.cjs');
    orchestrator = module.default || module;
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      expect(orchestrator.ollamaUrl).toBe('http://localhost:11434');
      expect(orchestrator.timeout).toBe(120000); // 2 min
      expect(orchestrator.streamingEnabled).toBe(true);
    });
  });

  describe('detectTaskType', () => {
    it('should detect vision tasks', () => {
      expect(orchestrator.detectTaskType('[IMAGE] test')).toBe('vision');
      expect(orchestrator.detectTaskType('image: some image')).toBe('vision');
      expect(orchestrator.detectTaskType('Regarde cette image')).toBe('vision');
    });

    it('should detect coding tasks', () => {
      expect(orchestrator.detectTaskType('function hello() {}')).toBe('coding');
      expect(orchestrator.detectTaskType('const x = 5')).toBe('coding');
      expect(orchestrator.detectTaskType('import axios from axios')).toBe('coding');
    });

    it('should detect debugging tasks', () => {
      expect(orchestrator.detectTaskType('fix this bug')).toBe('debugging');
      expect(orchestrator.detectTaskType('il y a une erreur')).toBe('debugging');
      expect(orchestrator.detectTaskType('debug ce code')).toBe('debugging');
    });

    it('should detect math tasks', () => {
      expect(orchestrator.detectTaskType('calcule 5+3')).toBe('math');
      expect(orchestrator.detectTaskType('résous cette équation')).toBe('math');
    });

    it('should default to conversation', () => {
      expect(orchestrator.detectTaskType('Bonjour comment vas-tu?')).toBe('conversation');
      expect(orchestrator.detectTaskType('Raconte moi une histoire')).toBe('conversation');
    });
  });

  describe('getBestModelForTask', () => {
    it('should return PHI3 for conversation', () => {
      const result = orchestrator.getBestModelForTask('conversation');
      expect(result.key).toBe('PHI3');
    });

    it('should return DEEPSEEK for coding', () => {
      const result = orchestrator.getBestModelForTask('coding');
      expect(result.key).toBe('DEEPSEEK');
    });

    it('should return LLAMA_VISION for vision', () => {
      const result = orchestrator.getBestModelForTask('vision');
      expect(result.key).toBe('LLAMA_VISION');
    });

    it('should return QWEN for math', () => {
      const result = orchestrator.getBestModelForTask('math');
      expect(result.key).toBe('QWEN');
    });
  });

  describe('getFallbackModels', () => {
    it('should return fallbacks excluding primary', () => {
      const fallbacks = orchestrator.getFallbackModels('coding', 'DEEPSEEK');
      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.find(f => f.key === 'DEEPSEEK')).toBeUndefined();
      expect(fallbacks.find(f => f.key === 'QWEN')).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return stats with required fields', () => {
      const stats = orchestrator.getStats();

      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successfulRequests');
      expect(stats).toHaveProperty('failedRequests');
      expect(stats).toHaveProperty('failovers');
      expect(stats).toHaveProperty('byModel');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('failoverRate');
    });

    it('should track stats by model', () => {
      const stats = orchestrator.getStats();

      expect(stats.byModel).toHaveProperty('PHI3');
      expect(stats.byModel).toHaveProperty('DEEPSEEK');
      expect(stats.byModel).toHaveProperty('QWEN');
      expect(stats.byModel).toHaveProperty('LLAMA_VISION');
    });
  });

  describe('getModelsInfo', () => {
    it('should return array of model info', () => {
      const models = orchestrator.getModelsInfo();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBe(4); // PHI3, DEEPSEEK, QWEN, LLAMA_VISION

      const phi3 = models.find(m => m.key === 'PHI3');
      expect(phi3).toBeDefined();
      expect(phi3.specialties).toContain('conversation');
    });
  });
});
