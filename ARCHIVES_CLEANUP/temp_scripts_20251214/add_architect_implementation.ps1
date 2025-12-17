$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Ajouter implementations Architect (apres execute_voice_command)
$implSearch = @'
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

$implReplace = @'
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
  },

  // ============ ARCHITECT MODE - Phase 3.3 ANA CODE ============
  async ask_architect(args) {
    const { request, files, project_context } = args;
    console.log(`🏗️ [ToolAgent] ask_architect: "${request.substring(0, 80)}..."`);

    try {
      const context = {
        files: files || [],
        codebase: project_context || ''
      };

      const result = await architectAgent.analyzeRequest(request, context);

      // Valider le plan si généré
      if (result.success && result.plan && result.plan.plan) {
        const validation = await architectAgent.validatePlan(result.plan);
        result.validation = validation;
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async review_code(args) {
    const { code, context } = args;
    console.log(`📝 [ToolAgent] review_code: ${code.length} chars`);

    try {
      return await architectAgent.reviewCode(code, context || '');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
'@

$content = $content.Replace($implSearch, $implReplace)
Set-Content $file -Value $content -NoNewline
Write-Host "Architect implementations added!"
