$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

$search = @'
      default:
        return { success: false, error: `Action inconnue: ${action}` };
    }
  }
};

// 3) Boucle agent (multi-turn tools)
'@

$replace = @'
      default:
        return { success: false, error: `Action inconnue: ${action}` };
    }
  },

  // ============ RAG TOOL IMPLEMENTATIONS - Phase 2.2 ANA CODE ============
  async search_codebase(args) {
    const { project_path, query, max_results } = args;
    console.log(`🔧 [ToolAgent] search_codebase: "${query}" in ${project_path}`);
    return projectIndexer.searchProject(project_path, query, { maxResults: max_results || 10 });
  },

  async get_project_structure(args) {
    const { project_path, max_depth } = args;
    console.log(`🔧 [ToolAgent] get_project_structure: ${project_path}`);
    return projectIndexer.getProjectStructure(project_path, { maxDepth: max_depth || 3 });
  }
};

// 3) Boucle agent (multi-turn tools)
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "RAG tool implementations added!"
