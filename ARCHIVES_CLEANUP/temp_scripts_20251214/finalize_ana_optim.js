/**
 * Script final d'optimisation ana-core-optimized.cjs
 * Ajoute:
 * - OPTIM 5c: Cache routing save
 * 8 Decembre 2025
 */

const fs = require('fs');

const file = 'E:/ANA/temp/ana-core-optimized.cjs';
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

console.log('=== Finalizing Ana Core Optimization ===\n');

// OPTIM 5c: Fix le classifyTask pour sauvegarder dans le cache
// Le check est deja en place, on doit ajouter le save avant chaque return

// Methode: On va wrapper les returns pour utiliser le cache
// On cherche le pattern du default return et on le modifie

const oldDefault = `    // Default - French model (tutoiement obligatoire)
    return { model: LLMS.FRENCH, reason: 'Conversation générale - French tutoiement' };
  }`;

const newDefault = `    // Default - French model (tutoiement obligatoire)
    const result = { model: LLMS.FRENCH, reason: 'Conversation générale - French tutoiement' };

    // PERF OPTIM: Cache the routing decision
    if (routingCache.size >= ROUTING_CACHE_MAX) {
      const firstKey = routingCache.keys().next().value;
      routingCache.delete(firstKey);
    }
    routingCache.set(cacheKey, result);
    return result;
  }`;

if (content.includes(oldDefault)) {
  content = content.replace(oldDefault, newDefault);
  console.log('[OPTIM 5c] Cache routing save on default - APPLIED');
} else {
  console.log('[OPTIM 5c] Default return pattern not found - checking alternate');

  // Alternative: chercher la fin de classifyTask plus generiquement
  const altPattern = "return { model: LLMS.FRENCH, reason: 'Conversation générale - French tutoiement' };";
  if (content.includes(altPattern)) {
    content = content.replace(
      altPattern,
      `const result = { model: LLMS.FRENCH, reason: 'Conversation générale - French tutoiement' };
    // PERF: Cache routing
    if (routingCache.size >= ROUTING_CACHE_MAX) routingCache.delete(routingCache.keys().next().value);
    routingCache.set(cacheKey, result);
    return result;`
    );
    console.log('[OPTIM 5c] Cache routing save (alternate) - APPLIED');
  } else {
    console.log('[OPTIM 5c] Could not find pattern to modify');
  }
}

// Save
fs.writeFileSync(file, content, 'utf8');
console.log('\nOptimized file saved to:', file);
console.log('\n=== Ana Core Optimization Complete ===');
