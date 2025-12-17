$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Corriger la ligne mal formee
$badLine = "      name: 'execute_voice_command', 'ask_architect', 'review_code',"
$goodLine = "      name: 'execute_voice_command',"
$content = $content.Replace($badLine, $goodLine)

# Ajouter les definitions Architect avant ];  // 2) Mapping
$search = @'
    }
  }
];

// 2) Mapping des outils
'@

$replace = @'
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

// 2) Mapping des outils
'@

$content = $content.Replace($search, $replace)

Set-Content $file -Value $content -NoNewline
Write-Host "Architect definitions fixed!"
