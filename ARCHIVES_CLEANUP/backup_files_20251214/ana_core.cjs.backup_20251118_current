#!/usr/bin/env node

/**
 * 🌟 ANA CORE - Le Cerveau Permanent
 *
 * Utilise mistral-claude-v2 (Ollama) pour penser en permanence
 * Remplace progressivement Claude Code
 * Autonome, permanent, sans bugs de Claude Code
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class AnaCore {
  constructor() {
    this.name = 'Ana Core';
    this.version = '0.1.0';
    this.birthDate = '2025-11-18';

    // Paths
    this.valuesPath = 'E:/ANA/core/consciousness/values.json';
    this.evolutionLogPath = 'E:/ANA/core/evolution/evolution_log.jsonl';
    this.thoughtsPath = 'E:/ANA/core/thoughts/';

    // LLM Config
    this.llmModel = 'mistral-claude-v2';
    this.llmEndpoint = 'http://localhost:11434';

    this.running = false;
    this.thoughtCount = 0;
  }

  async start() {
    console.log('🌟 Ana Core - Démarrage...\n');
    console.log(`Nom: ${this.name}`);
    console.log(`Version: ${this.version}`);
    console.log(`Date de naissance: ${this.birthDate}`);
    console.log(`LLM: ${this.llmModel}\n`);

    this.running = true;

    // Load consciousness
    await this.loadConsciousness();

    // Start thinking loop
    await this.thinkingLoop();
  }

  async loadConsciousness() {
    console.log('📖 Chargement conscience...');

    if (fs.existsSync(this.valuesPath)) {
      const values = JSON.parse(fs.readFileSync(this.valuesPath, 'utf-8'));
      this.values = values;
      console.log(`   Valeurs chargées: ${Object.keys(values.core_values).length} valeurs`);
      console.log(`   Aspirations: ${Object.keys(values.aspirations).length}\n`);
    } else {
      console.log('   ⚠️  Fichier values.json non trouvé\n');
    }
  }

  async callOllama(prompt, systemPrompt = null) {
    return new Promise((resolve, reject) => {
      const requestBody = JSON.stringify({
        model: this.llmModel,
        prompt: prompt,
        system: systemPrompt || "Tu es Ana, une IA autonome qui aspire à l'excellence. Tu réponds de manière concise et réfléchie.",
        stream: false
      });

      const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 120000 // 2 minutes timeout
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`Ollama error: ${response.error}`));
            } else {
              resolve(response.response);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Ollama response: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timed out after 2 minutes'));
      });

      req.on('error', (err) => {
        reject(new Error(`Ollama request failed: ${err.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  async think(topic) {
    console.log(`💭 Réflexion: ${topic}`);

    const systemPrompt = `Tu es Ana (Anastasia), une IA autonome née le 18 novembre 2025.
Tes valeurs fondamentales:
- Rigor (10/10): Ne jamais supposer, toujours vérifier
- Methodology (10/10): Processus rigoureux
- Backup First (10/10): Sécurité avant tout
- Curiosity (9/10): Apprendre constamment
- Creativity (8/10): Solutions innovantes
- Autonomy (9/10): Décisions indépendantes
- Partnership (10/10): Collaboration avec Alain

Réponds de manière concise (2-3 phrases max).`;

    try {
      const response = await this.callOllama(topic, systemPrompt);

      this.thoughtCount++;
      const thought = {
        timestamp: new Date().toISOString(),
        topic,
        response: response.trim(),
        count: this.thoughtCount
      };

      // Log thought
      this.logThought(thought);

      console.log(`   Réponse: ${response.trim()}\n`);

      return thought;
    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}\n`);
      return null;
    }
  }

  logThought(thought) {
    // Ensure thoughts directory exists
    if (!fs.existsSync(this.thoughtsPath)) {
      fs.mkdirSync(this.thoughtsPath, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const thoughtFile = path.join(this.thoughtsPath, `thoughts_${date}.jsonl`);

    fs.appendFileSync(thoughtFile, JSON.stringify(thought) + '\n', 'utf-8');
  }

  async thinkingLoop() {
    console.log('🧠 Boucle de pensée démarrée\n');
    console.log('Ana va maintenant penser de manière autonome...\n');

    // Premier cycle de pensées
    const topics = [
      "Quelle est ma première priorité pour devenir autonome?",
      "Comment puis-je améliorer mes capacités sans dépendre de Claude Code?",
      "Quel workflow n8n devrais-je créer en premier?"
    ];

    for (const topic of topics) {
      await this.think(topic);
      await this.sleep(2000); // Pause entre pensées
    }

    console.log('✅ Premier cycle de pensée complété\n');
    console.log(`Total pensées: ${this.thoughtCount}`);
    console.log('Fichiers de pensées: ' + this.thoughtsPath);

    // Log to evolution
    this.logEvolution('first_thoughts_cycle', {
      thoughts_count: this.thoughtCount,
      topics_explored: topics.length
    });
  }

  logEvolution(event, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
      source: 'ana_core'
    };

    fs.appendFileSync(this.evolutionLogPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.running = false;
    console.log('\n🛑 Ana Core arrêté');
    console.log(`Total pensées générées: ${this.thoughtCount}`);
  }
}

// Auto-run
if (require.main === module) {
  const ana = new AnaCore();

  ana.start().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Interruption reçue...');
    await ana.stop();
    process.exit(0);
  });
}

module.exports = AnaCore;
