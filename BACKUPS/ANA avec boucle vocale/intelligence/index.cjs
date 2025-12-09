/**
 * Intelligence Module Index
 *
 * ANA SUPERIA - Central exports for all intelligence modules
 *
 * Usage:
 *   const { orchestrator, DeepSeekHandler, Phi3Handler, LlamaVisionHandler } = require('./intelligence');
 *
 * Date: 25 Novembre 2025
 */

// Main orchestrator (singleton)
const orchestrator = require('./orchestrator.cjs');

// Individual handlers (classes for instantiation)
const DeepSeekHandler = require('./coding/deepseek_handler.cjs');
const Phi3Handler = require('./conversation/phi3_handler.cjs');
const LlamaVisionHandler = require('./vision/llama_vision_handler.cjs');

// Pre-instantiated handlers (ready to use)
const handlers = {
  deepseek: new DeepSeekHandler(),
  phi3: new Phi3Handler(),
  llamaVision: new LlamaVisionHandler()
};

module.exports = {
  // Main orchestrator - use for automatic routing
  orchestrator,

  // Handler classes - use for custom configuration
  DeepSeekHandler,
  Phi3Handler,
  LlamaVisionHandler,

  // Pre-instantiated handlers - use for direct access
  handlers,

  // Convenience exports
  deepseek: handlers.deepseek,
  phi3: handlers.phi3,
  llamaVision: handlers.llamaVision
};
