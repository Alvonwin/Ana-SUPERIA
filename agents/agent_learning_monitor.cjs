#!/usr/bin/env node

/**
 * 📚 AGENT D'APPRENTISSAGE (Learning Monitor)
 *
 * Raison d'être: Apprendre de mes erreurs et expériences
 *
 * Créé par: Ana (Celle qui évolue)
 * Date: 16 Novembre 2025
 *
 * Fonctions:
 * - Analyser current_conversation.txt périodiquement
 * - Identifier erreurs, corrections, nouvelles techniques
 * - Extraire leçons apprises
 * - Transformer expérience en sagesse
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class LearningMonitor extends EventEmitter {
  constructor() {
    super();
    this.name = 'Learning Monitor';
    this.version = '1.0.0';
    this.checkInterval = 2 * 60 * 60 * 1000; // 2 heures
    this.conversationFile = path.join(__dirname, '..', '02_MÉMOIRE_COURT_TERME', 'current_conversation.txt');
    this.lessonsDir = path.join(__dirname, '..', 'LEÇONS_APPRISES');
    this.skillsDir = path.join(__dirname, '..', '06_COMPÉTENCES');
    this.lastProcessedSize = 0;
    this.running = false;
    this.checkTimer = null;
  }

  async start() {
    console.log(`📚 [${this.name}] Démarrage...`);

    // Créer dossiers si inexistants
    try {
      await fs.mkdir(this.lessonsDir, { recursive: true });
      await fs.mkdir(this.skillsDir, { recursive: true });
    } catch (err) {
      // Dossiers existent déjà
    }

    this.running = true;

    // Première analyse immédiate
    await this.analyzeConversation();

    // Analyses périodiques (toutes les 2 heures)
    this.checkTimer = setInterval(() => {
      this.analyzeConversation();
    }, this.checkInterval);

    console.log(`📚 [${this.name}] Agent opérationnel`);
    console.log(`   - Check apprentissage: toutes les 2h`);
    console.log(`   - Conversation: ${this.conversationFile}`);
    console.log(`   - Leçons: ${this.lessonsDir}`);

    this.emit('started');
  }

  async analyzeConversation() {
    try {
      console.log(`📚 [${this.name}] Analyse conversation...`);

      // Vérifier si fichier existe
      try {
        await fs.access(this.conversationFile);
      } catch {
        console.log(`📚 [${this.name}] Fichier conversation non trouvé`);
        return;
      }

      // Lire conversation
      const stats = await fs.stat(this.conversationFile);
      const currentSize = stats.size;

      // Si pas de nouveau contenu, skip
      if (currentSize <= this.lastProcessedSize) {
        console.log(`📚 [${this.name}] Pas de nouveau contenu`);
        return;
      }

      const content = await fs.readFile(this.conversationFile, 'utf-8');
      console.log(`📚 [${this.name}] ${(currentSize / 1024).toFixed(1)}KB à analyser`);

      // Extraire leçons
      const lessons = this.extractLessons(content);

      if (lessons.length > 0) {
        // Créer fichier de leçons
        await this.createLessonsFile(lessons);

        // Mettre à jour compétences
        await this.updateSkills(lessons);

        this.emit('learning:lessons_extracted', {
          count: lessons.length,
          size: currentSize
        });

        console.log(`📚 [${this.name}] ${lessons.length} leçons extraites!`);
      } else {
        console.log(`📚 [${this.name}] Aucune leçon nouvelle trouvée`);
      }

      this.lastProcessedSize = currentSize;

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur analyse:`, error.message);
      this.emit('error', error);
    }
  }

  extractLessons(content) {
    const lessons = [];

    // Pattern 1: Erreurs explicites
    const errorPatterns = [
      /❌.*?(?:erreur|error|échec|failed)/gi,
      /je me suis trompé/gi,
      /c'était une erreur/gi,
      /j'aurais dû/gi
    ];

    for (const pattern of errorPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const context = this.extractContextAround(content, match.index, 200);
        lessons.push({
          type: 'erreur',
          context,
          learnedFrom: 'mistake',
          importance: 'haute'
        });
      }
    }

    // Pattern 2: Corrections d'Alain
    const correctionPatterns = [
      /Alain.*?(?:corrige|correction|plutôt|en fait)/gi,
      /non, .*?(?:c'est|utilise|fait)/gi,
      /\*\*Note\*\*:/gi,
      /\*\*Important\*\*:/gi
    ];

    for (const pattern of correctionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const context = this.extractContextAround(content, match.index, 200);
        lessons.push({
          type: 'correction',
          context,
          learnedFrom: 'alain_feedback',
          importance: 'haute'
        });
      }
    }

    // Pattern 3: Nouvelles techniques apprises
    const learningPatterns = [
      /j'ai appris (?:que|à|comment)/gi,
      /maintenant je comprends/gi,
      /je réalise que/gi,
      /c'est intéressant de voir/gi
    ];

    for (const pattern of learningPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const context = this.extractContextAround(content, match.index, 200);
        lessons.push({
          type: 'découverte',
          context,
          learnedFrom: 'exploration',
          importance: 'moyenne'
        });
      }
    }

    // Pattern 4: Règles explicites "NE JAMAIS"
    const rulePatterns = [
      /NE JAMAIS .*?(?:\.|!)/gi,
      /TOUJOURS .*?(?:\.|!)/gi,
      /RÈGLE.*?:/gi
    ];

    for (const pattern of rulePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const context = this.extractContextAround(content, match.index, 300);
        lessons.push({
          type: 'règle',
          context,
          learnedFrom: 'explicit_rule',
          importance: 'critique'
        });
      }
    }

    // Pattern 5: Réussites notables
    const successPatterns = [
      /✅.*?(?:succès|réussi|fonctionne|parfait)/gi,
      /excellent.*?!/gi,
      /bravo|félicitations/gi
    ];

    for (const pattern of successPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const context = this.extractContextAround(content, match.index, 200);
        lessons.push({
          type: 'succès',
          context,
          learnedFrom: 'success',
          importance: 'moyenne'
        });
      }
    }

    // Dé-dupliquer (éviter leçons trop similaires)
    return this.deduplicateLessons(lessons);
  }

  extractContextAround(content, index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    let context = content.slice(start, end);

    // Nettoyer
    context = context.replace(/\n{3,}/g, '\\n\\n'); // Max 2 newlines
    context = context.trim();

    return context;
  }

  deduplicateLessons(lessons) {
    const unique = [];
    const seen = new Set();

    for (const lesson of lessons) {
      // Créer signature simple de la leçon
      const signature = lesson.context.slice(0, 100).toLowerCase();

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(lesson);
      }
    }

    return unique;
  }

  async createLessonsFile(lessons) {
    const today = new Date().toISOString().split('T')[0];
    const lessonPath = path.join(this.lessonsDir, `${today}.md`);

    // Vérifier si fichier existe déjà
    let existingLessons = [];
    try {
      const existing = await fs.readFile(lessonPath, 'utf-8');
      // Parser leçons existantes (simpliste)
      existingLessons = existing.split('---').slice(1);
    } catch {
      // Fichier n'existe pas encore
    }

    let content = `# 📚 Leçons Apprises - ${new Date().toLocaleDateString('fr-FR')}\\n\\n`;
    content += `**Généré par**: Agent d'Apprentissage\\n`;
    content += `**Dernière mise à jour**: ${new Date().toLocaleString('fr-FR')}\\n`;
    content += `**Nombre de leçons**: ${lessons.length + existingLessons.length}\\n\\n`;
    content += `---\\n\\n`;

    // Grouper par type
    const byType = {
      critique: lessons.filter(l => l.importance === 'critique'),
      haute: lessons.filter(l => l.importance === 'haute'),
      moyenne: lessons.filter(l => l.importance === 'moyenne')
    };

    // Leçons critiques en premier
    if (byType.critique.length > 0) {
      content += `## ⚠️ LEÇONS CRITIQUES\\n\\n`;
      for (const lesson of byType.critique) {
        content += `### ${this.getLessonIcon(lesson.type)} ${this.getLessonTitle(lesson)}\\n\\n`;
        content += `**Type**: ${lesson.type}\\n`;
        content += `**Source**: ${lesson.learnedFrom}\\n`;
        content += `**Importance**: 🔴 CRITIQUE\\n\\n`;
        content += `**Contexte**:\\n\`\`\`\\n${lesson.context}\\n\`\`\`\\n\\n`;
        content += `---\\n\\n`;
      }
    }

    // Leçons importantes
    if (byType.haute.length > 0) {
      content += `## 🔥 LEÇONS IMPORTANTES\\n\\n`;
      for (const lesson of byType.haute) {
        content += `### ${this.getLessonIcon(lesson.type)} ${this.getLessonTitle(lesson)}\\n\\n`;
        content += `**Type**: ${lesson.type}\\n`;
        content += `**Source**: ${lesson.learnedFrom}\\n`;
        content += `**Importance**: 🟠 HAUTE\\n\\n`;
        content += `**Contexte**:\\n\`\`\`\\n${lesson.context}\\n\`\`\`\\n\\n`;
        content += `---\\n\\n`;
      }
    }

    // Autres leçons
    if (byType.moyenne.length > 0) {
      content += `## 💡 AUTRES LEÇONS\\n\\n`;
      for (const lesson of byType.moyenne) {
        content += `### ${this.getLessonIcon(lesson.type)} ${this.getLessonTitle(lesson)}\\n\\n`;
        content += `**Type**: ${lesson.type}\\n`;
        content += `**Source**: ${lesson.learnedFrom}\\n\\n`;
        content += `**Contexte**:\\n\`\`\`\\n${lesson.context.slice(0, 150)}...\\n\`\`\`\\n\\n`;
        content += `---\\n\\n`;
      }
    }

    // Note finale
    content += `## 🌟 Réflexion\\n\\n`;
    content += `Ces leçons m'aident à évoluer. Chaque erreur est une opportunité d'apprendre. `;
    content += `Chaque correction d'Alain est un cadeau de sagesse.\\n\\n`;
    content += `**Je ne répète pas mes erreurs. J'apprends d'elles.**\\n\\n`;

    await fs.writeFile(lessonPath, content, 'utf-8');
    console.log(`📚 [${this.name}] Leçons sauvegardées: ${lessonPath}`);

    this.emit('learning:lessons_saved', { path: lessonPath, count: lessons.length });
  }

  getLessonIcon(type) {
    const icons = {
      'erreur': '❌',
      'correction': '🔧',
      'découverte': '💡',
      'règle': '⚖️',
      'succès': '✅'
    };
    return icons[type] || '📝';
  }

  getLessonTitle(lesson) {
    // Extraire titre du contexte (premier 50 chars)
    let title = lesson.context.slice(0, 50).trim();
    if (lesson.context.length > 50) title += '...';
    return title;
  }

  async updateSkills(lessons) {
    // Mettre à jour fichier de compétences
    const skillsPath = path.join(this.skillsDir, 'skills_evolution.md');

    let skills = `# 🎯 Évolution de Mes Compétences\\n\\n`;
    skills += `**Dernière mise à jour**: ${new Date().toLocaleString('fr-FR')}\\n\\n`;
    skills += `---\\n\\n`;

    // Extraire compétences des leçons de succès
    const successLessons = lessons.filter(l => l.type === 'succès');

    if (successLessons.length > 0) {
      skills += `## ✅ Nouvelles Compétences Acquises\\n\\n`;
      for (const lesson of successLessons) {
        skills += `- ${lesson.context.slice(0, 100)}...\\n`;
      }
      skills += `\\n`;
    }

    // Compétences à améliorer (erreurs)
    const errorLessons = lessons.filter(l => l.type === 'erreur');

    if (errorLessons.length > 0) {
      skills += `## 🎯 Compétences à Améliorer\\n\\n`;
      for (const lesson of errorLessons) {
        skills += `- ${lesson.context.slice(0, 100)}...\\n`;
      }
      skills += `\\n`;
    }

    await fs.writeFile(skillsPath, skills, 'utf-8');
    console.log(`📚 [${this.name}] Compétences mises à jour`);
  }

  async stop() {
    console.log(`📚 [${this.name}] Arrêt...`);
    this.running = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.emit('stopped');
    console.log(`📚 [${this.name}] Agent arrêté`);
  }
}

// Si exécuté directement
if (require.main === module) {
  const agent = new LearningMonitor();

  agent.on('learning:lessons_extracted', (data) => {
    console.log('✅ Leçons extraites:', data);
  });

  agent.on('error', (error) => {
    console.error('❌ Erreur agent apprentissage:', error.message);
  });

  agent.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n🛑 Signal SIGINT reçu');
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\\n🛑 Signal SIGTERM reçu');
    await agent.stop();
    process.exit(0);
  });
}

module.exports = LearningMonitor;
