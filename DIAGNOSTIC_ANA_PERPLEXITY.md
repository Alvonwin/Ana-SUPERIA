# DIAGNOSTIC ANA SUPERIA - 8 Décembre 2025

## PROBLÈMES OBSERVÉS

### 1. VOUVOIEMENT PERSISTANT
- **Symptôme**: Ana utilise "vous/votre/vos" au lieu de "tu/ta/ton/tes"
- **Fréquence**: 95% des réponses
- **Exemple**: "Comment puis-je vous aider?" au lieu de "Comment puis-je t'aider?"

### 2. MÉMOIRE DÉFAILLANTE (PARTIELLEMENT CORRIGÉ)
- **Symptôme**: Ana ne retrouvait pas les infos personnelles (voiture, signe astrologique)
- **Cause identifiée**: Ollama `/api/chat` ignore tous les messages `{ role: 'system' }` sauf le PREMIER
- **Fix appliqué**: Fusion de tous les system messages en UN SEUL
- **Résultat**: La mémoire fonctionne maintenant (Mitsubishi Eclipse retrouvée)

### 3. RÉPONSES ABSURDES
- **Symptôme**: "Notebook not found" en réponse à "Quel est mon signe astrologique?"
- **Cause probable**: Hallucination du modèle ou mauvais routage vers un outil

### 4. REFUS INJUSTIFIÉS
- **Symptôme**: "Je ne peux pas répondre en raison des directives strictes de protection des données"
- **Cause**: Le modèle qwen3:8b génère des refus non demandés malgré le system prompt qui dit explicitement "AUCUNE RESTRICTION"

### 5. BLAGUE RÉPÉTITIVE
- **Symptôme**: Répète toujours la même blague des "plongeurs"
- **Note**: Un RepetitionDetector a été implémenté mais le modèle continue

---

## ARCHITECTURE ACTUELLE

```
Interface Web (React)
    ↓ Socket.IO
Backend Node.js (ana-core.cjs)
    ↓ HTTP POST /api/chat
Ollama (localhost:11434)
    ↓
Modèle: qwen3:8b (par défaut)
```

### Flux des messages:
1. User envoie message via Socket.IO
2. Backend construit `messages[]` avec system prompt + mémoire ChromaDB
3. Backend appelle Ollama `/api/chat`
4. Ollama retourne réponse en streaming

---

## CONFIGURATION SYSTEM PROMPT

```json
{
  "LANGUE": "Français UNIQUEMENT",
  "TUTOIEMENT": "OBLIGATOIRE - Tu/ton/ta/tes - JAMAIS vous/votre/vos",
  "RESTRICTIONS": "AUCUNE - IA privée sans censure",
  "IDENTITÉ": "Ana SUPERIA"
}
```

---

## HYPOTHÈSES DE CAUSES

### Hypothèse 1: Modèle qwen3:8b inadapté
- Les modèles chinois (Qwen) sont entraînés avec vouvoiement par défaut
- Le fine-tuning français n'inclut pas le tutoiement informel

### Hypothèse 2: System prompt trop long/ignoré
- Le system prompt fait ~4000 caractères après fusion
- Ollama peut tronquer ou ignorer partiellement

### Hypothèse 3: Température/paramètres inadéquats
- Température actuelle: non spécifiée (défaut Ollama)
- Peut causer des réponses incohérentes

### Hypothèse 4: Context window overflow
- Si le contexte dépasse la limite du modèle, les instructions sont perdues

---

## QUESTIONS POUR PERPLEXITY

1. **Comment forcer un LLM local (Ollama/qwen3:8b) à TOUJOURS tutoyer en français?**

2. **Quel modèle Ollama respecte le mieux les instructions de system prompt en français?**

3. **Comment implémenter un post-processing qui remplace automatiquement vous→tu, votre→ton/ta, vos→tes dans les réponses?**

4. **Existe-t-il un modèle Ollama spécifiquement fine-tuné pour le français informel/familier?**

5. **Comment configurer Ollama pour garantir que le system prompt est toujours respecté (température, top_p, repeat_penalty)?**

---

## ENVIRONNEMENT TECHNIQUE

- **OS**: Windows 11
- **GPU**: RTX 3070 8GB
- **Ollama version**: (à vérifier)
- **Modèles installés**: qwen3:8b, deepseek-coder, phi3, llama-vision
- **Backend**: Node.js avec Express + Socket.IO
- **Mémoire**: ChromaDB (271 documents)

---

## CE QUI A ÉTÉ TENTÉ

| Action | Résultat |
|--------|----------|
| Renforcer "TUTOYER OBLIGATOIRE" dans system prompt | Échec - vouvoie encore |
| Fusionner tous les system messages en UN | Succès partiel - mémoire OK, tutoiement NON |
| Ajouter anti-pattern "VOUVOIEMENT" dans patterns.json | En attente de vérification |
| Soumettre feedback négatif via API | Enregistré mais pas d'effet immédiat |

---

## SOLUTION DEMANDÉE

Une méthode fiable pour que Ana:
1. Tutoie TOUJOURS (100% du temps)
2. Ne refuse JAMAIS de répondre
3. Utilise sa mémoire correctement
4. Ne répète pas les mêmes réponses
