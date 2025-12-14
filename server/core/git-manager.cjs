/**
 * GIT MANAGER - Transactions Git Automatiques avec Rollback
 *
 * Fonctionnalités:
 * 1. git_status - État du repo
 * 2. git_branch - Créer/lister branches
 * 3. git_commit - Commit avec message auto
 * 4. git_rollback - Annuler dernier commit
 * 5. git_transaction - Wrapper sécurisé (branch -> modifs -> commit/rollback)
 *
 * Date: 9 Décembre 2025
 * Phase 2.1 - ANA CODE
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration par défaut
const DEFAULT_CONFIG = {
  defaultBranch: 'main',
  autoCommitPrefix: '[Ana]',
  maxCommitMessageLength: 100
};

/**
 * Exécute une commande git dans un répertoire
 */
function execGit(command, repoPath) {
  try {
    const result = execSync(`git -C "${repoPath}" ${command}`, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.stderr?.trim() || error.message,
      output: error.stdout?.trim() || ''
    };
  }
}

/**
 * Vérifie si un chemin est un repo git
 */
function isGitRepo(repoPath) {
  const result = execGit('rev-parse --is-inside-work-tree', repoPath);
  return result.success && result.output === 'true';
}

/**
 * Obtient le statut du repo
 */
function gitStatus(repoPath) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  const status = execGit('status --porcelain', repoPath);
  const branch = execGit('branch --show-current', repoPath);
  const lastCommit = execGit('log -1 --oneline', repoPath);

  const files = {
    modified: [],
    added: [],
    deleted: [],
    untracked: []
  };

  if (status.success && status.output) {
    status.output.split('\n').forEach(line => {
      const code = line.substring(0, 2);
      const file = line.substring(3);

      if (code.includes('M')) files.modified.push(file);
      else if (code.includes('A')) files.added.push(file);
      else if (code.includes('D')) files.deleted.push(file);
      else if (code === '??') files.untracked.push(file);
    });
  }

  return {
    success: true,
    branch: branch.success ? branch.output : 'unknown',
    lastCommit: lastCommit.success ? lastCommit.output : 'none',
    files,
    hasChanges: status.output ? status.output.length > 0 : false,
    raw: status.output
  };
}

/**
 * Crée une nouvelle branche
 */
function gitCreateBranch(repoPath, branchName) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  // Vérifier si la branche existe déjà
  const checkBranch = execGit(`branch --list ${branchName}`, repoPath);
  if (checkBranch.output && checkBranch.output.trim()) {
    return { success: false, error: `La branche ${branchName} existe déjà` };
  }

  // Créer et switcher vers la nouvelle branche
  const result = execGit(`checkout -b ${branchName}`, repoPath);
  return result;
}

/**
 * Change de branche
 */
function gitCheckout(repoPath, branchName) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  return execGit(`checkout ${branchName}`, repoPath);
}

/**
 * Commit les changements
 */
function gitCommit(repoPath, message, options = {}) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  const status = gitStatus(repoPath);
  if (!status.hasChanges) {
    return { success: false, error: 'Aucun changement à committer' };
  }

  // Add all changes if requested
  if (options.addAll !== false) {
    const addResult = execGit('add -A', repoPath);
    if (!addResult.success) {
      return { success: false, error: `Échec du git add: ${addResult.error}` };
    }
  }

  // Préparer le message
  const prefix = options.prefix || DEFAULT_CONFIG.autoCommitPrefix;
  const fullMessage = `${prefix} ${message}`.substring(0, DEFAULT_CONFIG.maxCommitMessageLength);

  // Commit
  const commitResult = execGit(`commit -m "${fullMessage.replace(/"/g, '\\"')}"`, repoPath);

  if (commitResult.success) {
    const newCommit = execGit('log -1 --oneline', repoPath);
    return {
      success: true,
      message: fullMessage,
      commit: newCommit.success ? newCommit.output : 'unknown'
    };
  }

  return commitResult;
}

/**
 * Rollback du dernier commit
 */
function gitRollback(repoPath, options = {}) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  // Récupérer le commit actuel avant rollback
  const beforeCommit = execGit('log -1 --oneline', repoPath);

  if (options.hard) {
    // Hard reset - perd les changements
    const result = execGit('reset --hard HEAD~1', repoPath);
    return {
      ...result,
      rolledBack: beforeCommit.success ? beforeCommit.output : 'unknown',
      type: 'hard'
    };
  } else {
    // Soft reset - garde les changements en staging
    const result = execGit('reset --soft HEAD~1', repoPath);
    return {
      ...result,
      rolledBack: beforeCommit.success ? beforeCommit.output : 'unknown',
      type: 'soft'
    };
  }
}

/**
 * Transaction Git sécurisée
 * 1. Crée une branche feature
 * 2. Exécute les modifications (callback)
 * 3. Commit si succès, rollback si échec
 */
async function gitTransaction(repoPath, featureName, modifyCallback, options = {}) {
  const branchName = `feature/${featureName.replace(/\s+/g, '-').toLowerCase()}`;
  const originalBranch = execGit('branch --show-current', repoPath);

  console.log(`🔀 [GitManager] Starting transaction: ${branchName}`);

  // 1. Créer la branche feature
  const createResult = gitCreateBranch(repoPath, branchName);
  if (!createResult.success) {
    // Si la branche existe, on switche dessus
    const checkoutResult = gitCheckout(repoPath, branchName);
    if (!checkoutResult.success) {
      return {
        success: false,
        error: `Impossible de créer/accéder à la branche: ${createResult.error}`,
        phase: 'branch_creation'
      };
    }
  }

  try {
    // 2. Exécuter les modifications
    console.log(`📝 [GitManager] Executing modifications...`);
    const modifyResult = await modifyCallback();

    if (!modifyResult || modifyResult.success === false) {
      // Échec des modifications - rollback
      console.log(`❌ [GitManager] Modifications failed, rolling back...`);
      gitCheckout(repoPath, originalBranch.output || DEFAULT_CONFIG.defaultBranch);
      execGit(`branch -D ${branchName}`, repoPath);

      return {
        success: false,
        error: modifyResult?.error || 'Modifications échouées',
        phase: 'modification',
        rolledBack: true
      };
    }

    // 3. Commit les changements
    const commitMessage = options.commitMessage || `${featureName}`;
    const commitResult = gitCommit(repoPath, commitMessage);

    if (!commitResult.success) {
      console.log(`⚠️ [GitManager] Nothing to commit (no changes)`);
    } else {
      console.log(`✅ [GitManager] Committed: ${commitResult.commit}`);
    }

    return {
      success: true,
      branch: branchName,
      commit: commitResult.commit,
      modifyResult
    };

  } catch (error) {
    // Erreur inattendue - rollback complet
    console.error(`❌ [GitManager] Transaction error:`, error.message);
    gitCheckout(repoPath, originalBranch.output || DEFAULT_CONFIG.defaultBranch);
    execGit(`branch -D ${branchName}`, repoPath);

    return {
      success: false,
      error: error.message,
      phase: 'unexpected',
      rolledBack: true
    };
  }
}

/**
 * Liste les branches
 */
function gitListBranches(repoPath) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  const result = execGit('branch -a', repoPath);
  if (result.success) {
    const branches = result.output.split('\n').map(b => b.trim().replace(/^\* /, ''));
    const current = result.output.split('\n').find(b => b.startsWith('*'));
    return {
      success: true,
      branches,
      current: current ? current.replace('* ', '').trim() : null
    };
  }
  return result;
}

/**
 * Historique des commits
 */
function gitLog(repoPath, count = 10) {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: `${repoPath} n'est pas un repo git` };
  }

  const result = execGit(`log -${count} --oneline`, repoPath);
  if (result.success) {
    const commits = result.output.split('\n').map(line => {
      const [hash, ...messageParts] = line.split(' ');
      return { hash, message: messageParts.join(' ') };
    });
    return { success: true, commits };
  }
  return result;
}

module.exports = {
  isGitRepo,
  gitStatus,
  gitCreateBranch,
  gitCheckout,
  gitCommit,
  gitRollback,
  gitTransaction,
  gitListBranches,
  gitLog,
  execGit
};
