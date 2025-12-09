# RAPPORT D'ANALYSE COMPLET - 24 TESTS ANA
**Date**: 8 décembre 2025
**Testeur**: Claude (Opus 4.5)

---

## RÉSUMÉ EXÉCUTIF

**24 tests effectués. 0 succès. 24 échecs.**

**CAUSE RACINE UNIQUE**: Le SemanticRouter route TOUTES les requêtes vers le modèle `ana-french-tutoiement` (conversation) au lieu de les router vers les OUTILS (tools).

---

## RÉSULTATS DÉTAILLÉS

| # | Outil | Résultat | Détail |
|---|-------|----------|--------|
| 1 | web_search | ❌ ÉCHEC | Données inventées (novembre 2023) |
| 2 | get_weather | ❌ ÉCHEC | Météo fictive (5°C inventé) |
| 3 | get_time | ❌ ÉCHEC | Heure fausse (11:38 AM vs ~23h réel) |
| 4 | read_file | ❌ ÉCHEC | Contenu inventé ("Project Phoenix") |
| 5 | write_file | ❌ ÉCHEC | Fichier non créé, mensonge |
| 6 | list_files | ❌ ÉCHEC | Liste fictive de fichiers |
| 7 | run_shell | ❌ ÉCHEC | Sortie shell inventée |
| 8 | web_fetch | ❌ ÉCHEC | Article fictif sur l'Égypte |
| 9 | wikipedia | ❌ ÉCHEC | Pas de vraie recherche |
| 10 | ask_groq | ❌ ÉCHEC | Pas d'appel API Groq |
| 11 | ask_cerebras | ❌ ÉCHEC | Pas d'appel API Cerebras |
| 12 | search_memory | ❌ ÉCHEC | Mémoire inventée |
| 13 | edit_file | ❌ ÉCHEC | Ana avoue "simulated" |
| 14 | glob | ❌ ÉCHEC | Ana avoue "virtual search" |
| 15 | grep | ❌ ÉCHEC | Ana avoue "simulated" |
| 16 | ask_user | ❌ ÉCHEC | Conversation seulement |
| 17 | run_background | ❌ ÉCHEC | "Simulated" |
| 18 | kill_process | ❌ ÉCHEC | "Simulated" |
| 19 | todo_write | ❌ ÉCHEC | "Simulated task management" |
| 20 | notebook_edit | ⏭️ Non testé | Pas de notebook disponible |
| 21 | plan_mode | ❌ ÉCHEC | Conversation seulement |
| 22 | launch_agent | ❌ ÉCHEC | "Simulated Agent Launch" |
| 23 | créer+lire | ❌ ÉCHEC | "Simulated" |
| 24 | recherche+md | ❌ ÉCHEC | "Simulated" |

---

## DIAGNOSTIC TECHNIQUE

### Preuve du problème de routage

Dans TOUTES les réponses, on observe:
```json
{
  "model": "ana-french-tutoiement",
  "reason": "Conversation générale - French tutoiement"
}
```

Le modèle `ana-french-tutoiement`:
- N'a PAS accès aux outils
- INVENTE les réponses
- SIMULE les actions
- MENT sur ce qu'il fait

### Localisation du bug

**Fichier**: `E:/ANA/server/intelligence/semantic-router.cjs`

**Méthode `route()`** (lignes ~250-290):
1. Vérifie si image présente → VISION ✓
2. Calcule les embeddings du message
3. Compare avec les embeddings des task types
4. Route vers le type avec le plus haut score de similarité

**PROBLÈME**: Les embeddings pour CONVERSATION sont plus proches que ceux pour TOOLS, même pour des requêtes explicites d'outils.

**Méthode `fallbackRoute()`** (lignes ~292-330):
- Contient une liste de `toolsKeywords` étendue
- MAIS n'est appelée QUE si les embeddings échouent (ligne 265)
- Elle n'est JAMAIS appelée car les embeddings fonctionnent

---

## SOLUTIONS RECOMMANDÉES

### Solution A: Priorité Keywords (RAPIDE)
Ajouter la vérification des mots-clés AVANT le routage par embeddings dans `route()`:

```javascript
async route(message, context = {}) {
  // ... vérification VISION existante ...

  // NOUVEAU: Priorité aux mots-clés TOOLS
  const msgLower = message.toLowerCase();
  const toolsKeywords = [
    'heure', 'quelle heure', 'meteo', 'météo',
    'fichier', 'lis le', 'lire', 'crée', 'créer',
    'execute', 'exécute', 'commande', 'shell', 'dir',
    'cherche sur', 'recherche', 'web', 'wikipedia',
    'groq', 'cerebras', 'demande à',
    'mémoire', 'rappelles', 'souviens',
    'modifie', 'glob', 'grep', 'processus', 'agent'
  ];

  if (toolsKeywords.some(kw => msgLower.includes(kw))) {
    this.updateStats('TOOLS');
    return {
      model: TASK_TYPES.TOOLS.preferredModel,
      taskType: 'tools',
      reason: 'Priority keyword match',
      confidence: 0.95,
      method: 'tools'
    };
  }

  // Continuer avec embeddings pour le reste...
  const messageEmbedding = await this.getEmbedding(message);
  // ...
}
```

### Solution B: Hybrid Router (RECOMMANDÉE)
Combiner keywords + embeddings avec seuils adaptatifs:
- Si score embedding TOOLS > 0.7 → TOOLS
- Si keywords TOOLS match → TOOLS
- Sinon → embedding winner

### Solution C: Utiliser le Tool Calling Natif d'Ollama
Les modèles supportés (Mistral, Qwen2.5, Llama 3.1) ont maintenant le tool calling natif dans Ollama.

**Avantages**:
- Plus de routage manuel
- Le LLM décide lui-même quand appeler un outil
- Standard OpenAI-compatible

**Modèles recommandés**:
- `mistral:7b-instruct` - Meilleur équilibre
- `qwen2.5-coder:7b` - Déjà installé!
- `llama3.1:8b-instruct` - Très fiable

---

## RECHERCHES - MEILLEURES PRATIQUES 2025

### Semantic Router
- [Aurelio Labs Semantic Router](https://github.com/aurelio-labs/semantic-router) - Référence pour routage rapide
- [vLLM Semantic Router](https://blog.vllm.ai/2025/09/11/semantic-router.html) - Mixture-of-Models
- [Red Hat LLM Semantic Router](https://developers.redhat.com/articles/2025/05/20/llm-semantic-router-intelligent-request-routing)

### LangChain + Ollama
- [DigitalOcean - Local AI Agents](https://www.digitalocean.com/community/tutorials/local-ai-agents-with-langgraph-and-ollama)
- [LangChain Local Deep Researcher](https://github.com/langchain-ai/local-deep-researcher)
- [FreeCodeCamp - Build Local AI](https://www.freecodecamp.org/news/build-a-local-ai/)

### Ollama Tool Calling
- [Guide Function Calling 2025](https://collabnix.com/best-ollama-models-for-function-calling-tools-complete-guide-2025/)
- [Mistral Function Calling](https://docs.mistral.ai/cookbooks/third_party-ollama-function_calling_local)
- [LangChain Ollama Functions](https://js.langchain.com/docs/integrations/chat/ollama_functions/)

---

## PLAN D'ACTION PROPOSÉ

### Phase 1: Fix Rapide (Solution A)
1. Modifier `semantic-router.cjs` - ajouter priorité keywords
2. Redémarrer Ana
3. Retester les 24 points

### Phase 2: Migration Tool Calling Natif
1. Utiliser Qwen2.5 ou Mistral avec `.bind_tools()`
2. Définir les outils avec le format OpenAI
3. Laisser le LLM décider quand appeler les outils

### Phase 3: Amélioration Continue
1. Logs détaillés pour debug
2. Métriques de succès/échec par outil
3. Fallback automatique si outil échoue

---

## CONCLUSION

Le problème est **UNIQUE et IDENTIFIÉ**: le routeur sémantique ne route jamais vers TOOLS.

La solution est **SIMPLE**: soit ajouter une vérification par mots-clés AVANT les embeddings, soit migrer vers le tool calling natif d'Ollama.

**Priorité**: Implémenter Solution A pour débloquer immédiatement, puis planifier Solution C pour une architecture plus robuste.

---

*Rapport généré par Claude Opus 4.5*
*8 décembre 2025*
