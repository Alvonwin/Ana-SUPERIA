$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# Ajouter les implementations Vision apres get_project_structure
$search = @'
  async get_project_structure(args) {
    const { project_path, max_depth } = args;
    console.log(`🔧 [ToolAgent] get_project_structure: ${project_path}`);
    return projectIndexer.getProjectStructure(project_path, { maxDepth: max_depth || 3 });
  }
};
'@

$replace = @'
  async get_project_structure(args) {
    const { project_path, max_depth } = args;
    console.log(`🔧 [ToolAgent] get_project_structure: ${project_path}`);
    return projectIndexer.getProjectStructure(project_path, { maxDepth: max_depth || 3 });
  },

  // ============ VISION TOOLS - Phase 3.2 ANA CODE ============
  async describe_image(args) {
    const { image_path, image_base64, prompt } = args;
    console.log(`👁️ [ToolAgent] describe_image: ${image_path || 'base64 image'}`);
    try {
      const result = await visionHandler.analyzeImage({
        imagePath: image_path,
        imageBase64: image_base64,
        prompt: prompt || 'Décris cette image en détail.'
      });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async debug_screenshot(args) {
    const { image_path, image_base64, context } = args;
    console.log(`🔍 [ToolAgent] debug_screenshot: Analysing error screenshot`);
    try {
      const prompt = `Tu es un expert en debugging. Analyse cette capture d'écran d'erreur.
${context ? `Contexte: ${context}` : ''}

Instructions:
1. Extrais le message d'erreur exact
2. Identifie le type d'erreur (syntaxe, runtime, import, etc.)
3. Identifie le fichier et la ligne concernés si visible
4. Explique la cause probable
5. Propose une solution concrète avec le code corrigé`;

      const result = await visionHandler.analyzeImage({
        imagePath: image_path,
        imageBase64: image_base64,
        prompt: prompt
      });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

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

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "Vision tool implementations added!"
