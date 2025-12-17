/**
 * Integration Tests - Module Loading & Configuration
 *
 * Verifies all modules load and integrate correctly
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

// Mock external dependencies that require network
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { models: [] } }),
    post: vi.fn().mockResolvedValue({ data: { response: 'test' } })
  }
}));

describe('Module Integration', () => {
  describe('Intelligence Modules', () => {
    it('should load orchestrator without errors', async () => {
      const module = await import('../../intelligence/orchestrator.cjs');
      const orchestrator = module.default || module;

      expect(orchestrator).toBeDefined();
      expect(orchestrator.ollamaUrl).toBeDefined();
      expect(typeof orchestrator.detectTaskType).toBe('function');
      expect(typeof orchestrator.getBestModelForTask).toBe('function');
      expect(typeof orchestrator.getStats).toBe('function');
    });

    it('should load DeepSeekHandler without errors', async () => {
      const module = await import('../../intelligence/coding/deepseek_handler.cjs');
      const DeepSeekHandler = module.default || module;

      const handler = new DeepSeekHandler();
      expect(handler).toBeDefined();
      expect(handler.modelName).toContain('deepseek');
      expect(typeof handler.generate).toBe('function');
    });

    it('should load Phi3Handler without errors', async () => {
      const module = await import('../../intelligence/conversation/phi3_handler.cjs');
      const Phi3Handler = module.default || module;

      const handler = new Phi3Handler();
      expect(handler).toBeDefined();
      expect(handler.modelName).toContain('phi3');
      expect(typeof handler.chat).toBe('function');
    });

    it('should load LlamaVisionHandler without errors', async () => {
      const module = await import('../../intelligence/vision/llama_vision_handler.cjs');
      const LlamaVisionHandler = module.default || module;

      const handler = new LlamaVisionHandler();
      expect(handler).toBeDefined();
      expect(handler.modelName).toContain('llama');
      expect(typeof handler.analyzeImage).toBe('function');
    });

    it('should load intelligence index with all exports', async () => {
      const module = await import('../../intelligence/index.cjs');

      expect(module.orchestrator).toBeDefined();
      expect(module.DeepSeekHandler).toBeDefined();
      expect(module.Phi3Handler).toBeDefined();
      expect(module.LlamaVisionHandler).toBeDefined();
      expect(module.handlers).toBeDefined();
    });
  });

  describe('Service Modules', () => {
    it('should load vram-manager without errors', async () => {
      const module = await import('../services/vram-manager.cjs');
      const vramManager = module.default || module;

      expect(vramManager).toBeDefined();
      expect(vramManager.maxConcurrent).toBe(2);
      expect(typeof vramManager.getStats).toBe('function');
    });

    it('should load n8n-integration without errors', async () => {
      const module = await import('../services/n8n-integration.cjs');
      const n8nIntegration = module.default || module;

      expect(n8nIntegration).toBeDefined();
      expect(n8nIntegration.n8nUrl).toBe('http://localhost:5678');
      expect(typeof n8nIntegration.checkHealth).toBe('function');
      expect(typeof n8nIntegration.triggerWebhook).toBe('function');
    });
  });

  describe('File Structure', () => {
    const requiredFiles = [
      'E:/ANA/server/ana-core.cjs',
      'E:/ANA/intelligence/orchestrator.cjs',
      'E:/ANA/intelligence/index.cjs',
      'E:/ANA/intelligence/coding/deepseek_handler.cjs',
      'E:/ANA/intelligence/conversation/phi3_handler.cjs',
      'E:/ANA/intelligence/vision/llama_vision_handler.cjs',
      'E:/ANA/server/services/vram-manager.cjs',
      'E:/ANA/server/services/n8n-integration.cjs'
    ];

    requiredFiles.forEach(filePath => {
      it(`should have file: ${path.basename(filePath)}`, () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Workflow Templates', () => {
    const workflowDir = 'E:/ANA/automation_hub/workflows';

    it('should have workflow templates directory', () => {
      expect(fs.existsSync(workflowDir)).toBe(true);
    });

    it('should have daily_art_generation.json', () => {
      const filePath = path.join(workflowDir, 'daily_art_generation.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.name).toBe('Daily Art Generation');
      expect(content.nodes).toBeDefined();
    });

    it('should have memory_sync.json', () => {
      const filePath = path.join(workflowDir, 'memory_sync.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.name).toBe('Memory Sync to ChromaDB');
    });

    it('should have error_notification.json', () => {
      const filePath = path.join(workflowDir, 'error_notification.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.name).toBe('Error Notification');
    });
  });
});
