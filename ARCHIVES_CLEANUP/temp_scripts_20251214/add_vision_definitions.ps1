$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Ajouter TOOL_DEFINITIONS pour Vision (apres get_project_structure)
$defSearch = @'
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

$defReplace = @'
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
  },
  // ============ VISION TOOLS - Phase 3.2 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'describe_image',
      description: 'Analyser et decrire une image en detail.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers l\'image a analyser' },
          image_base64: { type: 'string', description: 'Image en base64 (alternative a image_path)' },
          prompt: { type: 'string', description: 'Question ou instruction specifique pour l\'analyse' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'debug_screenshot',
      description: 'Analyser une capture d\'ecran d\'erreur et proposer des solutions.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers le screenshot d\'erreur' },
          image_base64: { type: 'string', description: 'Screenshot en base64' },
          context: { type: 'string', description: 'Contexte additionnel (langage, framework, etc.)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_code_screenshot',
      description: 'Extraire et analyser du code depuis une capture d\'ecran.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers le screenshot de code' },
          image_base64: { type: 'string', description: 'Screenshot en base64' }
        },
        required: []
      }
    }
  }
];
'@

$content = $content.Replace($defSearch, $defReplace)
Set-Content $file -Value $content -NoNewline
Write-Host "Vision TOOL_DEFINITIONS added!"
