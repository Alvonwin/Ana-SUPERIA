#!/usr/bin/env python3
"""Fix ana-core.cjs formatting properly"""

import re

file_path = 'E:/ANA/server/ana-core.cjs'

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Remove duplicate memoryManager import (keep only first one)
lines = content.split('\n')
memory_manager_lines = []
for i, line in enumerate(lines):
    if 'memoryManager = require' in line:
        memory_manager_lines.append(i)

if len(memory_manager_lines) > 1:
    # Remove duplicates (keep first)
    for line_num in reversed(memory_manager_lines[1:]):
        del lines[line_num]
    content = '\n'.join(lines)
    print(f"✅ Removed {len(memory_manager_lines)-1} duplicate memoryManager import(s)")

# Fix 2: Replace malformed ChromaDB capture line with properly formatted code
malformed_pattern = r"// Capture in ChromaDB for semantic search\s+try \{.*?Don't crash if ChromaDB fails - Ana still works\s+\}"

properly_formatted = """
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
              `ID=${chromaResult.exchangeId}`,
              `Chunks=${chromaResult.chunksCount}`
            );
          }
        } catch (chromaError) {
          console.error('❌ ChromaDB capture error:', chromaError.message);
          // Don't crash if ChromaDB fails - Ana still works
        }"""

content = re.sub(malformed_pattern, properly_formatted, content, flags=re.DOTALL)
print("✅ Replaced malformed ChromaDB code with proper formatting")

# Write fixed content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ File {file_path} fixed successfully")
