const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

let content = fs.readFileSync(path, 'utf8');

const old = `    // Vision tasks - Llama Vision
    if (context.hasImage || msgLower.includes('image') || msgLower.includes('photo')) {
      return { model: LLMS.LLAMA_VISION, reason: 'T\u00e2che visuelle d\u00e9tect\u00e9e' };
    }`;

const newCode = `    // Vision tasks - Llama Vision (only for analyzing, NOT generating images)
    const isGenerateImage = msgLower.includes('génère') || msgLower.includes('genere') || msgLower.includes('créer une image');
    if (!isGenerateImage && (context.hasImage || msgLower.includes('décris') || msgLower.includes('analyse cette'))) {
      return { model: LLMS.LLAMA_VISION, reason: 'Tâche visuelle détectée' };
    }`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: Vision routing fixed');
} else {
  // Try with different encoding
  const old2 = "// Vision tasks - Llama Vision\n    if (context.hasImage || msgLower.includes('image') || msgLower.includes('photo'))";
  if (content.includes(old2)) {
    content = content.replace(/\/\/ Vision tasks - Llama Vision\s*\n\s*if \(context\.hasImage \|\| msgLower\.includes\('image'\) \|\| msgLower\.includes\('photo'\)\) \{\s*\n\s*return \{ model: LLMS\.LLAMA_VISION, reason: '[^']*' \};\s*\n\s*\}/,
      newCode);
    fs.writeFileSync(path, content);
    console.log('SUCCESS: Vision routing fixed (regex)');
  } else {
    console.log('Pattern not found');
  }
}
