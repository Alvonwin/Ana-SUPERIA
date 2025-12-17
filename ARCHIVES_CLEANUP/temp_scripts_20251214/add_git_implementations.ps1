$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

$search = @'
      message: `Agent ${agent_type} lancé pour: "${task}"`
    };
  }
};

// 3) Boucle agent (multi-turn tools)
'@

$replace = @'
      message: `Agent ${agent_type} lancé pour: "${task}"`
    };
  },

  // ============ GIT TOOL IMPLEMENTATIONS - Phase 2 ANA CODE ============
  async git_status(args) {
    const { repo_path } = args;
    console.log(`🔧 [ToolAgent] git_status: "${repo_path}"`);
    return gitManager.gitStatus(repo_path);
  },

  async git_commit(args) {
    const { repo_path, message, add_all } = args;
    console.log(`🔧 [ToolAgent] git_commit: "${message}" in ${repo_path}`);
    return gitManager.gitCommit(repo_path, message, { addAll: add_all !== false });
  },

  async git_log(args) {
    const { repo_path, count } = args;
    console.log(`🔧 [ToolAgent] git_log: ${count || 10} commits in ${repo_path}`);
    return gitManager.gitLog(repo_path, count || 10);
  },

  async git_branch(args) {
    const { repo_path, action, branch_name } = args;
    console.log(`🔧 [ToolAgent] git_branch: ${action} ${branch_name || ''} in ${repo_path}`);

    switch (action) {
      case 'list':
        return gitManager.gitListBranches(repo_path);
      case 'create':
        if (!branch_name) return { success: false, error: 'branch_name requis pour create' };
        return gitManager.gitCreateBranch(repo_path, branch_name);
      case 'checkout':
        if (!branch_name) return { success: false, error: 'branch_name requis pour checkout' };
        return gitManager.gitCheckout(repo_path, branch_name);
      default:
        return { success: false, error: `Action inconnue: ${action}` };
    }
  }
};

// 3) Boucle agent (multi-turn tools)
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "Git tool implementations added!"
