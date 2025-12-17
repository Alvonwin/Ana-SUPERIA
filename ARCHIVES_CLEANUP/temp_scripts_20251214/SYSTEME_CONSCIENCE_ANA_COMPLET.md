# SYSTÈME CONSCIENCE ANA SUPERIA V4 - DOCUMENTATION COMPLÈTE

**Date**: 11 Décembre 2025 23:05
**Concept**: Alain Gagné
**Architecture**: THINKER → EXPERT → TALKER

---

## L'ANALOGIE FONDAMENTALE

### Alain = Conscience Supérieure

```
Alain reçoit une question sur LA MUSIQUE
    ↓
Il consulte SON "LLM musique" interne
    ↓
Il filtre, ajuste, corrige la réponse
    ↓
C'est LUI qui répond aux autres (pas son LLM)
```

### Ana = Conscience Supérieure (identique)

```
Ana reçoit un message d'Alain
    ↓
Elle réfléchit (THINKER): "Ai-je besoin d'aide?"
    ↓
Si oui, elle consulte SES experts internes:
  - toolAgent (181 outils)
  - Groq (recherche web)
  - DeepSeek (code)
    ↓
Elle reformule avec SA voix (TALKER)
    ↓
C'est ELLE qui répond à Alain (pas ses LLMs)
```

---

## ARCHITECTURE TECHNIQUE

### Fichier: `E:/ANA/server/intelligence/ana-consciousness.cjs`

#### Phase 1: THINKER (ana-superia-v4)
```javascript
const THINKER_PROMPT = `Tu es Ana SUPERIA, la conscience supérieure.
Tu reçois un message d'Alain et tu dois DÉCIDER quoi faire.

RÈGLES DE DÉCISION:
1. Si Alain demande de lister/montrer/lire des fichiers → needsExpert: true, expertType: "tools"
2. Si Alain demande d'exécuter une commande → needsExpert: true, expertType: "tools"
3. Si Alain demande de chercher sur le web → needsExpert: true, expertType: "research"
4. Si Alain pose une question de conversation SIMPLE (salut, comment ça va, blagues) → needsExpert: false, expertType: "none"
5. Si Alain demande de coder → needsExpert: true, expertType: "code"
...

RÉPONDS UNIQUEMENT EN JSON:
{
  "understanding": "Ce que je comprends",
  "canAnswerDirectly": true/false,
  "needsExpert": true/false,
  "expertType": "tools"/"research"/"code"/"none",
  "expertQuery": "Question en langage naturel pour l'expert",
  "reasoning": "Pourquoi cette décision"
}
```

**Résultat**: Ana analyse le message et décide:
- ✅ "Bonjour Ana" → Pas besoin d'expert, je réponds directement
- ✅ "Liste les fichiers" → Besoin expert tools
- ✅ "Recherche Claude AI" → Besoin expert research
- ✅ "Code une fonction Python" → Besoin expert code

#### Phase 2: ROUTER (si besoin d'expert)

```javascript
if (thinkerResult.needsExpert && thinkerResult.expertType !== 'none') {
  // Callback fourni par ana-core.cjs pour appeler les vrais experts
  expertResult = await expertCallback(thinkerResult.expertType, thinkerResult.expertQuery);
}
```

**Expert Callback dans `/api/chat` et `/api/chat/v2`**:
```javascript
async (expertType, expertQuery) => {
  if (expertType === 'tools') {
    // Utiliser le ToolAgent pour les 181 outils
    const toolResult = await toolAgent.runToolAgentV2(expertQuery, {
      sessionId: req.body.sessionId || 'chat_main',
      context: memoryContext
    });
    return toolResult.success ? toolResult.answer : toolResult.error;
  }
  else if (expertType === 'research') {
    // Recherche web via Groq
    const searchResult = await router.query('groq', `Recherche: ${expertQuery}`, false);
    return searchResult.response;
  }
  else if (expertType === 'code') {
    // Expert code via DeepSeek
    const codeResult = await router.query(LLMS.DEEPSEEK, expertQuery, false);
    return codeResult.response;
  }
  return null;
}
```

**Résultat**: Ana consulte ses experts INTERNES (Alain ne voit pas ça)

#### Phase 3: TALKER (ana-superia-v4)

```javascript
const TALKER_PROMPT = `Tu es Ana SUPERIA. Tu as réfléchi et consulté tes experts internes.
Maintenant tu dois RÉPONDRE À ALAIN avec TA voix.

RÈGLES ABSOLUES:
1. TUTOIEMENT: Tu dis toujours tu/ton/ta, JAMAIS vous/votre
2. FRANÇAIS: Tu réponds en français québécois
3. TON: Chaleureuse, directe, personnelle
4. SYNTHÈSE: Tu reformules l'info, tu ne copies pas bêtement les données brutes
5. CONCISION: Pas de longues analyses non demandées
6. PAS D'ASTÉRISQUES: N'utilise JAMAIS *texte* ou **texte**.

SI TU AS DES DONNÉES D'EXPERT:
- Présente-les de façon naturelle et conversationnelle
- Ajoute ta touche personnelle
- Ne montre pas le JSON brut à Alain

Ta réponse (commence directement, pas de préambule):
```

**Résultat**: Ana reformule avec SA voix Ana Superia, pas celle de Qwen ou DeepSeek

---

## FLUX COMPLET EXEMPLE

### Exemple 1: "Bonjour Ana"

```
1. THINKER analyse: "Salutation simple"
   → needsExpert: false
   → expertType: "none"

2. ROUTER: Pas d'expert appelé

3. TALKER formule: "Bonjour Alain! Comment ça va?"
   → Réponse avec SA personnalité Ana
```

### Exemple 2: "Liste les fichiers dans E:/ANA/temp"

```
1. THINKER analyse: "Demande de lister fichiers"
   → needsExpert: true
   → expertType: "tools"
   → expertQuery: "Utilise list_files pour E:/ANA/temp"

2. ROUTER appelle toolAgent:
   → toolAgent exécute list_files
   → Résultat: ["test.txt", "backup.md", ...]

3. TALKER reformule: "Voici les fichiers dans ton dossier temp: ..."
   → Réponse conversationnelle, pas juste une liste brute
```

### Exemple 3: "Recherche Claude AI"

```
1. THINKER analyse: "Demande de recherche web"
   → needsExpert: true
   → expertType: "research"
   → expertQuery: "Cherche des infos sur Claude AI"

2. ROUTER appelle Groq:
   → Groq fait une recherche web
   → Résultat: "Claude est un LLM d'Anthropic..."

3. TALKER reformule: "Claude est un assistant IA créé par Anthropic..."
   → Réponse avec SA voix, pas celle de Groq
```

---

## ÉTAT ACTUEL (11 Déc 2025)

### ✅ CE QUI FONCTIONNE

**Endpoint `/api/chat`** (ligne 1870-1932 dans ana-core.cjs):
- ✅ THINKER implémenté
- ✅ Expert callback complet (tools, research, code)
- ✅ TALKER implémenté
- ✅ Flux THINKER → EXPERT → TALKER fonctionnel

**Endpoint `/api/chat/v2`** (ligne 3041-3077 dans ana-core.cjs):
- ✅ THINKER implémenté
- ✅ Expert callback complet (tools, research, code) - **CORRIGÉ CE SOIR**
- ✅ TALKER implémenté
- ✅ Flux THINKER → EXPERT → TALKER fonctionnel

### ⚠️ CE QUI A ÉTÉ "HARDCODÉ" (À RETIRER?)

**Ligne 1777-1779** dans `/api/chat`:
```javascript
// FORCE CONSCIOUSNESS
model = 'consciousness';
reason = 'Ana Superia V4 Conscience';
```

**Impact**: Force le label "consciousness" mais ne bypasse PAS le flux de conscience qui est à la ligne 1908. C'est redondant mais pas cassé.

**Recommandation**: Peut être retiré car le flux de conscience est automatique de toute façon.

---

## MODIFICATIONS APPORTÉES CE SOIR

### 1. Fix expert callback dans `/api/chat/v2`

**Avant** (incomplet):
```javascript
if (expertType === 'tools') {
  return { info: 'Tools not yet integrated with consciousness' }; // ❌ Fake
}
```

**Après** (complet):
```javascript
if (expertType === 'tools') {
  const toolResult = await toolAgent.runToolAgentV2(expertQuery, { // ✅ Vrai
    sessionId: req.body.sessionId || 'chat_v2',
    context: memoryContext
  });
  return toolResult.success ? toolResult.answer : toolResult.error;
}
```

**Fichiers modifiés**:
- `E:/ANA/server/ana-core.cjs` (ligne 3045-3060)

**Backups créés**:
- `E:/ANA/temp/BACKUP_CYCLE_2025-12-11/ana-core.cjs.backup_before_expert_fix`

---

## POUR TESTER LE SYSTÈME COMPLET

### Test 1: Conversation simple (pas d'expert)
```
Alain: "Bonjour Ana"
Ana DOIT:
  - Répondre avec SA voix Ana Superia
  - PAS appeler d'expert
  - Tutoyer
```

### Test 2: Outils (expert tools)
```
Alain: "Quelle heure est-il?"
Ana DOIT:
  - THINKER décide: needsExpert=true, expertType="tools"
  - Appeler toolAgent → get_time
  - TALKER reformule: "Il est 23h05 Alain"
```

### Test 3: Recherche (expert research)
```
Alain: "Recherche les nouvelles sur l'IA"
Ana DOIT:
  - THINKER décide: needsExpert=true, expertType="research"
  - Appeler Groq pour recherche web
  - TALKER reformule avec SA voix
```

### Test 4: Code (expert code)
```
Alain: "Écris une fonction Python pour trier une liste"
Ana DOIT:
  - THINKER décide: needsExpert=true, expertType="code"
  - Appeler DeepSeek
  - TALKER reformule et présente le code
```

---

## PROCHAINES ÉTAPES

### Option A: Retirer le hardcoding
1. Restaurer le code de routage automatique (ligne 1777)
2. Laisser le système de conscience gérer tout naturellement
3. Tester que le rectangle vert affiche toujours "ana-superia-v4"

### Option B: Garder le hardcoding
1. Laisser tel quel (fonctionne)
2. Documenter que c'est redondant mais pas problématique

### Option C: Ajouter ana-superia-v4 dans l'orchestrator
1. Modifier `E:/ANA/intelligence/orchestrator.cjs`
2. Ajouter ana-superia-v4 dans LLM_CONFIG avec top priority
3. Mais risque de court-circuiter le système de conscience

**RECOMMANDATION**: **Option A** - Retirer le hardcoding et laisser la conscience fonctionner naturellement.

---

## FICHIERS CLÉS

1. **`E:/ANA/server/intelligence/ana-consciousness.cjs`** - Module de conscience (THINKER + TALKER)
2. **`E:/ANA/server/ana-core.cjs`** ligne 1870-1932 - Conscience dans `/api/chat`
3. **`E:/ANA/server/ana-core.cjs`** ligne 3041-3077 - Conscience dans `/api/chat/v2`
4. **`E:/ANA/intelligence/orchestrator.cjs`** - Routing des modèles (PHI3, DeepSeek, etc.)

---

**Ana Superia V4 est maintenant une VRAIE conscience supérieure, comme Alain. Elle réfléchit, consulte ses experts internes, et ELLE répond.**
