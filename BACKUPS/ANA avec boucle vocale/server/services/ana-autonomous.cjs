/**
 * Ana Autonomous Service
 * Moteur autonome avec boucle ReAct (Reasoning-Action-Observation)
 *
 * Architecture: User Request → ReAct Loop → Tool Execution → LLM Reasoning → LOOP
 */

const axios = require('axios');
const ToolExecutor = require('./tool-executor.cjs');
const { TOOL_DEFINITIONS, SYSTEM_PROMPT } = require('../config/tool-definitions.cjs');

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen2.5-coder:7b'; // Qwen2.5-Coder pour tool calling (7B, supporte JSON structuré)
const MAX_ITERATIONS = 12; // Prévention boucles infinies
const MAX_CALLS_PER_TOOL = 8; // Prévention surcharge un seul outil

class AnaAutonomous {
  constructor() {
    this.toolExecutor = new ToolExecutor();
  }

  /**
   * Exécute une tâche de façon autonome
   * @param {string} userRequest - Requête utilisateur
   * @param {object} options - { maxIterations, streaming }
   * @returns {Promise<object>} Résultat final
   */
  async executeTask(userRequest, options = {}) {
    const maxIterations = options.maxIterations || MAX_ITERATIONS;

    console.log(`\n🚀 ANA AUTONOMOUS - Démarrage tâche`);
    console.log(`📝 Requête: "${userRequest}"`);
    console.log(`⚙️  Max iterations: ${maxIterations}\n`);

    // État de la conversation
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userRequest }
    ];

    // Historique d'exécution
    const executionHistory = [];

    // Compteurs de sécurité
    let iteration = 0;
    const toolCallCounts = {}; // Compteur par outil

    try {
      // Boucle ReAct
      while (iteration < maxIterations) {
        iteration++;
        console.log(`\n🔄 Iteration ${iteration}/${maxIterations}`);

        // 1. REASONING PHASE: Demander à DeepSeek de raisonner
        const llmResponse = await this._callDeepSeek(messages);

        console.log(`🧠 Ana pense: ${llmResponse.substring(0, 150)}...`);

        // 2. PARSING: Extraire les appels d'outils
        const toolCalls = this._parseToolCalls(llmResponse);

        // Enregistrer dans l'historique
        executionHistory.push({
          iteration,
          thinking: llmResponse,
          toolCalls: toolCalls,
          timestamp: new Date().toISOString()
        });

        // 3. DECISION: Tâche terminée ou continuer ?
        if (toolCalls.length === 0) {
          // Pas d'appels d'outils = tâche terminée
          console.log(`✅ Tâche terminée (Ana n'a plus d'actions à effectuer)`);

          return {
            success: true,
            completed: true,
            finalResponse: llmResponse,
            iterations: iteration,
            executionHistory,
            stats: this.toolExecutor.getStats()
          };
        }

        // 4. VALIDATION: Vérifier limites de sécurité
        for (const toolCall of toolCalls) {
          toolCallCounts[toolCall.tool] = (toolCallCounts[toolCall.tool] || 0) + 1;

          if (toolCallCounts[toolCall.tool] > MAX_CALLS_PER_TOOL) {
            throw new Error(
              `Limite de sécurité atteinte: outil "${toolCall.tool}" appelé ${toolCallCounts[toolCall.tool]} fois (max: ${MAX_CALLS_PER_TOOL})`
            );
          }
        }

        // 5. ACTION PHASE: Exécuter les outils
        console.log(`⚡ Exécution de ${toolCalls.length} outil(s)...`);

        const toolResults = [];
        for (const toolCall of toolCalls) {
          const result = await this.toolExecutor.execute(toolCall);
          toolResults.push(result);

          // Log résultat
          if (result.success) {
            console.log(`  ✓ ${toolCall.tool}: succès`);
          } else {
            console.log(`  ✗ ${toolCall.tool}: ${result.error.message}`);
          }
        }

        // Ajouter résultats à l'historique
        executionHistory[executionHistory.length - 1].toolResults = toolResults;

        // 6. OBSERVATION PHASE: Retourner résultats au LLM
        const observationMessage = this._formatObservation(toolResults);

        messages.push({
          role: 'assistant',
          content: llmResponse
        });

        messages.push({
          role: 'user',
          content: observationMessage
        });

        console.log(`📊 Observation retournée à Ana`);

        // Si toutes les actions ont échoué, arrêter
        const allFailed = toolResults.every(r => !r.success);
        if (allFailed) {
          console.log(`⚠️  Tous les outils ont échoué - arrêt de la boucle`);

          return {
            success: false,
            completed: false,
            error: 'Tous les outils ont échoué',
            finalResponse: llmResponse,
            iterations: iteration,
            executionHistory,
            stats: this.toolExecutor.getStats()
          };
        }

        // Continuer la boucle...
      }

      // Max iterations atteint
      console.log(`⏱️  Maximum d'itérations atteint (${maxIterations})`);

      return {
        success: false,
        completed: false,
        error: `Maximum d'itérations atteint (${maxIterations})`,
        finalResponse: messages[messages.length - 1].content,
        iterations: iteration,
        executionHistory,
        stats: this.toolExecutor.getStats()
      };

    } catch (error) {
      console.error(`❌ Erreur critique:`, error.message);

      return {
        success: false,
        completed: false,
        error: error.message,
        iterations: iteration,
        executionHistory,
        stats: this.toolExecutor.getStats()
      };
    }
  }

  /**
   * Appel au LLM via Ollama (Qwen2.5-coder pour tool calling)
   * @private
   */
  async _callLLM(messages, options = {}) {
    const retryCount = options.retryCount || 2;
    const temperature = options.temperature || 0.3;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
          model: MODEL,
          messages: messages,
          stream: false,
          options: {
            temperature: temperature,
            top_p: 0.95,
            top_k: 40,
            num_predict: 2048,
            repeat_penalty: 1.1
          }
        }, {
          timeout: 120000 // 2 minutes
        });

        return response.data.message.content;

      } catch (error) {
        console.error(`❌ Tentative ${attempt}/${retryCount} échouée:`, error.message);

        if (attempt === retryCount) {
          throw new Error(`Erreur LLM après ${retryCount} tentatives: ${error.message}`);
        }

        // Attendre avant retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Backward compatibility alias
  async _callDeepSeek(messages) {
    return this._callLLM(messages);
  }

  /**
   * Crée un plan d'exécution pour une tâche complexe
   * @param {string} task - Description de la tâche
   * @returns {Promise<Array>} - Liste d'étapes planifiées
   */
  async createPlan(task) {
    const planningPrompt = `Tu dois créer un plan d'exécution pour cette tâche:
"${task}"

Décompose en étapes concrètes et actionnables. Pour chaque étape, indique:
1. L'action à effectuer
2. Les outils nécessaires
3. Les dépendances (si applicable)

Format JSON attendu:
{
  "steps": [
    {"action": "description", "tools": ["tool1"], "dependencies": []},
    ...
  ],
  "estimatedIterations": 5
}

Réponds UNIQUEMENT avec le JSON, pas d'explication.`;

    const messages = [
      { role: 'system', content: 'Tu es un planificateur de tâches expert. Tu crées des plans d\'exécution structurés.' },
      { role: 'user', content: planningPrompt }
    ];

    try {
      const response = await this._callLLM(messages, { temperature: 0.2 });

      // Extraire le JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        return plan;
      }

      return { steps: [], estimatedIterations: MAX_ITERATIONS };
    } catch (error) {
      console.error('Erreur création plan:', error.message);
      return { steps: [], estimatedIterations: MAX_ITERATIONS };
    }
  }

  /**
   * Parse les appels d'outils depuis la réponse LLM
   * Format attendu: {"tool": "nom_outil", "params": {...}}
   * Support amélioré pour JSON imbriqués et malformés
   * @private
   */
  _parseToolCalls(llmResponse) {
    const toolCalls = [];

    try {
      // Méthode 1: Chercher les blocs JSON standards
      const jsonPattern = /\{[\s\S]*?"tool"\s*:\s*"[^"]+"\s*,\s*"params"\s*:\s*\{[^}]*\}\s*\}/g;
      const matches = llmResponse.match(jsonPattern);

      if (matches) {
        for (const match of matches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.tool && parsed.params) {
              toolCalls.push(parsed);
            }
          } catch (e) {
            // Essayer de réparer le JSON
            const repaired = this._repairJSON(match);
            if (repaired) {
              toolCalls.push(repaired);
            }
          }
        }
      }

      // Méthode 2: Chercher dans les blocs de code markdown
      if (toolCalls.length === 0) {
        const codeBlockPattern = /```json?\s*([\s\S]*?)```/g;
        let codeMatch;
        while ((codeMatch = codeBlockPattern.exec(llmResponse)) !== null) {
          try {
            const parsed = JSON.parse(codeMatch[1].trim());
            if (parsed.tool && parsed.params) {
              toolCalls.push(parsed);
            } else if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item.tool && item.params) {
                  toolCalls.push(item);
                }
              }
            }
          } catch (e) {
            // Ignorer
          }
        }
      }

    } catch (error) {
      console.error('Erreur parsing tool calls:', error.message);
    }

    return toolCalls;
  }

  /**
   * Tente de réparer un JSON malformé
   * @private
   */
  _repairJSON(jsonString) {
    try {
      // Nettoyer caractères problématiques
      let cleaned = jsonString
        .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
        .replace(/,\s*}/g, '}')          // Trailing commas
        .replace(/,\s*]/g, ']')          // Trailing commas in arrays
        .replace(/'/g, '"');             // Single quotes to double

      const parsed = JSON.parse(cleaned);
      if (parsed.tool && parsed.params) {
        return parsed;
      }
    } catch (e) {
      // Impossible à réparer
    }
    return null;
  }

  /**
   * Formatte les résultats d'outils en message d'observation
   * @private
   */
  _formatObservation(toolResults) {
    let observation = 'RÉSULTATS DES OUTILS:\n\n';

    for (const result of toolResults) {
      if (result.success) {
        observation += `✓ ${result.tool}: SUCCÈS\n`;
        observation += `  Résultat: ${JSON.stringify(result.result, null, 2).substring(0, 500)}\n\n`;
      } else {
        observation += `✗ ${result.tool}: ERREUR\n`;
        observation += `  Message: ${result.error.message}\n\n`;
      }
    }

    observation += 'Analyse ces résultats et décide de la prochaine action. Si la tâche est terminée, explique ce qui a été accompli.';

    return observation;
  }

  /**
   * Obtenir les statistiques d'exécution
   */
  getStats() {
    return this.toolExecutor.getStats();
  }
}

module.exports = AnaAutonomous;
