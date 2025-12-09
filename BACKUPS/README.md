# ANA BACKUPS

Index des sauvegardes de fichiers avant modifications.

---

## 2025-11-26_chromadb_fix

**Date**: 26 novembre 2025
**Raison**: Correction connexion ChromaDB

**Fichiers sauvegardés**:
| Fichier | Emplacement original |
|---------|---------------------|
| START_ANA.bat | E:\ANA\START_ANA.bat |
| memory-manager.cjs | E:\ANA\server\memory\memory-manager.cjs |

**Modifications apportées**:
1. `memory-manager.cjs`: Changement de `path: this.storagePath` vers `path: 'http://localhost:8000'` pour connecter au serveur HTTP ChromaDB au lieu d'accès fichier direct
2. `START_ANA.bat`: Ajout du lancement automatique de ChromaDB comme etape [1/3] avant le backend

**Pour restaurer**: Copier les fichiers de ce dossier vers leur emplacement original.

---

## Convention de nommage

```
YYYY-MM-DD_description_courte/
```

Chaque dossier contient les fichiers AVANT modification.
