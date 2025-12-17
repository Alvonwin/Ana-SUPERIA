$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# 1. Ajouter import du project-indexer (après git-manager)
$importSearch = "const gitManager = require('../core/git-manager.cjs');"
$importReplace = @'
const gitManager = require('../core/git-manager.cjs');
const projectIndexer = require('../core/project-indexer.cjs');
'@
$content = $content.Replace($importSearch, $importReplace)

# 2. Ajouter TOOL_DEFINITIONS pour RAG (après git_branch)
$defSearch = @'
      name: 'git_branch',
      description: 'Lister ou créer des branches.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          action: { type: 'string', enum: ['list', 'create', 'checkout'], description: 'Action' },
          branch_name: { type: 'string', description: 'Nom de la branche (pour create/checkout)' }
        },
        required: ['repo_path', 'action']
      }
    }
  }
];
'@

$defReplace = @'
      name: 'git_branch',
      description: 'Lister ou créer des branches.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          action: { type: 'string', enum: ['list', 'create', 'checkout'], description: 'Action' },
          branch_name: { type: 'string', description: 'Nom de la branche (pour create/checkout)' }
        },
        required: ['repo_path', 'action']
      }
    }
  },
  // ============ RAG TOOLS - Phase 2.2 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'search_codebase',
      description: 'Rechercher dans le code source d\'un projet (fichiers, fonctions, classes).',
      parameters: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Chemin vers le projet à rechercher' },
          query: { type: 'string', description: 'Termes de recherche (ex: "git commit", "async function")' },
          max_results: { type: 'integer', description: 'Nombre max de résultats', default: 10 }
        },
        required: ['project_path', 'query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_structure',
      description: 'Obtenir la structure arborescente d\'un projet (dossiers et fichiers).',
      parameters: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Chemin vers le projet' },
          max_depth: { type: 'integer', description: 'Profondeur max de l\'arbre', default: 3 }
        },
        required: ['project_path']
      }
    }
  }
];
'@

$content = $content.Replace($defSearch, $defReplace)

Set-Content $file -Value $content -NoNewline
Write-Host "RAG tool definitions added!"
