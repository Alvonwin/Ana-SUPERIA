const fs = require('fs');

// Read the file
const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add memoryManager import after line with memoryCapture
const importLine = "const memoryCapture = require('./services/memory-capture.cjs');";
const newImport = importLine + "\nconst memoryManager = require('./memory/memory-manager.cjs');";
content = content.replace(importLine, newImport);

// 2. Add ChromaDB capture after the memoryCapture try-catch block
const marker = `        } catch (captureError) {
          console.error('❌ Memory capture error:', captureError.message);
          // Don't crash if memory capture fails - Ana still works
        }
      });`;

const chromaCode = `        } catch (captureError) {
          console.error('❌ Memory capture error:', captureError.message);
          // Don't crash if memory capture fails - Ana still works
        }

        // Capture in ChromaDB for semantic search
        try {
          const chromaResult = await memoryManager.addConversation({
            userMessage: message,
            anaResponse: fullResponse,
            model: model,
            metadata: {
              images: images ? images.length : 0,
              context: context || {}
            }
          });

          if (chromaResult.success) {
            console.log('🔍 ChromaDB captured:',
              \`ID=\${chromaResult.exchangeId}\`,
              \`Chunks=\${chromaResult.chunksCount}\`
            );
          }
        } catch (chromaError) {
          console.error('❌ ChromaDB capture error:', chromaError.message);
          // Don't crash if ChromaDB fails - Ana still works
        }
      });`;

content = content.replace(marker, chromaCode);

// Write the file
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ File successfully updated');
console.log('   - memoryManager import added');
console.log('   - ChromaDB capture integrated');
