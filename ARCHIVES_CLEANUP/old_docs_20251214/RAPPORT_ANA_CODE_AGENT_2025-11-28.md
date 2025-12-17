# RAPPORT: ANA CODE AGENT
**Date**: 28 Novembre 2025
**Statut**: Planification complète - Prêt pour implémentation

---

## RÉSUMÉ EXÉCUTIF

Exploration complète de l'architecture Ana et recherche des meilleures pratiques pour implémenter un agent de coding autonome ("Ana Code") capable de lire, modifier et créer du code comme Claude Code.

**Conclusion**: Ana possède DÉJÀ tous les outils nécessaires. Il manque uniquement l'agent orchestrateur.

---

## 1. ARCHITECTURE ANA EXISTANTE

### Backend (E:/ANA/server/)

| Module | Fichier | Fonction |
|--------|---------|----------|
| Core | `ana-core.cjs` | Express + Socket.IO (port 3338) |
| LLMs | 4 modèles | PHI3, DeepSeek-Coder, Qwen, Llama Vision |

### Outils Disponibles (100% prêts)

| Outil | Fichier | Capacités |
|-------|---------|-----------|
| FileTools | `tools/file-tools.cjs` | Read, Write, Edit, List, Delete, Stat + backup auto |
| BashTools | `tools/bash-tools.cjs` | Execute, SpawnBackground, GetOutput, Kill + timeout |
| SearchTools | `tools/search-tools.cjs` | Glob (fast-glob), SearchContent (streaming) |
| GitTools | `tools/git-tools.cjs` | Status, Diff, Add, Commit, Log, Reset |
| WebTools | `tools/web-tools.cjs` | DuckDuckGo, Fetch, Wikipedia, NPM, GitHub, Weather |

### Intelligence (100% prêts)

| Module | Fichier | Rôle |
|--------|---------|------|
| SemanticRouter | `intelligence/semantic-router.cjs` | Choisit le LLM optimal |
| ContextSelector | `intelligence/context-selector.cjs` | Sélectionne contexte pertinent |
| SkillLearner | `intelligence/skill-learner.cjs` | Apprentissage compétences |

### Agent Existant (modèle à suivre)

| Agent | Fichier | Pattern |
|-------|---------|---------|
| ResearchAgent | `agents/research-agent.cjs` | 4 phases: Gather → Analyze → Report → Integrate |

### Sécurité (100% prête)

- Path whitelist stricte
- Command whitelist
- Protection injection shell
- Backup automatique

---

## 2. MEILLEURES PRATIQUES 2025

### Pattern Recommandé: ReAct + Plan-and-Execute Hybride

```
┌─────────────────────────────────────────────────────┐
│                   ANA CODE AGENT                     │
├─────────────────────────────────────────────────────┤
│  1. ANALYSER - Comprendre la tâche                  │
│  2. PLANIFIER - Créer plan d'action                 │
│  3. EXÉCUTER - Boucle ReAct (Think→Act→Observe)     │
│  4. VALIDER - Vérifier résultat                     │
│  5. REPORTER - Résumer actions                      │
└─────────────────────────────────────────────────────┘
```

### Sources Consultées

- [Claude Code Best Practices - Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [LangChain Plan-and-Execute](https://blog.langchain.com/planning-agents/)
- [LangGraph Tutorial](https://langchain-ai.github.io/langgraph/tutorials/plan-and-execute/)
- [Aider AI](https://aider.chat/)
- [OpenHands](https://modal.com/blog/open-ai-agents)

### Pratiques Clés Claude Code

| Pratique | Description |
|----------|-------------|
| Context CLAUDE.md | Fichier auto-chargé avec instructions |
| Permission explicite | Demander avant modifications |
| Itération avec feedback | Tester, observer, ajuster |
| Plan avant exécution | Rechercher et planifier d'abord |
| Multi-agent vérification | Un agent code, un autre vérifie |

---

## 3. ALTERNATIVES ÉVALUÉES

| Outil | Type | Forces | Compatibilité Ana |
|-------|------|--------|-------------------|
| Aider | Terminal | Git-aware, multi-LLM | ⭐⭐⭐ Très compatible |
| OpenHands | Web UI | Sandbox Docker | ⭐⭐ Trop lourd |
| SWE-agent | Research | Bug-fix pipeline | ⭐ Trop spécialisé |
| Cline | VS Code | MCP, Plan Mode | ⭐⭐⭐ Bonne inspiration |

**Recommandation**: S'inspirer d'Aider (simplicité) et Cline (Plan Mode)

---

## 4. PLAN D'IMPLÉMENTATION

### Phase 1: Backend - CodingAgent (Priorité 1)

**Fichier**: `E:/ANA/server/agents/coding-agent.cjs`

```javascript
class CodingAgent {
  constructor() {
    this.tools = { FileTools, BashTools, SearchTools, GitTools };
    this.llm = 'deepseek-coder-v2:16b-lite-instruct-q4_K_M';
  }

  // Étape 1: Analyser
  async analyze(task) {
    // Comprendre la tâche
    // Identifier fichiers concernés
  }

  // Étape 2: Planifier
  async plan(analysis) {
    // Créer plan d'action étape par étape
  }

  // Étape 3: Exécuter (boucle ReAct)
  async execute(plan) {
    for (const step of plan.steps) {
      const thought = await this.think(step);
      const action = await this.act(thought);
      const observation = await this.observe(action);
      if (observation.complete) break;
    }
  }

  // Étape 4: Valider
  async validate(result) {
    // Vérifier syntaxe, tests
  }

  // Étape 5: Reporter
  async report(validation) {
    // Résumer ce qui a été fait
  }
}
```

### Phase 2: API Endpoints

```javascript
// Dans ana-core.cjs
app.post('/api/agent/code/task', async (req, res) => {
  const { task, context } = req.body;
  const result = await codingAgent.run(task, context);
  res.json(result);
});

// WebSocket pour streaming
socket.on('agent:code:start', async (data) => {
  // Stream progress en temps réel
});
```

### Phase 3: Frontend - CodingPage Amélioré

- Panneau tâches en cours
- Visualisation plan
- Boutons Approve/Reject
- Terminal intégré
- Historique actions

---

## 5. ESTIMATION EFFORT

| Phase | Complexité | Fichiers à créer/modifier |
|-------|------------|---------------------------|
| Phase 1 | Moyenne | `coding-agent.cjs` (nouveau) |
| Phase 2 | Faible | `ana-core.cjs` (ajouter routes) |
| Phase 3 | Moyenne | `CodingPage.jsx` (améliorer) |

**Total**: ~500-700 lignes de code nouveau

---

## 6. RISQUES & MITIGATIONS

| Risque | Mitigation |
|--------|------------|
| Boucle infinie ReAct | Max iterations (10) + timeout |
| Modifications destructives | Backup auto (déjà présent) |
| Coût LLM élevé | Cache réponses + limites |
| Sécurité | Utiliser Security middleware existant |

---

## 7. PROCHAINES ÉTAPES

1. **Créer** `E:/ANA/server/agents/coding-agent.cjs`
2. **Intégrer** dans `ana-core.cjs`
3. **Améliorer** `CodingPage.jsx`
4. **Tester** sur cas simples
5. **Itérer** selon feedback

---

## CONCLUSION

Ana possède 100% des outils nécessaires. L'implémentation du CodingAgent est principalement un travail d'orchestration des outils existants selon le pattern ReAct + Plan-and-Execute.

**Prêt pour implémentation.**

---

*Rapport généré par Claude Code*
*28 Novembre 2025*
