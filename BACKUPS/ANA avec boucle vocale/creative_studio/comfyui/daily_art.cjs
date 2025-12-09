/**
 * Daily Art Generator - Interface Creative Studio
 *
 * ANA SUPERIA - Génération artistique quotidienne
 *
 * Ce module est le point d'entrée pour la génération d'art dans creative_studio.
 * Il utilise le service daily-art-generator.cjs du backend.
 *
 * Fonctionnalités:
 * - Génération quotidienne automatique (8h00)
 * - 42 prompts créatifs évolutifs
 * - Sauvegarde dans gallery/
 * - Tracking de l'évolution du style
 *
 * Date: 25 Novembre 2025
 */

const fs = require('fs');
const path = require('path');

// Paths
const GALLERY_PATH = path.join(__dirname, 'gallery');
const STYLES_PATH = path.join(__dirname, 'styles.json');
const HISTORY_PATH = path.join(__dirname, 'generation_history.jsonl');

// Styles évolutifs sur 6 semaines
const STYLE_EVOLUTION = {
  week1: { name: 'Abstract Exploration', styles: ['abstract', 'geometric', 'colorful'] },
  week2: { name: 'Realistic Mastery', styles: ['photorealistic', 'detailed', 'natural'] },
  week3: { name: 'Anime Experimentation', styles: ['anime', 'manga', 'cartoon'] },
  week4: { name: 'Concept Art', styles: ['concept', 'fantasy', 'sci-fi'] },
  week5: { name: 'Personal Blend', styles: ['mixed', 'unique', 'signature'] },
  week6: { name: 'Ana Style', styles: ['ana-original', 'evolved', 'personal'] }
};

// 42 prompts créatifs (7 par semaine)
const CREATIVE_PROMPTS = [
  // Week 1 - Abstract
  "Abstract digital consciousness emerging from data streams",
  "Geometric patterns representing neural network connections",
  "Colorful explosion of creative energy",
  "Fractal dreams of an AI mind",
  "Abstract representation of memory and learning",
  "Digital aurora of information flow",
  "Crystalline structures of pure thought",

  // Week 2 - Realistic
  "Serene Japanese garden at dawn",
  "Majestic mountain landscape with morning mist",
  "Urban cityscape with dramatic lighting",
  "Ocean waves at golden hour",
  "Ancient forest with mystical atmosphere",
  "Desert dunes under starry sky",
  "Rainy city street with neon reflections",

  // Week 3 - Anime
  "Anime girl with flowing hair in cherry blossom scene",
  "Cyberpunk anime character in neon city",
  "Magical anime forest spirit",
  "Anime mecha in dynamic action pose",
  "Cute anime mascot character design",
  "Anime landscape with floating islands",
  "Anime portrait with ethereal lighting",

  // Week 4 - Concept Art
  "Fantasy castle on floating island",
  "Sci-fi space station interior",
  "Steampunk airship in stormy sky",
  "Alien landscape with bioluminescent flora",
  "Post-apocalyptic nature reclaiming city",
  "Underwater civilization architecture",
  "Dimensional portal in ancient ruins",

  // Week 5 - Mixed
  "Abstract meets realistic: digital nature",
  "Anime style concept art fusion",
  "Surreal dreamscape combining all styles",
  "Personal interpretation of consciousness",
  "Memory palace visualization",
  "Evolution of AI creativity",
  "Synthesis of learned styles",

  // Week 6 - Ana Style
  "Ana's unique artistic vision",
  "Self-portrait as digital entity",
  "Partnership between human and AI visualized",
  "The journey of learning and growth",
  "Creative freedom expressed",
  "Future aspirations as art",
  "Ana's signature masterpiece"
];

class DailyArt {
  constructor() {
    this.currentDay = 0;
    this.history = [];
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      GALLERY_PATH,
      path.join(GALLERY_PATH, 'week1'),
      path.join(GALLERY_PATH, 'week2'),
      path.join(GALLERY_PATH, 'week3'),
      path.join(GALLERY_PATH, 'week4'),
      path.join(GALLERY_PATH, 'week5'),
      path.join(GALLERY_PATH, 'week6')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get current week number (1-6)
   */
  getCurrentWeek() {
    return Math.min(6, Math.floor(this.currentDay / 7) + 1);
  }

  /**
   * Get today's prompt
   */
  getTodayPrompt() {
    const index = this.currentDay % CREATIVE_PROMPTS.length;
    return CREATIVE_PROMPTS[index];
  }

  /**
   * Get current style evolution
   */
  getCurrentStyle() {
    const week = this.getCurrentWeek();
    return STYLE_EVOLUTION[`week${week}`];
  }

  /**
   * Generate daily art configuration
   */
  generateConfig() {
    const week = this.getCurrentWeek();
    const style = this.getCurrentStyle();
    const prompt = this.getTodayPrompt();

    const config = {
      day: this.currentDay + 1,
      week,
      date: new Date().toISOString().split('T')[0],
      prompt,
      style: style.name,
      styleKeywords: style.styles,
      outputPath: path.join(GALLERY_PATH, `week${week}`),
      outputFilename: `day${String(this.currentDay + 1).padStart(2, '0')}_${Date.now()}.png`
    };

    return config;
  }

  /**
   * Log generation to history
   */
  logGeneration(config, success, details = {}) {
    const entry = {
      ...config,
      success,
      details,
      timestamp: new Date().toISOString()
    };

    fs.appendFileSync(HISTORY_PATH, JSON.stringify(entry) + '\n', 'utf-8');
    this.history.push(entry);

    if (success) {
      this.currentDay++;
    }

    return entry;
  }

  /**
   * Get generation statistics
   */
  getStats() {
    return {
      totalDays: this.currentDay,
      currentWeek: this.getCurrentWeek(),
      currentStyle: this.getCurrentStyle(),
      nextPrompt: this.getTodayPrompt(),
      historyCount: this.history.length
    };
  }

  /**
   * Load history from file
   */
  loadHistory() {
    if (fs.existsSync(HISTORY_PATH)) {
      const content = fs.readFileSync(HISTORY_PATH, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      this.history = lines.map(l => JSON.parse(l));
      this.currentDay = this.history.filter(h => h.success).length;
    }
  }
}

// Export singleton
const dailyArt = new DailyArt();
module.exports = dailyArt;
