/**
 * ANA SKILL LEARNER - Self-Improvement System
 *
 * Permet a Ana d'apprendre et de s'ameliorer automatiquement:
 * - Extraction de skills depuis les conversations
 * - Feedback loop pour amelioration continue
 * - Meta-learning: apprendre a mieux apprendre
 *
 * Best Practices 2025:
 * - Source: https://powerdrill.ai/blog/self-improving-data-agents
 * - Source: https://richardcsuwandi.github.io/blog/2025/dgm/
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const SKILLS_PATH = path.join('E:', 'ANA', 'knowledge', 'learned', 'skills.json');
const PATTERNS_PATH = path.join('E:', 'ANA', 'knowledge', 'learned', 'patterns.json');
const FEEDBACK_PATH = path.join('E:', 'ANA', 'knowledge', 'learned', 'feedback.json');
const SKILLS_DIR = path.join('E:', 'ANA', 'knowledge', 'learned', 'skills');

/**
 * Nettoie les caracteres de controle invalides dans une chaine JSON
 * Fix pour: Bad control character in string literal
 * Garde newline, carriage return, tab qui sont valides en JSON
 */
function cleanJsonString(str) {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

class SkillLearner {
  constructor() {
    this.skills = { metadata: {}, skills: [], in_progress: [], planned: [] };
    this.staticSkills = []; // Skills statiques depuis skills/*.json (Phase 2 - 30 Nov 2025)
    this.patterns = { code: [], conversation: [], problem_solving: [] };
    this.feedback = { positive: [], negative: [], suggestions: [] };
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load existing skills
      if (fs.existsSync(SKILLS_PATH)) {
        this.skills = JSON.parse(fs.readFileSync(SKILLS_PATH, 'utf-8'));
      }

      // Load patterns
      if (fs.existsSync(PATTERNS_PATH)) {
        this.patterns = JSON.parse(fs.readFileSync(PATTERNS_PATH, 'utf-8'));
      }

      // Load feedback history
      if (fs.existsSync(FEEDBACK_PATH)) {
        this.feedback = JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf-8'));
      }

      // Load static skills from skills/*.json (Phase 2 - 30 Nov 2025)
      await this.loadStaticSkills();

      this.initialized = true;
      const dynamicCount = this.skills?.skills?.length || 0;
      const staticCount = this.staticSkills?.length || 0;
      console.log('[SkillLearner] Initialized with', dynamicCount, 'dynamic +', staticCount, 'static skills');
      return { success: true };
    } catch (error) {
      console.error('[SkillLearner] Init error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load static skills from skills/*.json directory (Phase 2 - 30 Nov 2025)
   * Guard-rails: Timing logs, file count warning, graceful fallback
   */
  async loadStaticSkills() {
    const startTime = Date.now();

    try {
      if (!fs.existsSync(SKILLS_DIR)) {
        console.log('[SkillLearner] Static skills directory not found:', SKILLS_DIR);
        return;
      }

      const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.json'));

      // Guard-rail: Warning if too many files
      if (files.length > 1000) {
        console.warn('[SkillLearner] WARNING: Very large skill directory:', files.length, 'files');
      }

      console.log('[SkillLearner] Loading static skills from', files.length, 'files...');

      let loadedCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(SKILLS_DIR, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

          if (data.skills && Array.isArray(data.skills)) {
            const skillsWithMeta = data.skills.map(s => ({
              ...s,
              sourceFile: file,
              category: data.category || file.replace('.json', ''),
              isStatic: true
            }));
            this.staticSkills = this.staticSkills.concat(skillsWithMeta);
            loadedCount += skillsWithMeta.length;
          }
        } catch (fileError) {
          errorCount++;
          if (errorCount <= 5) {
            console.error('[SkillLearner] Error loading', file + ':', fileError.message);
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[SkillLearner] Static skills loaded: ${loadedCount} skills from ${files.length} files in ${duration}ms`);

      if (errorCount > 0) {
        console.warn(`[SkillLearner] ${errorCount} files had errors`);
      }

    } catch (error) {
      console.error('[SkillLearner] loadStaticSkills error:', error.message);
      // Fallback: Keep staticSkills as empty array (already initialized)
    }
  }

  /**
   * Search across all skills - Phase 3 FIX 2025-12-14
   * PRIORITÉ ABSOLUE aux skills appris (dynamic)
   * Static skills = FALLBACK seulement si pas assez de dynamic
   *
   * @param {string} query - Search term
   * @param {number} limit - Max results (default 100)
   * @returns {Array} Matching skills with priority to learned ones
   */
  searchSkills(query, limit = 100) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    if (searchTerm.length < 2) {
      return [];
    }

    const dynamicResults = [];
    const staticResults = [];

    // 1. Search dynamic skills (APPRIS par Ana) - PRIORITÉ ABSOLUE
    const dynamicSkills = this.skills?.skills || [];
    for (const skill of dynamicSkills) {
      const nameMatch = (skill.name || '').toLowerCase().includes(searchTerm);
      const descMatch = (skill.description || '').toLowerCase().includes(searchTerm);
      const typeMatch = (skill.type || '').toLowerCase().includes(searchTerm);

      if (nameMatch || descMatch || typeMatch) {
        // Score: plus d'occurrences = plus important
        const score = (skill.occurrences || 1) + (skill.confidence === 'high' ? 10 : 0);
        dynamicResults.push({ ...skill, source: 'dynamic', priority: 1, score });
      }
    }

    // Trier dynamic par score décroissant
    dynamicResults.sort((a, b) => b.score - a.score);

    // 2. FALLBACK: Static skills SEULEMENT si pas assez de dynamic
    const dynamicCount = dynamicResults.length;
    const needStatic = dynamicCount < Math.min(limit, 5); // Fallback si moins de 5 dynamic

    if (needStatic) {
      for (const skill of this.staticSkills) {
        if (staticResults.length >= (limit - dynamicCount)) break;

        const nameMatch = (skill.name || '').toLowerCase().includes(searchTerm);
        const descMatch = (skill.description || '').toLowerCase().includes(searchTerm);
        const catMatch = (skill.category || '').toLowerCase().includes(searchTerm);

        if (nameMatch || descMatch || catMatch) {
          staticResults.push({ ...skill, source: 'static', priority: 2, score: 0 });
        }
      }
    }

    // 3. Combiner: Dynamic d'abord, puis static en fallback
    const results = [...dynamicResults.slice(0, limit)];
    const remaining = limit - results.length;
    if (remaining > 0 && staticResults.length > 0) {
      results.push(...staticResults.slice(0, remaining));
    }

    console.log(`[SkillLearner] Search "${searchTerm}": ${dynamicResults.length} dynamic, ${needStatic ? staticResults.length : 0} static fallback`);

    return results;
  }

  /**
   * Extract skills from a conversation exchange
   * Uses LLM to analyze what skills were demonstrated/learned
   */
  async extractSkillsFromConversation(exchange) {
    const { userMessage, anaResponse, model, success = true, toolsUsed = {} } = exchange;

    // FIX 2025-12-17: Extraire tool patterns si des outils ont ete utilises
    if (Object.keys(toolsUsed).length > 0) {
      try {
        await this.extractToolPattern(userMessage, toolsUsed, success);
      } catch (e) {
        console.log('[SkillLearner] Tool pattern extraction skipped:', e.message);
      }
    }

    try {
      // FIX 2025-12-14: Extraction dynamique améliorée (style Mem0)
      // Focus sur ce qui MÉRITE d'être retenu, pas tout
      const extractionPrompt = `Tu es un analyseur de mémoire. Analyse cette conversation et extrait SEULEMENT ce qui mérite d'être retenu pour le futur.

CONVERSATION:
Alain: ${userMessage}
Ana: ${anaResponse}

RÈGLES D'EXTRACTION:
- NE RETIENS PAS les choses banales (salutations, questions sur l'heure, etc.)
- RETIENS: faits personnels sur Alain, préférences, erreurs à éviter, solutions qui ont marché
- RETIENS: patterns réutilisables, leçons apprises
- Si RIEN ne mérite d'être retenu, réponds {"skills": [], "reason": "Rien de notable"}

CATÉGORIES:
- personal_fact: Info sur Alain (anniversaire, voiture, préférences...)
- preference: Ce qu'Alain aime/n'aime pas
- learned_solution: Solution à un problème
- pattern: Pattern réutilisable
- mistake_to_avoid: Erreur à ne pas répéter

Réponds en JSON:
{
  "skills": [
    {
      "type": "personal_fact|preference|learned_solution|pattern|mistake_to_avoid",
      "name": "Nom court et descriptif",
      "description": "Ce qui a été appris",
      "confidence": "high|medium|low",
      "importance": 1-10
    }
  ],
  "reason": "Pourquoi ces éléments sont importants (ou pourquoi rien)"
}`;

      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'phi3:mini-128k',
        prompt: extractionPrompt,
        stream: false,
        options: { temperature: 0.3 }
      });

      // Parse LLM response
      let extractedSkills = [];
      try {
        const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(cleanJsonString(jsonMatch[0]));
          extractedSkills = parsed.skills || [];
        }
      } catch (parseError) {
        console.log('[SkillLearner] Parse warning:', parseError.message);
      }

      // Add extracted skills to our knowledge
      for (const skill of extractedSkills) {
        await this.addSkill({
          ...skill,
          learnedAt: new Date().toISOString(),
          sourceModel: model,
          successfulExecution: success
        });
      }

      return {
        success: true,
        extracted: extractedSkills.length,
        skills: extractedSkills
      };
    } catch (error) {
      console.error('[SkillLearner] Extraction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a new skill to knowledge base
   */
  async addSkill(skill) {
    // Ensure skills array exists
    if (!this.skills) this.skills = { metadata: {}, skills: [], in_progress: [], planned: [] };
    if (!this.skills.skills) this.skills.skills = [];

    // Check for duplicates
    const exists = this.skills.skills.find(s =>
      s.name === skill.name && s.type === skill.type
    );

    if (exists) {
      // Update existing skill with new evidence
      exists.occurrences = (exists.occurrences || 1) + 1;
      exists.lastSeen = new Date().toISOString();
      if (skill.confidence === 'high' && exists.confidence !== 'high') {
        exists.confidence = 'high';
      }
    } else {
      // Add new skill
      this.skills.skills.push({
        id: 'skill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...skill,
        occurrences: 1
      });
    }

    // Save to disk
    await this.saveSkills();

    return { success: true, skill };
  }

  /**
   * Record user feedback for learning
   */
  async recordFeedback(feedbackData) {
    // Ensure feedback object exists
    if (!this.feedback) this.feedback = { positive: [], negative: [], suggestions: [] };
    if (!this.feedback.positive) this.feedback.positive = [];
    if (!this.feedback.negative) this.feedback.negative = [];
    if (!this.feedback.suggestions) this.feedback.suggestions = [];

    const { type, message, anaResponse, rating, suggestion } = feedbackData;

    const entry = {
      id: 'fb_' + Date.now(),
      timestamp: new Date().toISOString(),
      type,
      rating,
      message: message?.substring(0, 500),
      response: anaResponse?.substring(0, 500),
      suggestion
    };

    if (type === 'positive' || rating >= 4) {
      this.feedback.positive.push(entry);
    } else if (type === 'negative' || rating <= 2) {
      this.feedback.negative.push(entry);
      // Learn from negative feedback
      await this.learnFromMistake(entry);
    }

    if (suggestion) {
      this.feedback.suggestions.push(entry);
    }

    await this.saveFeedback();

    return { success: true, entry };
  }

  /**
   * Learn from mistakes (negative feedback)
   */
  async learnFromMistake(feedbackEntry) {
    try {
      const analysisPrompt = `Analyze this negative feedback and suggest how to improve:

ORIGINAL MESSAGE: ${feedbackEntry.message}
MY RESPONSE: ${feedbackEntry.response}
FEEDBACK RATING: ${feedbackEntry.rating}/5
SUGGESTION: ${feedbackEntry.suggestion || 'None'}

What should I learn from this? What pattern should I avoid?
Respond in JSON:
{
  "mistake_type": "...",
  "what_went_wrong": "...",
  "improvement_rule": "...",
  "anti_pattern": "..."
}`;

      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'phi3:mini-128k',
        prompt: analysisPrompt,
        stream: false,
        options: { temperature: 0.3 }
      });

      // Extract learning
      try {
        const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const learning = JSON.parse(cleanJsonString(jsonMatch[0]));

          // Store as anti-pattern to avoid (ensure patterns exists)
          if (!this.patterns) this.patterns = { code: [], conversation: [], problem_solving: [], avoid: [] };
          if (!this.patterns.avoid) this.patterns.avoid = [];
          this.patterns.avoid.push({
            ...learning,
            learnedAt: new Date().toISOString(),
            fromFeedback: feedbackEntry.id
          });

          await this.savePatterns();
        }
      } catch (e) {
        console.log('[SkillLearner] Learning parse warning:', e.message);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get coding assistance based on learned patterns
   */
  async getCodingHelp(task) {
    // Find relevant learned patterns (with null-safe access)
    const allSkills = this.skills?.skills || [];
    const relevantSkills = allSkills.filter(s =>
      s.type === 'coding' || s.type === 'debugging'
    );

    const codePatterns = this.patterns?.code || [];
    const relevantPatterns = codePatterns.filter(p =>
      task.toLowerCase().includes(p.keyword?.toLowerCase() || '')
    );

    return {
      skills: relevantSkills.slice(0, 5),
      patterns: relevantPatterns.slice(0, 5),
      antiPatterns: (this.patterns?.avoid || []).slice(0, 3)
    };
  }

  /**
   * Self-improvement check: Analyze recent performance
   */
  async analyzePerformance() {
    const recentPositive = (this.feedback?.positive || []).slice(-20);
    const recentNegative = (this.feedback?.negative || []).slice(-20);

    const positiveRate = recentPositive.length / (recentPositive.length + recentNegative.length || 1);

    const allSkills = this.skills?.skills || [];
    const topSkills = [...allSkills]
      .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0))
      .slice(0, 10);

    return {
      totalSkills: allSkills.length,
      topSkills,
      positiveRate: Math.round(positiveRate * 100),
      recentFeedback: {
        positive: recentPositive.length,
        negative: recentNegative.length
      },
      antiPatternsLearned: (this.patterns?.avoid || []).length,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get suggestions for a coding task based on learned knowledge
   */
  async getSuggestions(context) {
    const help = await this.getCodingHelp(context);
    const performance = await this.analyzePerformance();

    return {
      applicableSkills: help.skills,
      relevantPatterns: help.patterns,
      avoidPatterns: help.antiPatterns,
      performanceMetrics: performance,
      recommendation: help.skills.length > 0
        ? `Found ${help.skills.length} relevant skills for this task`
        : 'No specific learned skills for this task yet'
    };
  }

  // Persistence methods
  async saveSkills() {
    try {
      // Ensure skills object exists
      if (!this.skills) this.skills = { metadata: {}, skills: [], in_progress: [], planned: [] };
      if (!this.skills.metadata) this.skills.metadata = {};

      this.skills.metadata.updated = new Date().toISOString();
      this.skills.metadata.version = '1.0.1';
      fs.writeFileSync(SKILLS_PATH, JSON.stringify(this.skills, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SkillLearner] Save skills error:', error.message);
    }
  }

  async savePatterns() {
    try {
      const dir = path.dirname(PATTERNS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PATTERNS_PATH, JSON.stringify(this.patterns, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SkillLearner] Save patterns error:', error.message);
    }
  }

  async saveFeedback() {
    try {
      const dir = path.dirname(FEEDBACK_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(this.feedback, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SkillLearner] Save feedback error:', error.message);
    }
  }

  getStats() {
    // Protection contre les propriétés undefined (fix bug 30-Nov-2025)
    // Phase 2: Ajout compteurs skills statiques (30-Nov-2025)
    const dynamicCount = (this.skills?.skills || []).length;
    const staticCount = (this.staticSkills || []).length;

    return {
      initialized: this.initialized,
      skillsCount: dynamicCount + staticCount, // Total combiné
      dynamicSkillsCount: dynamicCount,        // Skills appris
      staticSkillsCount: staticCount,          // Skills base de connaissances
      patternsCount: {
        code: (this.patterns?.code || []).length,
        conversation: (this.patterns?.conversation || []).length,
        problem_solving: (this.patterns?.problem_solving || []).length,
        avoid: (this.patterns?.avoid || []).length
      },
      feedbackCount: {
        positive: (this.feedback?.positive || []).length,
        negative: (this.feedback?.negative || []).length,
        suggestions: (this.feedback?.suggestions || []).length
      }
    };
  }

  /**
   * Add user feedback from UI - Phase 5A - 01 Dec 2025
   * Simplified API for frontend feedback buttons
   * @param {Object} feedbackData - { messageId, conversationId, type, comment?, source? }
   */
  async addFeedback(feedbackData) {
    try {
      // Ensure feedback object has correct structure
      if (!this.feedback) {
        this.feedback = { positive: [], negative: [], suggestions: [], improvements: [], stats: {} };
      }
      if (!this.feedback.positive) this.feedback.positive = [];
      if (!this.feedback.negative) this.feedback.negative = [];
      if (!this.feedback.suggestions) this.feedback.suggestions = [];
      if (!this.feedback.stats) this.feedback.stats = { totalFeedback: 0, positiveCount: 0, negativeCount: 0 };

      const { messageId, conversationId, type, comment, source, llmModel, question, responseSummary } = feedbackData;

      // Validate type
      if (!['positive', 'negative', 'suggestion'].includes(type)) {
        return { success: false, error: 'Invalid feedback type. Must be: positive, negative, or suggestion' };
      }

      const entry = {
        id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        type,
        messageId: messageId || null,
        conversationId: conversationId || null,
        comment: comment ? comment.substring(0, 1000) : null,
        source: source || 'chat',
        llmModel: llmModel || null,
        question: question || null,           // Phase 5C - Question de l'utilisateur
        responseSummary: responseSummary || null  // Phase 5C - Résumé de la réponse Ana
      };

      // Add to appropriate array
      if (type === 'positive') {
        this.feedback.positive.push(entry);
        this.feedback.stats.positiveCount = (this.feedback.stats.positiveCount || 0) + 1;
      } else if (type === 'negative') {
        this.feedback.negative.push(entry);
        this.feedback.stats.negativeCount = (this.feedback.stats.negativeCount || 0) + 1;
      } else if (type === 'suggestion') {
        this.feedback.suggestions.push(entry);
      }

      // Update total
      this.feedback.stats.totalFeedback = (this.feedback.stats.totalFeedback || 0) + 1;
      this.feedback.lastUpdated = new Date().toISOString();

      // Save to disk
      await this.saveFeedback();

      console.log(`[SkillLearner] Feedback added: ${type} (total: ${this.feedback.stats.totalFeedback})`);

      return { success: true, entry };
    } catch (error) {
      console.error('[SkillLearner] addFeedback error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get feedback statistics - Phase 5A - 01 Dec 2025
   */
  getFeedbackStats() {
    const positive = this.feedback?.positive || [];
    const negative = this.feedback?.negative || [];
    const suggestions = this.feedback?.suggestions || [];

    // Group by source
    const bySource = {};
    [...positive, ...negative, ...suggestions].forEach(fb => {
      const src = fb.source || 'unknown';
      if (!bySource[src]) bySource[src] = { positive: 0, negative: 0, suggestion: 0 };
      bySource[src][fb.type] = (bySource[src][fb.type] || 0) + 1;
    });

    // Group by LLM model
    const byModel = {};
    [...positive, ...negative].forEach(fb => {
      if (fb.llmModel) {
        if (!byModel[fb.llmModel]) byModel[fb.llmModel] = { positive: 0, negative: 0 };
        byModel[fb.llmModel][fb.type] = (byModel[fb.llmModel][fb.type] || 0) + 1;
      }
    });

    // Recent feedback (last 10)
    const allFeedback = [...positive, ...negative, ...suggestions]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return {
      total: positive.length + negative.length + suggestions.length,
      positive: positive.length,
      negative: negative.length,
      suggestions: suggestions.length,
      positiveRate: positive.length + negative.length > 0
        ? Math.round((positive.length / (positive.length + negative.length)) * 100)
        : 0,
      bySource,
      byModel,
      recent: allFeedback,
      lastUpdated: this.feedback?.lastUpdated || null
    };
  }

  /**
   * Get Skills Intelligence data for Dashboard - Phase 4 - 01 Dec 2025
   * Returns comprehensive stats about skills ecosystem
   */
  getIntelligence() {
    if (!this.initialized) {
      return {
        success: false,
        message: 'SkillLearner not initialized',
        timestamp: new Date().toISOString()
      };
    }

    const dynamicSkills = this.skills?.skills || [];
    const staticSkills = this.staticSkills || [];

    // Calculate categories from static skills
    const categoryMap = {};
    for (const skill of staticSkills) {
      const cat = skill.category || 'uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }

    // Sort categories by count (descending)
    const categories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Top used skills (based on occurrences field if available)
    const topUsed = [...dynamicSkills]
      .filter(s => s.occurrences && s.occurrences > 1)
      .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0))
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        occurrences: s.occurrences
      }));

    // Recently added skills (based on learnedAt timestamp)
    const recentlyAdded = [...dynamicSkills]
      .filter(s => s.learnedAt)
      .sort((a, b) => new Date(b.learnedAt) - new Date(a.learnedAt))
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        learnedAt: s.learnedAt
      }));

    return {
      success: true,
      total: dynamicSkills.length + staticSkills.length,
      dynamic: dynamicSkills.length,
      static: staticSkills.length,
      categories: categories.slice(0, 20), // Top 20 categories
      categoriesTotal: categories.length,
      topUsed,
      recentlyAdded,
      patterns: {
        code: (this.patterns?.code || []).length,
        avoid: (this.patterns?.avoid || []).length
      },
      feedback: {
        positive: (this.feedback?.positive || []).length,
        negative: (this.feedback?.negative || []).length
      },
      timestamp: new Date().toISOString()
    };
  }

  // ========================================================
  // FIX 2025-12-17: Methodes pour apprentissage tool patterns
  // ========================================================

  /**
   * Utilise semantic-router pour classifier le type de tache
   */
  async getTaskType(message) {
    try {
      const semanticRouter = require('./semantic-router.cjs');
      if (!semanticRouter.initialized) {
        await semanticRouter.initialize();
      }
      const result = await semanticRouter.route(message);
      return result.taskType || 'conversation';
    } catch (e) {
      console.log('[SkillLearner] getTaskType fallback:', e.message);
      return 'conversation';
    }
  }

  /**
   * Extrait et stocke les patterns d'utilisation d'outils
   */
  async extractToolPattern(userMessage, toolsUsed, success) {
    const taskType = await this.getTaskType(userMessage);

    for (const [toolName, count] of Object.entries(toolsUsed)) {
      const pattern = {
        id: 'tp_' + Date.now() + '_' + toolName,
        type: 'tool_pattern',
        name: toolName + '_for_' + taskType,
        description: 'Outil ' + toolName + ' efficace pour taches ' + taskType,
        toolName: toolName,
        taskType: taskType,
        confidence: success ? 'high' : 'low',
        importance: 7,
        occurrences: 1,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        learnedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      // Verifier si pattern similaire existe
      const existing = this.findSimilarToolPattern(toolName, taskType);
      if (existing) {
        existing.occurrences++;
        if (success) existing.successCount = (existing.successCount || 0) + 1;
        else existing.failureCount = (existing.failureCount || 0) + 1;
        existing.lastSeen = new Date().toISOString();
        // Ajuster confidence base sur taux de succes
        const rate = existing.successCount / (existing.successCount + existing.failureCount);
        existing.confidence = rate > 0.8 ? 'high' : rate > 0.5 ? 'medium' : 'low';
      } else {
        if (!this.skills.skills) this.skills.skills = [];
        this.skills.skills.push(pattern);
      }
    }

    this.saveSkills();
    console.log('[SkillLearner] Pattern appris: ' + Object.keys(toolsUsed).join(', ') + ' pour ' + taskType);
  }

  /**
   * Trouve un tool pattern similaire existant
   */
  findSimilarToolPattern(toolName, taskType) {
    if (!this.skills || !this.skills.skills) return null;
    return this.skills.skills.find(s =>
      s.type === 'tool_pattern' &&
      s.toolName === toolName &&
      s.taskType === taskType
    );
  }

  /**
   * Retourne les outils les plus efficaces pour un taskType
   */
  getRecommendedTools(taskType, limit = 5) {
    if (!this.skills || !this.skills.skills) return [];

    return this.skills.skills
      .filter(s => s.type === 'tool_pattern' && s.taskType === taskType)
      .map(s => ({
        ...s,
        successRate: s.successCount / ((s.successCount || 0) + (s.failureCount || 0) || 1)
      }))
      .sort((a, b) => {
        // Priorite 1: taux de succes
        if (b.successRate !== a.successRate) return b.successRate - a.successRate;
        // Priorite 2: nombre d'occurrences (experience)
        return (b.occurrences || 0) - (a.occurrences || 0);
      })
      .slice(0, limit);
  }

}

module.exports = new SkillLearner();
