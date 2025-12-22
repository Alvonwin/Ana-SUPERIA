/**
 * Skill Loader - Chargement dynamique des skills OpenSkills pour Ana
 * Créé: 21 Décembre 2025
 *
 * Détecte automatiquement quel skill est pertinent pour une requête
 * et charge ses instructions dans le contexte d'Ana.
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../../skills');
const CODING_WORKFLOWS_PATH = path.join(__dirname, '../../knowledge/learned/coding-workflows.json');

// Cache des workflows de coding
let codingWorkflowsCache = null;
let workflowsCacheTime = 0;

// Cache des métadonnées de skills
let skillsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Parse le frontmatter YAML d'un fichier SKILL.md
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };

  const yaml = match[1];
  const name = yaml.match(/name:\s*(.+)/)?.[1]?.trim() || '';
  const description = yaml.match(/description:\s*(.+)/)?.[1]?.trim() || '';

  return { name, description };
}

/**
 * Charge les métadonnées de tous les skills disponibles
 */
function loadSkillsMetadata() {
  const now = Date.now();
  if (skillsCache && (now - cacheTime) < CACHE_TTL) {
    return skillsCache;
  }

  const skills = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('[SkillLoader] Dossier skills non trouvé:', SKILLS_DIR);
    return skills;
  }

  const folders = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const folder of folders) {
    const skillPath = path.join(SKILLS_DIR, folder, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      try {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const { name, description } = parseFrontmatter(content);
        skills.push({
          id: folder,
          name: name || folder,
          description: description || '',
          path: skillPath
        });
      } catch (err) {
        console.error(`[SkillLoader] Erreur lecture ${skillPath}:`, err.message);
      }
    }
  }

  skillsCache = skills;
  cacheTime = now;
  console.log(`[SkillLoader] ${skills.length} skills chargés`);
  return skills;
}

/**
 * Mots-clés pour chaque skill (détection rapide)
 */
const SKILL_KEYWORDS = {
  'pdf': ['pdf', 'document pdf', 'extraire pdf', 'créer pdf', 'fusionner pdf', 'formulaire pdf'],
  'docx': ['word', 'docx', 'document word', 'créer document', '.docx'],
  'xlsx': ['excel', 'xlsx', 'spreadsheet', 'tableur', 'feuille de calcul', '.xlsx', 'csv'],
  'pptx': ['powerpoint', 'pptx', 'présentation', 'slides', 'diaporama', '.pptx'],
  'frontend-design': ['frontend', 'ui', 'interface', 'design web', 'css', 'composant react', 'landing page'],
  'algorithmic-art': ['art génératif', 'algorithmic art', 'p5.js', 'generative', 'art algorithmique'],
  'canvas-design': ['poster', 'affiche', 'design visuel', 'canvas', 'artwork'],
  'mcp-builder': ['mcp', 'model context protocol', 'serveur mcp', 'créer mcp'],
  'webapp-testing': ['test', 'playwright', 'tester application', 'test web', 'test ui'],
  'slack-gif-creator': ['gif slack', 'gif animé', 'créer gif'],
  'theme-factory': ['thème', 'theme', 'style', 'couleurs', 'palette'],
  'brand-guidelines': ['marque', 'brand', 'guideline', 'charte graphique'],
  'doc-coauthoring': ['documentation', 'rédiger doc', 'co-écrire', 'spec', 'proposal'],
  'internal-comms': ['communication interne', 'rapport', 'status report', 'newsletter'],
  'skill-creator': ['créer skill', 'nouveau skill', 'skill openskills'],
  'web-artifacts-builder': ['artifact', 'react app', 'shadcn', 'application web complexe']
};

/**
 * Détecte le skill le plus pertinent pour un message
 */
function detectRelevantSkill(message) {
  if (!message) return null;

  const msgLower = message.toLowerCase();
  const skills = loadSkillsMetadata();

  // 1. Recherche par mots-clés (prioritaire)
  for (const [skillId, keywords] of Object.entries(SKILL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (msgLower.includes(keyword.toLowerCase())) {
        const skill = skills.find(s => s.id === skillId);
        if (skill) {
          console.log(`[SkillLoader] Skill détecté par mot-clé "${keyword}": ${skillId}`);
          return skill;
        }
      }
    }
  }

  // 2. Recherche dans les descriptions (fallback)
  for (const skill of skills) {
    const descLower = skill.description.toLowerCase();
    const words = msgLower.split(/\s+/).filter(w => w.length > 4);
    const matches = words.filter(w => descLower.includes(w));
    if (matches.length >= 2) {
      console.log(`[SkillLoader] Skill détecté par description: ${skill.id}`);
      return skill;
    }
  }

  return null;
}

/**
 * Charge le contenu complet d'un skill
 */
function loadSkillContent(skillId) {
  const skillPath = path.join(SKILLS_DIR, skillId, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    console.error(`[SkillLoader] Skill non trouvé: ${skillId}`);
    return null;
  }

  try {
    const content = fs.readFileSync(skillPath, 'utf-8');
    // Retirer le frontmatter pour le contenu
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    console.log(`[SkillLoader] Skill chargé: ${skillId} (${withoutFrontmatter.length} chars)`);
    return withoutFrontmatter;
  } catch (err) {
    console.error(`[SkillLoader] Erreur lecture skill ${skillId}:`, err.message);
    return null;
  }
}

/**
 * Détecte et charge les instructions du skill pertinent pour un message
 * Retourne null si aucun skill pertinent
 */
function getSkillInstructions(message) {
  const skill = detectRelevantSkill(message);
  if (!skill) return null;

  const content = loadSkillContent(skill.id);
  if (!content) return null;

  return {
    skillId: skill.id,
    skillName: skill.name,
    instructions: content
  };
}

/**
 * Liste tous les skills disponibles
 */
function listSkills() {
  return loadSkillsMetadata();
}

// ============================================================
// CODING WORKFLOWS - Injection automatique pour requêtes coding
// Ajouté: 22 Décembre 2025
// ============================================================

/**
 * Charge les workflows de coding depuis coding-workflows.json
 */
function loadCodingWorkflows() {
  const now = Date.now();
  if (codingWorkflowsCache && (now - workflowsCacheTime) < CACHE_TTL) {
    return codingWorkflowsCache;
  }

  try {
    if (!fs.existsSync(CODING_WORKFLOWS_PATH)) {
      console.log('[SkillLoader] Fichier coding-workflows.json non trouvé');
      return null;
    }

    const content = fs.readFileSync(CODING_WORKFLOWS_PATH, 'utf-8');
    codingWorkflowsCache = JSON.parse(content);
    workflowsCacheTime = now;
    console.log('[SkillLoader] Coding workflows chargés:', Object.keys(codingWorkflowsCache.workflows || {}).length, 'workflows');
    return codingWorkflowsCache;
  } catch (err) {
    console.error('[SkillLoader] Erreur chargement coding-workflows.json:', err.message);
    return null;
  }
}

/**
 * Détecte si un message est une requête de coding et quel workflow appliquer
 * @param {string} message - Le message utilisateur
 * @returns {object|null} - { workflowId, workflow } ou null
 */
function detectCodingWorkflow(message) {
  if (!message) return null;

  const workflows = loadCodingWorkflows();
  if (!workflows || !workflows.workflows) return null;

  const msgLower = message.toLowerCase();

  // Vérifier d'abord les triggers généraux de coding
  const triggers = workflows.recognition?.coding_request_triggers || [];
  const fileIndicators = workflows.recognition?.file_indicators || [];

  const hasCodingTrigger = triggers.some(t => msgLower.includes(t.toLowerCase()));
  const hasFileIndicator = fileIndicators.some(f => msgLower.includes(f.toLowerCase()));

  // Si pas de contexte coding, pas de workflow
  if (!hasCodingTrigger && !hasFileIndicator) {
    return null;
  }

  // Trouver le workflow le plus approprié
  for (const [workflowId, workflow] of Object.entries(workflows.workflows)) {
    const workflowTriggers = workflow.triggers || [];
    if (workflowTriggers.some(t => msgLower.includes(t.toLowerCase()))) {
      console.log(`[SkillLoader] 🔧 Coding workflow détecté: ${workflowId}`);
      return { workflowId, workflow, rules: workflows.rules };
    }
  }

  // Fallback: si c'est du coding mais pas de workflow spécifique, utiliser les règles générales
  if (hasCodingTrigger || hasFileIndicator) {
    console.log('[SkillLoader] 🔧 Requête coding détectée (règles générales)');
    return { workflowId: 'general', workflow: null, rules: workflows.rules };
  }

  return null;
}

/**
 * Formate un workflow en instructions claires pour le LLM
 * @param {object} workflowData - { workflowId, workflow, rules }
 * @returns {string} - Instructions formatées
 */
function formatCodingWorkflowInstructions(workflowData) {
  if (!workflowData) return '';

  const { workflowId, workflow, rules } = workflowData;
  let instructions = '';

  // Titre du workflow
  if (workflow) {
    instructions += `=== WORKFLOW DE CODING: ${workflow.name} ===\n\n`;
    instructions += `Tu DOIS suivre ces étapes dans l'ORDRE:\n`;

    // Étapes numérotées
    workflow.steps.forEach((step, index) => {
      instructions += `${index + 1}. ${step.action}: ${step.description}\n`;
    });

    instructions += '\n';
  } else {
    instructions += `=== WORKFLOW DE CODING ===\n\n`;
  }

  // Règles d'or (toujours incluses)
  if (rules?.golden_rules) {
    instructions += `RÈGLES D'OR:\n`;
    rules.golden_rules.forEach(rule => {
      instructions += `- ${rule}\n`;
    });
    instructions += '\n';
  }

  // Anti-patterns (toujours inclus)
  if (rules?.anti_patterns) {
    instructions += `❌ INTERDIT:\n`;
    rules.anti_patterns.forEach(pattern => {
      instructions += `- ${pattern}\n`;
    });
  }

  instructions += `\n=== FIN WORKFLOW ===`;

  return instructions;
}

/**
 * Obtient les instructions de coding workflow pour un message
 * @param {string} message - Le message utilisateur
 * @returns {object|null} - { skillId, skillName, instructions } ou null
 */
function getCodingWorkflowInstructions(message) {
  const workflowData = detectCodingWorkflow(message);
  if (!workflowData) return null;

  const instructions = formatCodingWorkflowInstructions(workflowData);

  return {
    skillId: `coding-workflow-${workflowData.workflowId}`,
    skillName: workflowData.workflow?.name || 'Workflow de Coding',
    instructions: instructions
  };
}

module.exports = {
  loadSkillsMetadata,
  detectRelevantSkill,
  loadSkillContent,
  getSkillInstructions,
  listSkills,
  SKILLS_DIR,
  // Coding workflows
  loadCodingWorkflows,
  detectCodingWorkflow,
  getCodingWorkflowInstructions
};
