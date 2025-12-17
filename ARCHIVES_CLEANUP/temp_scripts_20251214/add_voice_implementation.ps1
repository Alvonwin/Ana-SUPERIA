$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Ajouter implementation execute_voice_command (apres analyze_code_screenshot)
$implSearch = @'
  async analyze_code_screenshot(args) {
    const { image_path, image_base64 } = args;
    console.log(`💻 [ToolAgent] analyze_code_screenshot`);
    try {
      const result = await visionHandler.analyzeCodeScreenshot(image_path || { imageBase64: image_base64 });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
'@

$implReplace = @'
  async analyze_code_screenshot(args) {
    const { image_path, image_base64 } = args;
    console.log(`💻 [ToolAgent] analyze_code_screenshot`);
    try {
      const result = await visionHandler.analyzeCodeScreenshot(image_path || { imageBase64: image_base64 });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ============ VOICE CODING - Phase 3.1 ANA CODE ============
  async execute_voice_command(args) {
    const { transcript, context } = args;
    console.log(`🎤 [ToolAgent] execute_voice_command: "${transcript}"`);

    try {
      // Parse la commande vocale
      const parsed = voiceParser.parseVoiceCommand(transcript);

      if (!parsed.matched) {
        // Pas de commande reconnue - retourner info
        return {
          success: true,
          matched: false,
          message: 'Commande vocale non reconnue. Traitement en langage naturel recommandé.',
          originalText: transcript,
          availableCommands: voiceParser.getAvailableCommands().slice(0, 10)
        };
      }

      // Commande reconnue - exécuter le tool correspondant
      console.log(`🎯 [VoiceCommand] Matched: ${parsed.tool} with args:`, parsed.args);

      // Vérifier si le tool existe
      if (!TOOL_IMPLEMENTATIONS[parsed.tool]) {
        return {
          success: false,
          error: `Tool "${parsed.tool}" not found`,
          parsed: parsed
        };
      }

      // Exécuter le tool
      const result = await TOOL_IMPLEMENTATIONS[parsed.tool](parsed.args);

      return {
        success: true,
        matched: true,
        tool: parsed.tool,
        args: parsed.args,
        result: result,
        originalText: transcript
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        originalText: transcript
      };
    }
  }
};
'@

$content = $content.Replace($implSearch, $implReplace)
Set-Content $file -Value $content -NoNewline
Write-Host "Voice command implementation added!"
