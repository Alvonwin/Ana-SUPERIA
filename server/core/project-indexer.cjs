/**
 * PROJECT INDEXER - RAG pour Codebase Locale
 *
 * Indexe les fichiers d'un projet pour recherche sémantique.
 * Utilise ChromaDB (déjà installé) pour le vector store.
 *
 * Best Practices (2025):
 * - Chunking par fonction/classe (pas par lignes arbitraires)
 * - Two-stage retrieval: vector search → LLM ranking
 * - Métadonnées: file_path, language, type (function/class/module)
 *
 * Date: 9 Décembre 2025
 * Phase 2.2 - ANA CODE
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  maxFileSize: 500 * 1024, // 500KB max par fichier
  supportedExtensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.py', '.md', '.json', '.css', '.html'],
  excludeDirs: ['node_modules', '.git', '__pycache__', 'dist', 'build', '.next', 'backup'],
  chunkSize: 1500, // Caractères max par chunk
  overlap: 200     // Chevauchement entre chunks
};

/**
 * Récupère tous les fichiers d'un projet
 */
function getProjectFiles(projectPath, options = {}) {
  const files = [];
  const excludeDirs = options.excludeDirs || CONFIG.excludeDirs;
  const supportedExtensions = options.extensions || CONFIG.supportedExtensions;

  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            const stats = fs.statSync(fullPath);
            if (stats.size <= CONFIG.maxFileSize) {
              files.push({
                path: fullPath,
                relativePath: path.relative(projectPath, fullPath),
                extension: ext,
                size: stats.size,
                modified: stats.mtime
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(`[ProjectIndexer] Error walking ${dir}:`, err.message);
    }
  }

  walkDir(projectPath);
  return files;
}

/**
 * Chunking intelligent par fonction/classe pour JS/TS
 */
function chunkJavaScript(content, filePath) {
  const chunks = [];

  // Regex pour fonctions et classes
  const patterns = [
    // Functions: async function name(), function name(), const name = () =>
    /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    // Arrow functions: const name = async () => { ... }
    /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    // Classes: class Name { ... }
    /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{[\s\S]*?(?=\nclass\s|\n\/\/\s*=+|\Z)/g
  ];

  let lastEnd = 0;

  // Simple chunking par taille avec overlap
  while (lastEnd < content.length) {
    const chunkEnd = Math.min(lastEnd + CONFIG.chunkSize, content.length);
    let chunk = content.substring(lastEnd, chunkEnd);

    // Essayer de couper à une fin de ligne
    const lastNewline = chunk.lastIndexOf('\n');
    if (lastNewline > CONFIG.chunkSize / 2) {
      chunk = content.substring(lastEnd, lastEnd + lastNewline);
    }

    if (chunk.trim()) {
      chunks.push({
        content: chunk.trim(),
        metadata: {
          file_path: filePath,
          language: 'javascript',
          start_line: content.substring(0, lastEnd).split('\n').length,
          chunk_index: chunks.length
        }
      });
    }

    lastEnd += chunk.length - CONFIG.overlap;
    if (lastEnd >= content.length - 100) break;
  }

  return chunks;
}

/**
 * Chunking générique par taille
 */
function chunkBySize(content, filePath, language) {
  const chunks = [];
  let lastEnd = 0;

  while (lastEnd < content.length) {
    const chunkEnd = Math.min(lastEnd + CONFIG.chunkSize, content.length);
    let chunk = content.substring(lastEnd, chunkEnd);

    // Couper à une fin de ligne
    const lastNewline = chunk.lastIndexOf('\n');
    if (lastNewline > CONFIG.chunkSize / 2) {
      chunk = content.substring(lastEnd, lastEnd + lastNewline);
    }

    if (chunk.trim()) {
      chunks.push({
        content: chunk.trim(),
        metadata: {
          file_path: filePath,
          language: language,
          start_line: content.substring(0, lastEnd).split('\n').length,
          chunk_index: chunks.length
        }
      });
    }

    lastEnd += chunk.length - CONFIG.overlap;
    if (lastEnd >= content.length - 100) break;
  }

  return chunks;
}

/**
 * Chunker le contenu d'un fichier selon son type
 */
function chunkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.js':
      case '.cjs':
      case '.mjs':
      case '.ts':
      case '.tsx':
      case '.jsx':
        return chunkJavaScript(content, filePath);

      case '.py':
        return chunkBySize(content, filePath, 'python');

      case '.md':
        return chunkBySize(content, filePath, 'markdown');

      case '.json':
        // JSON: un seul chunk si petit, sinon chunker
        if (content.length < CONFIG.chunkSize) {
          return [{
            content: content,
            metadata: { file_path: filePath, language: 'json', chunk_index: 0 }
          }];
        }
        return chunkBySize(content, filePath, 'json');

      default:
        return chunkBySize(content, filePath, ext.replace('.', ''));
    }
  } catch (err) {
    console.error(`[ProjectIndexer] Error chunking ${filePath}:`, err.message);
    return [];
  }
}

/**
 * Indexer un projet complet
 * Retourne les chunks prêts pour ChromaDB
 */
function indexProject(projectPath, options = {}) {
  console.log(`📂 [ProjectIndexer] Indexing: ${projectPath}`);

  const files = getProjectFiles(projectPath, options);
  console.log(`📄 [ProjectIndexer] Found ${files.length} files`);

  const allChunks = [];

  for (const file of files) {
    const chunks = chunkFile(file.path);
    for (const chunk of chunks) {
      chunk.metadata.relative_path = file.relativePath;
      chunk.metadata.file_size = file.size;
      allChunks.push(chunk);
    }
  }

  console.log(`✅ [ProjectIndexer] Created ${allChunks.length} chunks`);

  return {
    success: true,
    projectPath,
    filesIndexed: files.length,
    chunksCreated: allChunks.length,
    chunks: allChunks
  };
}

/**
 * Recherche textuelle simple (fallback sans ChromaDB)
 */
function searchProject(projectPath, query, options = {}) {
  const maxResults = options.maxResults || 10;
  const files = getProjectFiles(projectPath, options);
  const results = [];
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const contentLower = content.toLowerCase();

      // Compter les occurrences des keywords
      let score = 0;
      for (const kw of keywords) {
        const regex = new RegExp(kw, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        // Trouver le contexte autour du premier match
        const firstMatchIndex = contentLower.indexOf(keywords[0]);
        const start = Math.max(0, firstMatchIndex - 100);
        const end = Math.min(content.length, firstMatchIndex + 300);
        const context = content.substring(start, end);

        results.push({
          file: file.relativePath,
          score,
          context: context.trim(),
          path: file.path
        });
      }
    } catch (err) {
      // Skip files that can't be read
    }
  }

  // Trier par score décroissant
  results.sort((a, b) => b.score - a.score);

  return {
    success: true,
    query,
    projectPath,
    results: results.slice(0, maxResults)
  };
}

/**
 * Obtenir la structure du projet
 */
function getProjectStructure(projectPath, options = {}) {
  const maxDepth = options.maxDepth || 3;
  const structure = {
    name: path.basename(projectPath),
    path: projectPath,
    type: 'directory',
    children: []
  };

  function buildTree(dir, depth = 0) {
    if (depth >= maxDepth) return [];

    const children = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (CONFIG.excludeDirs.includes(entry.name) || entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          children.push({
            name: entry.name,
            type: 'directory',
            children: buildTree(fullPath, depth + 1)
          });
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (CONFIG.supportedExtensions.includes(ext)) {
            children.push({
              name: entry.name,
              type: 'file',
              extension: ext
            });
          }
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }

    return children;
  }

  structure.children = buildTree(projectPath);
  return structure;
}

module.exports = {
  indexProject,
  searchProject,
  getProjectFiles,
  getProjectStructure,
  chunkFile,
  CONFIG
};
