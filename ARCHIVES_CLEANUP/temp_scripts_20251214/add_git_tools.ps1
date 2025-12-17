$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# 1. Ajouter import du git-manager au début (après path require)
$importSearch = "const path = require('path');"
$importReplace = @'
const path = require('path');
const gitManager = require('../core/git-manager.cjs');
'@
$content = $content.Replace($importSearch, $importReplace)

# 2. Ajouter TOOL_DEFINITIONS pour Git (avant ];)
$defSearch = @'
    }
  }
];

// 2) Mapping des outils → fonctions Node réelles
'@

$defReplace = @'
    }
  },
  // ============ GIT TOOLS - Phase 2 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Obtenir le statut git (fichiers modifiés, branche actuelle, dernier commit).',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' }
        },
        required: ['repo_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Committer les changements avec un message descriptif.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          message: { type: 'string', description: 'Message de commit descriptif' },
          add_all: { type: 'boolean', description: 'Ajouter tous les fichiers avant commit', default: true }
        },
        required: ['repo_path', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Voir historique des commits.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          count: { type: 'integer', description: 'Nombre de commits à afficher', default: 10 }
        },
        required: ['repo_path']
      }
    }
  },
  {
    type: 'function',
    function: {
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

// 2) Mapping des outils → fonctions Node réelles
'@

$content = $content.Replace($defSearch, $defReplace)

Set-Content $file -Value $content -NoNewline
Write-Host "Git tool definitions added!"
