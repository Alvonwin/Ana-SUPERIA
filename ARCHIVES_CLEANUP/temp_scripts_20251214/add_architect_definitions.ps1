$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Ajouter TOOL_DEFINITIONS pour Architect (apres execute_voice_command)
$defSearch = @'
      name: 'execute_voice_command',
      description: 'Parser et executer une commande vocale de coding (git, fichiers, code, etc.).',
      parameters: {
        type: 'object',
        properties: {
          transcript: { type: 'string', description: 'Transcription vocale a parser et executer' },
          context: { type: 'string', description: 'Contexte optionnel (repertoire courant, projet, etc.)' }
        },
        required: ['transcript']
      }
    }
  }
];
'@

$defReplace = @'
      name: 'execute_voice_command',
      description: 'Parser et executer une commande vocale de coding (git, fichiers, code, etc.).',
      parameters: {
        type: 'object',
        properties: {
          transcript: { type: 'string', description: 'Transcription vocale a parser et executer' },
          context: { type: 'string', description: 'Contexte optionnel (repertoire courant, projet, etc.)' }
        },
        required: ['transcript']
      }
    }
  },
  // ============ ARCHITECT MODE - Phase 3.3 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'ask_architect',
      description: 'Demander a l\'architecte d\'analyser une demande et creer un plan d\'implementation.',
      parameters: {
        type: 'object',
        properties: {
          request: { type: 'string', description: 'Description de la fonctionnalite ou modification a implementer' },
          files: { type: 'array', items: { type: 'string' }, description: 'Liste des fichiers concernes' },
          project_context: { type: 'string', description: 'Contexte du projet (structure, technologies, etc.)' }
        },
        required: ['request']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'review_code',
      description: 'Demander a l\'architecte de reviser du code et suggerer des ameliorations.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code source a reviser' },
          context: { type: 'string', description: 'Contexte du code (fichier, fonction, objectif)' }
        },
        required: ['code']
      }
    }
  }
];
'@

$content = $content.Replace($defSearch, $defReplace)
Set-Content $file -Value $content -NoNewline
Write-Host "Architect TOOL_DEFINITIONS added!"
