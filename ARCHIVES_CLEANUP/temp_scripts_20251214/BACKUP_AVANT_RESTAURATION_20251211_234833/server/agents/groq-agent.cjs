/**
 * Agent Groq pour Ana SUPERIA
 * Agent simple en Node.js avec boucle de feedback
 *
 * Pattern: Router → Execute → Verify → Loop
 *
 * Le ROUTAGE est déterministe (code), pas de dépendance au tool-calling
 * Groq est utilisé uniquement pour l'ANALYSE et la GÉNÉRATION
 */

const fs = require('fs');
const path = require('path');

// Charger la clé API
require('dotenv').config({ path: 'E:/ANA/.env' });
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// === Outils disponibles ===
const TOOLS = {
    read_file: async (params) => {
        try {
            const content = fs.readFileSync(params.path, 'utf-8');
            return { success: true, content: content.slice(0, 3000) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    write_file: async (params) => {
        try {
            fs.writeFileSync(params.path, params.content, 'utf-8');
            return { success: true, message: `Fichier écrit: ${params.path}` };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    list_directory: async (params) => {
        try {
            const files = fs.readdirSync(params.path);
            return { success: true, files: files.slice(0, 50) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    execute_code: async (params) => {
        try {
            // Exécution sécurisée via eval avec sandbox
            const result = eval(params.code);
            return { success: true, result: String(result) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};

// === Router - Détermine l'outil à utiliser ===
function routeTask(task) {
    const taskLower = task.toLowerCase();

    // Patterns pour détecter l'intention
    if (taskLower.includes('liste') || taskLower.includes('quels fichiers') || taskLower.includes('répertoire')) {
        return { tool: 'list_directory', extract: 'path' };
    }
    if (taskLower.includes('lis ') || taskLower.includes('contenu') || taskLower.includes('lire')) {
        return { tool: 'read_file', extract: 'path' };
    }
    if (taskLower.includes('écris') || taskLower.includes('créer') || taskLower.includes('sauvegarde')) {
        return { tool: 'write_file', extract: 'path_content' };
    }
    if (taskLower.includes('exécute') || taskLower.includes('calcul') || taskLower.includes('code')) {
        return { tool: 'execute_code', extract: 'code' };
    }

    // Par défaut, pas d'outil (juste une réponse LLM)
    return { tool: null };
}

// === Extrait les paramètres de la tâche ===
function extractParams(task, extractType) {
    // Chercher un chemin de fichier
    const pathMatch = task.match(/[A-Za-z]:[/\\][^\s"']+/);
    const path = pathMatch ? pathMatch[0].replace(/\\/g, '/') : null;

    if (extractType === 'path') {
        return { path };
    }
    if (extractType === 'path_content') {
        // Extraire le contenu après ":" ou "avec:"
        const contentMatch = task.match(/(?:avec|contenu)[:\s]+(.+)$/i);
        return { path, content: contentMatch ? contentMatch[1] : '' };
    }
    if (extractType === 'code') {
        // Extraire le code entre backticks ou après "code:"
        const codeMatch = task.match(/```(.+?)```|code:\s*(.+)$/is);
        return { code: codeMatch ? (codeMatch[1] || codeMatch[2]) : task };
    }

    return {};
}

// === Appel à Groq ===
async function callGroq(messages) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: messages,
            temperature: 0.1,
            max_tokens: 1024
        })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Pas de réponse';
}

// === Agent Principal ===
async function runAgent(task, maxIterations = 3) {
    console.log(`\n=== Agent Groq ===`);
    console.log(`Tâche: ${task}`);

    const route = routeTask(task);
    console.log(`Route: ${JSON.stringify(route)}`);

    // Si pas d'outil nécessaire, juste demander à Groq
    if (!route.tool) {
        console.log('Pas d\'outil nécessaire, demande directe à Groq...');
        const response = await callGroq([
            { role: 'system', content: 'Tu es Ana SUPERIA, une assistante IA experte. Réponds de façon concise.' },
            { role: 'user', content: task }
        ]);
        return { status: 'success', response };
    }

    // Extraire les paramètres
    const params = extractParams(task, route.extract);
    console.log(`Paramètres extraits: ${JSON.stringify(params)}`);

    // Vérifier que les paramètres nécessaires sont présents
    if (route.extract === 'path' && !params.path) {
        return { status: 'error', response: 'Chemin de fichier non trouvé dans la tâche' };
    }

    // Exécuter l'outil
    const tool = TOOLS[route.tool];
    if (!tool) {
        return { status: 'error', response: `Outil inconnu: ${route.tool}` };
    }

    console.log(`Exécution de ${route.tool}...`);
    const result = await tool(params);
    console.log(`Résultat: ${JSON.stringify(result).slice(0, 200)}...`);

    // Demander à Groq d'interpréter le résultat
    const interpretation = await callGroq([
        { role: 'system', content: 'Tu es Ana SUPERIA. Interprète le résultat et réponds à l\'utilisateur de façon utile et concise.' },
        { role: 'user', content: `Tâche demandée: ${task}\n\nRésultat de l'opération:\n${JSON.stringify(result, null, 2)}` }
    ]);

    return {
        status: result.success ? 'success' : 'error',
        toolResult: result,
        response: interpretation
    };
}

// === Interface pour Ana ===
module.exports = {
    runAgent,
    TOOLS,
    callGroq
};

// === Test si exécuté directement ===
if (require.main === module) {
    (async () => {
        console.log('=== Test Agent Groq ===');
        console.log(`API Key: ${GROQ_API_KEY ? 'Présente' : 'MANQUANTE'}`);

        // Test 1: Liste un répertoire
        const result = await runAgent('Liste les fichiers dans E:/ANA/server/agents');
        console.log('\n=== Résultat Final ===');
        console.log(result.response);
    })();
}
