$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Ajouter TOOL_DEFINITION pour execute_voice_command (apres analyze_code_screenshot)
$defSearch = @'
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

$defReplace = @'
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
  },
  // ============ VOICE CODING - Phase 3.1 ANA CODE ============
  {
    type: 'function',
    function: {
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

$content = $content.Replace($defSearch, $defReplace)
Set-Content $file -Value $content -NoNewline
Write-Host "Voice command TOOL_DEFINITION added!"
