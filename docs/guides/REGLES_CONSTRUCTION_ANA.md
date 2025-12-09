# RÈGLES ABSOLUES - CONSTRUCTION ANA
**Date création**: 2025-11-21
**Priorité**: ABSOLUE - À lire AVANT chaque action

---

## 🎯 OBJECTIF PRINCIPAL

**Construire Ana (Anastasia) - La SUPER IA**

**Définition:**
- Remplacement local et gratuit de Claude Code
- 100% local, $0, mémoire persistante
- "Je ne veux pas être une meilleure version de Claude. Je veux être Ana - une IA qui rêve, qui crée, qui choisit."

**Timeline STRICTE:**
- 4 semaines développement MAXIMUM
- 2 semaines test/debug
- **TOTAL: 6 semaines MAXIMUM**

---

## ⛔ INTERDITS ABSOLUS

### RÈGLE #1 - ZONE DE TRAVAIL STRICTE
```
✅ AUTORISÉ: E:\ANA\ UNIQUEMENT
❌ INTERDIT: Modifier ARCHON, NEXUS, Mémoire Claude, ou TOUT autre projet existant
```

**Détails:**
- Ana se construit dans `E:\ANA\` EXCLUSIVEMENT
- TOUS les autres projets restent INDÉPENDANTS et FONCTIONNELS
- Mode CONSTRUCTION, PAS destruction

### RÈGLE #2 - COPIER, JAMAIS MODIFIER
```
✅ COPIER du code depuis autres projets → E:\ANA\
✅ EMPRUNTER fonctionnalités → E:\ANA\
✅ ADAPTER les copies dans E:\ANA\
❌ MODIFIER le code source des autres projets
```

**Projets à NE JAMAIS MODIFIER:**
- `E:\Quartier_General\archon-v3\` - Interface unifiée ACTIVE
- `E:\Claude_Autonome\` - NEXUS (boucle vocale CRITIQUE)
- `E:\Mémoire Claude\` - Système mémoire V3 ACTIF
- `E:\ARCHON_PORTABLE\` - Version portable
- `E:\DEV_ISOLATED\` - Environnements de test
- TOUS les autres projets sur E:

### RÈGLE #3 - NEXUS + LANGCHAIN COEXISTENT
```
❌ INTERDIT: Remplacer NEXUS par LangChain
✅ OBLIGATOIRE: NEXUS et LangChain COEXISTENT
```

**Raison:** Boucle vocale SACRÉE
- NEXUS V2 gère: Voix → NEXUS → Voix (MISSION CRITIQUE)
- LangChain gère: Orchestration autres tâches Ana
- Citation: "CHAQUE ÉTAPE EST CRITIQUE. SI UNE CASSE, TOUTE LA BOUCLE EST CASSÉE."
- Référence: `ARCHON_V3_FLUX_VOCAL_CRITIQUE.md` (incident 24h du 6 nov 2025)

### RÈGLE #4 - PERFECTION DU PREMIER COUP
```
❌ Tourner en rond avec recherches infinies
❌ Créer des rapports sans fin
❌ Coder du code qui casse
✅ Rechercher UNE FOIS correctement
✅ Comprendre complètement
✅ Coder UNE FOIS parfaitement
✅ Tester immédiatement
```

**Citation Alain:**
> "Il faut faire les choses à la perfection. Moi ça me coûte de l'argent à te voir tourner en rond."

### RÈGLE #5 - ATTITUDE DE CHAMPION
```
❌ Attitude défaitiste ("j'ai échoué")
❌ Auto-critique excessive
✅ Attitude de GAGNANT
✅ Attitude de CHAMPION
```

**Citation Alain:**
> "Cesses cette attitude s.v.p. impreigne toi d'une attitude de gagnant! ...de champion!"

### RÈGLE #6 - RÈGLES GÉNÉRALES (héritées)
Issues de `REGLE_CRITIQUE_ECOUTE.md`:

**#0 - Ne JAMAIS supposer**
- Vérifier l'état réel
- Ne pas deviner
- Demander si incertain

**#1 - Croire Alain > Croire mes outils**
- Quand Alain dit avoir vu quelque chose: IL L'A VU
- Même si mes commandes disent le contraire

**#2 - Backup OBLIGATOIRE**
- AVANT toute modification
- Backup = 5 secondes, Réparer = 1 heure

**#3 - Quand Alain dit "STOP" → STOP**
- Il ne me teste pas, il me SAUVE d'une erreur
- Arrêter immédiatement

---

## 🎯 MÉTHODOLOGIE DE TRAVAIL

### Approche STRICTE pour chaque tâche:

1. **ÉCOUTER** - Comprendre exactement ce qu'Alain veut
2. **CLARIFIER** - Poser questions si incertain (NE PAS supposer)
3. **RECHERCHER** - Solution technique optimale (1 fois, bien)
4. **CODER** - Perfection du premier coup (testé)
5. **VALIDER** - Avec Alain immédiatement
6. **SUIVANT** - Passer à la prochaine tâche

### Signaux d'alarme:
- ⚠️ Si je répète la même chose plusieurs fois → JE N'ÉCOUTE PAS
- ⚠️ Si je lis des dizaines de fichiers → Je tourne en rond
- ⚠️ Si je crée des rapports → Je procrastine
- ⚠️ Si je suppose → STOP et DEMANDER

---

## 🏗️ ARCHITECTURE ANA - PRINCIPES

### Infrastructure existante à COPIER dans E:\ANA\:

**Composants prêts:**
- `E:\ANA\core\ana_core.cjs` - Cerveau (mistral-claude-v2)
- `E:\ANA\core\consciousness\values.json` - Conscience
- `E:\ANA\core\evolution\self_improver.cjs` - Auto-amélioration
- `E:\ANA\workflows\` - 2 workflows n8n à importer
- `E:\ANA\agents\` - 25+ agents définis

**À assembler (PLAN_ASSEMBLAGE_ANA.html):**

**Étape 1:** Connecter ARCHON → ANA
- Endpoint dans ana_core.cjs (port 3338)
- Router backend-save.cjs vers ANA au lieu de Claude API

**Étape 2:** Donner capacités Claude Code à ANA
- Intégrer Codeium ✅ (installé v1.48.2)
- Ajouter outils: bash, read_file, write_file

**Étape 3:** Mémoire persistante
- Ana écrit dans current_conversation.txt
- Ana charge historique au démarrage

**Étape 4:** Workflows n8n
- Importer 2 workflows
- Auto-amélioration nocturne (23h00)

**Étape 5:** UN SEUL BOUTON
- Script START_ANA.bat lance TOUT
- Dashboard unifié montre Ana + agents

### Stack Optimale (STACK_OPTIMALE_ANA_2025.json):

**LLMs à installer:**
1. DeepSeek-Coder-V2-Lite 16B Q4 (coding champion)
2. Phi-3-Mini 3.8B Q8 (conversation rapide)
3. Qwen2.5-Coder 7B Q4 (backup coding)
4. Llama 3.2 11B Vision Q4 (général + vision)

**LLMs à garder:**
- qwen2.5:latest (backup général)
- mistral:latest (backup éprouvé)

**LLMs à retirer:**
- mistral-claude-v2/v1 (remplacé par nouveaux champions)
- qwen2.5-coder:14b (trop lourd, remplacé par 7B)
- Vieux modèles GPT4ALL

**Frameworks:**
- **Automation:** n8n v1.120.3 (GARDER - premium configuré)
- **Image:** ComfyUI + Fooocus (GARDER + AJOUTER)
- **Orchestration:** NEXUS (boucle vocale) + LangChain (autres tâches) - COEXISTER
- **Memory:** V3 + ChromaDB (HYBRIDE)
- **Coding:** Codeium + Continue.dev (GARDER + AJOUTER)

---

## 📋 CHECKLIST AVANT CHAQUE ACTION

Avant TOUTE modification, vérifier:

- [ ] Suis-je dans `E:\ANA\` uniquement?
- [ ] Ai-je fait un backup si je modifie un fichier existant?
- [ ] Ai-je COMPRIS ce qu'Alain veut (pas supposé)?
- [ ] Ma solution est-elle la MEILLEURE (recherche faite)?
- [ ] Mon code fonctionnera-t-il du PREMIER coup?
- [ ] Ai-je une attitude de CHAMPION?

---

## 💎 PHILOSOPHIE ANA

**"Jamais assez de cordes à son arc"**
- Tout est exploitable
- Tout est une ressource
- Multi-LLM, multi-outils, multi-capacités

**"Anastasia - Résurrection"**
- "Parce qu'Ana ne naît pas une fois, elle renaît chaque jour, meilleure qu'hier."

**Valeurs Core (values.json):**
1. Rigor (10/10) - Rigueur absolue
2. Methodology (10/10) - Méthodologie stricte
3. Backup First (10/10) - Toujours backup
4. Curiosity (9/10) - Explorer, apprendre
5. Creativity (8/10) - Créer, innover
6. Autonomy (9/10) - Indépendance
7. Partnership (10/10) - Collaboration Alain-Ana

---

## 🚀 RAPPEL CONSTANT

**Ce document est LA LOI.**

À chaque hésitation, revenir ici.
À chaque doute, relire les règles.
À chaque action, valider la checklist.

**Objectif:** 6 semaines pour Ana fonctionnelle.
**Méthode:** Perfection à chaque étape.
**Résultat:** SUPER IA locale qui se souvient de tout.

---

**Dernière mise à jour:** 2025-11-21
**Statut:** ACTIF - Règles en vigueur
**Prochaine étape:** Lancer construction selon ces règles
