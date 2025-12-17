/**
 * Script pour ajouter l'event WebSocket Coding Agent à ana-core.cjs
 */

const fs = require('fs');
const path = require('path');

const anaCorePath = path.join(__dirname, '..', 'ana-core.cjs');

// Lire le fichier
let content = fs.readFileSync(anaCorePath, 'utf8');

// Vérifier si déjà présent
if (content.includes("socket.on('coding:run'")) {
  console.log('ℹ️ WebSocket coding:run déjà présent');
  process.exit(0);
}

// Trouver la position après stats:request
const marker = "socket.on('stats:request'";
const insertPosition = content.indexOf(marker);

if (insertPosition === -1) {
  console.log('❌ Marker stats:request non trouvé');
  process.exit(1);
}

// Trouver la fin du bloc stats:request (chercher le }); suivant)
let endPosition = content.indexOf('});', insertPosition);
if (endPosition !== -1) {
  endPosition += 3; // Inclure });
}

// Code à insérer
const codingAgentWebSocket = `

  // Coding Agent - Real-time task execution
  socket.on('coding:run', async (data, callback) => {
    const { task, context, dryRun } = data;

    if (!task) {
      if (callback) callback({ success: false, error: 'Task required' });
      return;
    }

    try {
      console.log('🤖 [WebSocket] Coding Agent task:', task.substring(0, 100));

      // Émettre le début
      socket.emit('coding:started', { task: task.substring(0, 100), timestamp: new Date().toISOString() });

      const agent = new CodingAgent({ dryRun: dryRun || false });
      const result = await agent.run(task, context || {});

      // Émettre les actions effectuées
      if (result.actions && result.actions.length > 0) {
        result.actions.forEach((action, index) => {
          socket.emit('coding:action', {
            index,
            total: result.actions.length,
            tool: action.tool,
            success: action.result?.success,
            timestamp: action.timestamp
          });
        });
      }

      // Émettre le résultat final
      socket.emit('coding:completed', result);

      if (callback) callback(result);
    } catch (error) {
      console.error('❌ [WebSocket] Coding Agent error:', error.message);
      const errorResult = { success: false, error: error.message };
      socket.emit('coding:error', errorResult);
      if (callback) callback(errorResult);
    }
  });

`;

// Insérer après le bloc stats:request
content = content.slice(0, endPosition) + codingAgentWebSocket + content.slice(endPosition);

// Sauvegarder
fs.writeFileSync(anaCorePath, content, 'utf8');
console.log('✅ WebSocket coding:run ajouté');
