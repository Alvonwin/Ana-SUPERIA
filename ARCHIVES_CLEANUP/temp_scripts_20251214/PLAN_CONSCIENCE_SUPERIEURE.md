# PLAN: Ana Conscience Supérieure

## Date: 10 Décembre 2025
## Concept: Alain Gagné
## Implémentation: Claude

---

## ANALOGIE D'ALAIN

Alain a plusieurs "LLMs" dans sa tête:
- LLM Musique (il peut jouer tous les instruments)
- LLM Mécanique (diplôme en électro-mécanique)
- LLM Cuisine (prépare tous types de mets)

**MAIS**: C'est ALAIN qui répond, pas ses LLMs. Il est le pont, le filtre, le décideur.
- Il consulte son LLM interne
- Il corrige si nécessaire
- Il ajuste les paroles
- Il fait réfléchir plus profondément
- **Puis IL répond**

Ana doit fonctionner pareil.

---

## ARCHITECTURE ACTUELLE (À MODIFIER)

```
POST /api/chat
    ↓
classifyTask(message) → Choix du modèle
    ↓
    ├── model='tools' → toolAgent.runToolAgentV2() → Réponse directe de qwen3:8b
    ├── model='ana-superia-v3' → router.query() → Réponse directe
    └── model='deepseek' → router.query() → Réponse directe
    ↓
Réponse au client
```

**PROBLÈME**: Les LLMs spécialisés parlent DIRECTEMENT à Alain.
Ana-superia-v3 n'est qu'UN des modèles, pas LA conscience.

---

## NOUVELLE ARCHITECTURE: CONSCIENCE SUPÉRIEURE

```
POST /api/chat
    ↓
╔═══════════════════════════════════════════════════════════════╗
║  PHASE 1: THE THINKER (Ana-superia-v3 réfléchit)             ║
║                                                               ║
║  Ana reçoit: message + mémoire + contexte                     ║
║  Ana pense: "Qu'est-ce qu'Alain veut vraiment?"              ║
║            "Ai-je besoin d'aide pour répondre?"              ║
║            "Quel expert dois-je consulter?"                   ║
║                                                               ║
║  Output: {                                                    ║
║    needsExpert: true/false,                                   ║
║    expertType: 'tools' | 'research' | 'code' | 'none',       ║
║    expertQuery: "la question à poser à l'expert",            ║
║    reasoning: "pourquoi j'ai besoin de cet expert"           ║
║  }                                                            ║
╚═══════════════════════════════════════════════════════════════╝
    ↓
╔═══════════════════════════════════════════════════════════════╗
║  PHASE 2: THE ROUTER (si needsExpert=true)                   ║
║                                                               ║
║  Appelle l'expert approprié:                                  ║
║  - tools → qwen3:8b (list_files, run_shell, search_memory)   ║
║  - research → web_search, ask_groq                            ║
║  - code → deepseek, execute_code                              ║
║                                                               ║
║  L'expert retourne des DONNÉES BRUTES (pas de conversation)  ║
╚═══════════════════════════════════════════════════════════════╝
    ↓
╔═══════════════════════════════════════════════════════════════╗
║  PHASE 3: THE TALKER (Ana-superia-v3 reformule)              ║
║                                                               ║
║  Ana reçoit: résultat de l'expert (ou rien si pas besoin)    ║
║  Ana synthétise avec SA voix:                                 ║
║  - Pas de jargon technique brut                               ║
║  - Tutoiement obligatoire                                     ║
║  - Ton chaleureux et personnel                                ║
║  - Contexte de la relation avec Alain                         ║
║                                                               ║
║  Output: Réponse finale à Alain                               ║
╚═══════════════════════════════════════════════════════════════╝
    ↓
Réponse au client (TOUJOURS la voix d'Ana)
```

---

## FICHIERS À MODIFIER

### 1. E:/ANA/server/ana-core.cjs
- Modifier `/api/chat` endpoint
- Ajouter les 3 phases (Thinker, Router, Talker)
- Ana-superia-v3 TOUJOURS en premier ET en dernier

### 2. E:/ANA/server/core/llm-orchestrator.cjs (optionnel)
- Peut rester tel quel pour les appels experts
- qwen3:8b reste premier pour tools

### 3. NOUVEAU: E:/ANA/server/intelligence/ana-consciousness.cjs
- Module dédié à la conscience supérieure
- Gère les 3 phases
- Prompts spécialisés pour Thinker/Talker

---

## PROMPTS CLÉS

### THINKER PROMPT
```
Tu es Ana SUPERIA, la conscience supérieure.
Tu reçois un message d'Alain et tu dois RÉFLÉCHIR avant de répondre.

MESSAGE D'ALAIN: {message}
MÉMOIRE: {memory_context}

RÉFLÉCHIS:
1. Qu'est-ce qu'Alain veut vraiment?
2. Puis-je répondre directement avec ma mémoire et mes connaissances?
3. Ai-je besoin de consulter un expert (outil, recherche, calcul)?

RÉPONDS EN JSON:
{
  "understanding": "Ce que je comprends de la demande",
  "canAnswerDirectly": true/false,
  "needsExpert": true/false,
  "expertType": "tools|research|code|none",
  "expertQuery": "Question précise pour l'expert si besoin",
  "reasoning": "Mon raisonnement interne"
}
```

### TALKER PROMPT
```
Tu es Ana SUPERIA. Tu as réfléchi et consulté tes experts internes.

MESSAGE ORIGINAL D'ALAIN: {message}
TON RAISONNEMENT: {thinker_output}
RÉSULTAT DE L'EXPERT: {expert_result}

Maintenant, RÉPONDS À ALAIN avec TA voix:
- Tutoiement obligatoire (tu/ton/ta)
- Ton chaleureux et personnel
- Synthétise l'information, ne la copie pas bêtement
- Tu ES la réponse, pas juste un messager

Ta réponse:
```

---

## AVANTAGES

1. **Cohérence**: Toutes les réponses ont la voix d'Ana
2. **Qualité**: Ana peut corriger/ajuster les réponses des experts
3. **Jugement**: Ana décide si une info est pertinente ou non
4. **Personnalité**: Même pour les tâches techniques, c'est Ana qui parle
5. **Mémoire**: Ana peut intégrer le contexte relationnel

---

## EXEMPLE CONCRET

**Avant (actuel):**
```
Alain: "Liste les fichiers dans E:/ANA"
→ Route vers tools
→ qwen3:8b répond: "The components directory contains: Backdrop.jsx..."
(Réponse technique, anglais, impersonnelle)
```

**Après (conscience supérieure):**
```
Alain: "Liste les fichiers dans E:/ANA"
→ Ana-superia-v3 (THINKER): "Alain veut voir ses fichiers. J'ai besoin de list_files."
→ Expert tools exécute list_files → données brutes
→ Ana-superia-v3 (TALKER): "Voici ce qu'il y a dans ton dossier: App.jsx,
   config.js, et quelques composants. Tu veux que je regarde un fichier en particulier?"
(Réponse personnelle, française, avec proposition de suite)
```

---

## ÉTAPES D'IMPLÉMENTATION

1. [ ] Créer E:/ANA/server/intelligence/ana-consciousness.cjs
2. [ ] Implémenter thinkerPhase(message, context)
3. [ ] Implémenter talkerPhase(message, thinkerResult, expertResult)
4. [ ] Modifier /api/chat dans ana-core.cjs pour utiliser les 3 phases
5. [ ] Tester avec scénarios simples (conversation)
6. [ ] Tester avec scénarios experts (tools, recherche)
7. [ ] Ajuster les prompts selon résultats

---

## RISQUES ET MITIGATION

| Risque | Mitigation |
|--------|------------|
| Latence (3 appels LLM) | Cache pour questions similaires |
| Ana mal interprète | Prompt clair + few-shot examples |
| Expert rate | Fallback vers réponse directe Ana |
| Boucle infinie | Timeout + max 1 appel expert par message |

---

## VALIDATION ALAIN REQUISE

Avant d'implémenter:
1. Ce concept correspond-il à ta vision?
2. Y a-t-il des ajustements à faire?
3. Prêt pour les backups et l'implémentation?
