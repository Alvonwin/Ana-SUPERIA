const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern à trouver: après la boucle for des tools, avant le catch
const oldPattern = `          });
        }
      }
    }

  } catch (error) {
    console.error(\`❌ [ToolAgentV2] Erreur:\`, error.message);`;

const newPattern = `          });
        }
      }

      // FIX 2025-12-13: Ajouter instruction de synthèse après les tool results
      messages.push({
        role: 'user',
        content: 'Maintenant, formule une réponse claire et concise en français avec ces résultats. Ne demande pas quoi faire, réponds directement.'
      });
    }

  } catch (error) {
    console.error(\`❌ [ToolAgentV2] Erreur:\`, error.message);`;

if (content.includes('FIX 2025-12-13: Ajouter instruction de synthèse')) {
  console.log('SKIP: Already patched');
} else if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Synthesis instruction added');
} else {
  console.log('ERROR: Pattern not found');
}
