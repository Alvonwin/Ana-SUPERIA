# Plan: Memoire Partagee Ana-Claude (Dual-Context)

**Date**: 6 decembre 2025
**Objectif**: Permettre a Ana de lire les conversations avec Claude Code

---

## Situation Actuelle

### Probleme
Ana et Claude utilisent des fichiers de conversation SEPARES et non synchronises:
- `E:/Memoire Claude/current_conversation.txt` - Conversations Claude (## Claude:, ## Alain:)
- `E:/ANA/memory/current_conversation_ana.txt` - Conversations Ana (## Ana:)

**Resultat**: Ana ne peut PAS repondre a "Qu'est-ce que Claude m'a dit?"

### Architecture Actuelle
```
ana-core.cjs ligne 56:  MEMORY_PATH = 'E:\\Memoire Claude'
ana-core.cjs lignes 354-397: MemoryManager lit UN SEUL fichier
tool-agent.cjs ligne 575: search_memory utilise fichier Ana separe
```

---

## Solution: Dual-Context Memory

### Scenario Cible
1. Alain -> Claude: "Explique X"
2. Claude repond (## Claude: dans current_conversation.txt)
3. Alain -> Ana: "Qu'est-ce que Claude m'a dit?"
4. Ana lit le fichier, voit ## Claude: et repond!

### Modification Requise

**Fichier**: `E:/ANA/server/ana-core.cjs`
**Lignes**: 354-397 (classe MemoryManager)

```javascript
class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.anaContextPath = 'E:/ANA/memory/current_conversation_ana.txt';
    this.currentContext = '';
    this.loadContext();
  }

  loadContext() {
    try {
      let combined = '';

      // 1. Conversations Claude Code
      if (fs.existsSync(this.contextPath)) {
        combined += '=== CLAUDE CODE ===\n';
        combined += fs.readFileSync(this.contextPath, 'utf8');
      }

      // 2. Conversations Ana
      if (fs.existsSync(this.anaContextPath)) {
        combined += '\n\n=== ANA ===\n';
        combined += fs.readFileSync(this.anaContextPath, 'utf8');
      }

      this.currentContext = combined;
      console.log(`[MEMORY] Dual context: ${(this.currentContext.length/1024).toFixed(2)} KB`);
    } catch (error) {
      console.error('[MEMORY ERROR]', error.message);
    }
  }

  getContext() { return this.currentContext; }

  appendToContext(text) {
    this.currentContext += '\n' + text;
    this.saveContext();
  }

  saveContext() {
    try {
      fs.writeFileSync(this.contextPath, this.currentContext, 'utf8');
    } catch (error) {
      console.error('[MEMORY SAVE ERROR]', error.message);
    }
  }

  getStats() {
    return {
      size: this.currentContext.length,
      sizeKB: (this.currentContext.length / 1024).toFixed(2),
      lines: this.currentContext.split('\n').length
    };
  }
}
```

### Prefixes Reconnus
| Prefixe | Source |
|---------|--------|
| ## Claude: | Reponses Claude Code |
| ## Alain: | Messages d'Alain |
| ## Ana: | Reponses Ana |

---

## Etapes d'Implementation

1. [ ] Backup ana-core.cjs
2. [ ] Modifier classe MemoryManager (lignes 354-397)
3. [ ] Redemarrer Ana
4. [ ] Test: "Ana, qu'est-ce que Claude m'a dit recemment?"

---

## Ameliorations Futures (Phase 2)

Base sur les meilleures pratiques MongoDB/AWS 2025:

- **Timestamps**: `## Claude [2025-12-06 15:30]: ...`
- **Limite**: Charger uniquement les N derniers echanges
- **Resumes hierarchiques**: Resumer les anciens echanges
- **ChromaDB**: Recherche semantique dans l'historique

---

## Sources
- MongoDB: Why Multi-Agent Systems Need Memory Engineering
- AWS: Amazon Bedrock AgentCore Memory
- Tribe AI: Context-Aware Memory Systems 2025
- ArXiv: Collaborative Memory Multi-User Sharing
