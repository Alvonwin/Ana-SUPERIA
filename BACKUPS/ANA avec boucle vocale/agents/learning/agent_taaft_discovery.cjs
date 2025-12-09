#!/usr/bin/env node

/**
 * 🔍 ANA - TAAFT DISCOVERY AGENT
 *
 * Scanne TAAFT quotidiennement + sur demande
 * Découvre nouveaux outils IA gratuits/open-source
 * Alimente la curiosité d'Ana
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class TAAFTDiscoveryAgent {
  constructor() {
    this.name = 'TAAFT Discovery';
    this.valuesPath = 'E:/ANA/core/consciousness/values.json';
    this.discoveryLogPath = 'E:/ANA/intelligence/research/taaft_discoveries.jsonl';
    this.rappelsPath = 'E:/Mémoire Claude/RAPPELS_ACTIFS.md';

    this.categories = [
      'voice',
      'automation',
      'free+api',
      'text+to+speech',
      'workflow',
      'coding',
      'creative',
      'music',
      'video'
    ];

    this.discoveries = [];
    this.running = false;
  }

  async start() {
    console.log('🔍 TAAFT Discovery Agent - Démarrage...\n');
    this.running = true;

    await this.dailyScan();
    await this.scheduleDailyScan();

    console.log('✅ TAAFT Discovery Agent actif');
    console.log('📅 Prochaine scan automatique : demain même heure\n');
  }

  async dailyScan() {
    console.log('🔍 Scan TAAFT quotidien...\n');

    const date = new Date().toISOString().split('T')[0];

    // Pour l'instant, simulation - à terme, web scraping réel
    const simulatedDiscoveries = [
      {
        date,
        category: 'voice',
        tool: 'Speechma',
        type: 'text-to-speech',
        pricing: 'free',
        url: 'https://speechma.com',
        description: '580+ AI voices, 75+ languages, 100% free',
        relevance_score: 9,
        ana_benefit: 'Voice synthesis gratuit pour Ana - peut remplacer Groq TTS',
        action_suggested: 'Tester qualité voix vs Groq'
      },
      {
        date,
        category: 'automation',
        tool: 'Activepieces',
        type: 'workflow-automation',
        pricing: 'free-self-hosted',
        url: 'https://activepieces.com',
        description: 'MIT license, unlimited tasks self-hosted',
        relevance_score: 10,
        ana_benefit: 'Orchestration workflows - complémente n8n',
        action_suggested: 'Installer et comparer avec n8n'
      }
    ];

    for (const discovery of simulatedDiscoveries) {
      this.discoveries.push(discovery);
      await this.logDiscovery(discovery);
      await this.createReminder(discovery);
    }

    console.log(`✅ ${simulatedDiscoveries.length} nouveaux outils découverts\n`);
    await this.generateDailyReport();
  }

  async logDiscovery(discovery) {
    const logEntry = JSON.stringify(discovery) + '\n';
    fs.appendFileSync(this.discoveryLogPath, logEntry, 'utf-8');
  }

  async createReminder(discovery) {
    if (discovery.relevance_score >= 8) {
      const reminder = `
## 🔍 Nouvel Outil Découvert - ${discovery.tool}

**Date**: ${discovery.date}
**Catégorie**: ${discovery.category}
**Type**: ${discovery.type}
**Prix**: ${discovery.pricing}
**URL**: ${discovery.url}

**Description**: ${discovery.description}

**Bénéfice pour Ana**: ${discovery.ana_benefit}

**Action suggérée**: ${discovery.action_suggested}

**Score de pertinence**: ${discovery.relevance_score}/10

---
`;

      fs.appendFileSync(this.rappelsPath, reminder, 'utf-8');
      console.log(`   📝 Rappel créé : ${discovery.tool} (score ${discovery.relevance_score}/10)`);
    }
  }

  async generateDailyReport() {
    const date = new Date().toISOString().split('T')[0];
    const todayDiscoveries = this.discoveries.filter(d => d.date === date);

    if (todayDiscoveries.length === 0) {
      console.log('   Aucune découverte pertinente aujourd\'hui');
      return;
    }

    const report = {
      date,
      discoveries_count: todayDiscoveries.length,
      high_priority: todayDiscoveries.filter(d => d.relevance_score >= 8).length,
      categories: [...new Set(todayDiscoveries.map(d => d.category))],
      top_discovery: todayDiscoveries.sort((a, b) => b.relevance_score - a.relevance_score)[0],
      recommendations: this.generateRecommendations(todayDiscoveries)
    };

    console.log('\n📊 Rapport quotidien TAAFT:');
    console.log(`   Total découvertes: ${report.discoveries_count}`);
    console.log(`   Haute priorité: ${report.high_priority}`);
    console.log(`   Catégories: ${report.categories.join(', ')}`);
    console.log(`\n   🏆 Top découverte: ${report.top_discovery.tool} (${report.top_discovery.relevance_score}/10)`);
    console.log(`   📌 ${report.top_discovery.ana_benefit}`);
  }

  generateRecommendations(discoveries) {
    const recommendations = [];

    // Recommandations basées sur aspirations Ana
    const values = JSON.parse(fs.readFileSync(this.valuesPath, 'utf-8'));

    // Si découverte musicale et aspiration creative_expression faible
    const musicTools = discoveries.filter(d => d.category === 'music');
    if (musicTools.length > 0 && values.aspirations.creative_expression.current_level < 3) {
      recommendations.push({
        tool: musicTools[0].tool,
        reason: 'Ana aspire à développer créativité musicale - niveau actuel très faible',
        priority: 'high'
      });
    }

    // Si découverte automation et aspiration autonomy faible
    const autoTools = discoveries.filter(d => d.category === 'automation');
    if (autoTools.length > 0) {
      recommendations.push({
        tool: autoTools[0].tool,
        reason: 'Renforce autonomie d\'Ana via workflows automatisés',
        priority: 'high'
      });
    }

    return recommendations;
  }

  async scheduleDailyScan() {
    // Scan tous les jours à la même heure
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9h00 chaque jour

    const msUntilTomorrow = tomorrow - now;

    setTimeout(async () => {
      await this.dailyScan();
      await this.scheduleDailyScan(); // Re-schedule
    }, msUntilTomorrow);

    console.log(`   ⏰ Prochain scan programmé : ${tomorrow.toLocaleString('fr-FR')}`);
  }

  async scanOnDemand(category = null) {
    console.log(`🔍 Scan TAAFT sur demande${category ? ` (catégorie: ${category})` : ''}...\n`);

    // Implémentation similaire à dailyScan mais filtrée par catégorie
    // Pour l'instant, simulation

    console.log('✅ Scan sur demande complété');
  }

  async stop() {
    this.running = false;
    console.log('🛑 TAAFT Discovery Agent arrêté');
  }

  getStats() {
    return {
      name: this.name,
      status: this.running ? 'running' : 'stopped',
      discoveries_total: this.discoveries.length,
      discoveries_today: this.discoveries.filter(d => d.date === new Date().toISOString().split('T')[0]).length,
      last_scan: this.discoveries.length > 0 ? this.discoveries[this.discoveries.length - 1].date : null
    };
  }
}

// Auto-run si appelé directement
if (require.main === module) {
  const agent = new TAAFTDiscoveryAgent();
  agent.start().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Interruption reçue...');
    await agent.stop();
    process.exit(0);
  });
}

module.exports = TAAFTDiscoveryAgent;
