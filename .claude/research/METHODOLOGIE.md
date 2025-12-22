# 🔬 Méthodologie de Recherche Structurée

## Principes Fondamentaux

### 1. Hypothèses Concurrentes
Ne jamais se fixer sur une seule hypothèse. Toujours maintenir **au moins 2-3 hypothèses alternatives** jusqu'à avoir des preuves solides.

### 2. Niveaux de Confiance Explicites
Chaque affirmation doit avoir un niveau de confiance (1-5):
- **1/5** - Spéculatif (intuition)
- **2/5** - Faible (indices non validés)
- **3/5** - Modéré (preuves partielles)
- **4/5** - Élevé (preuves convergentes)
- **5/5** - Très élevé (testé, reproductible)

### 3. Auto-Critique Régulière
À chaque étape, se poser:
- Quels biais pourraient affecter mon jugement?
- Ai-je cherché des preuves contre mes hypothèses favorites?
- Y a-t-il des alternatives que je n'ai pas considérées?

### 4. Traçabilité
Documenter chaque découverte, changement d'avis, et source d'information.

---

## Workflow de Recherche

### Étape 1: Définition
```
1. Formuler la question principale clairement
2. Identifier les sous-questions
3. Définir les critères de succès
4. Créer le fichier de notes (copier TEMPLATE_RECHERCHE.md)
```

### Étape 2: Exploration Initiale
```
1. Collecter les données brutes
2. Noter les sources et leur fiabilité
3. Formuler 2-3 hypothèses initiales
4. Assigner des confiances initiales (généralement 2/5)
```

### Étape 3: Investigation
```
Pour chaque hypothèse:
1. Chercher des preuves POUR
2. Chercher activement des preuves CONTRE
3. Identifier des tests discriminants
4. Mettre à jour les niveaux de confiance
```

### Étape 4: Synthèse
```
1. Comparer les hypothèses
2. Identifier l'hypothèse la plus probable
3. Documenter les risques résiduels
4. Formuler la conclusion avec niveau de confiance
```

### Étape 5: Méta-Réflexion
```
1. Qu'est-ce qui a bien fonctionné?
2. Quels biais ai-je identifiés?
3. Comment améliorer pour la prochaine fois?
```

---

## Biais Cognitifs à Surveiller

| Biais | Description | Contre-mesure |
|-------|-------------|---------------|
| **Confirmation** | Chercher uniquement ce qui confirme | Chercher activement des contre-preuves |
| **Ancrage** | Se fixer sur la première info | Considérer plusieurs hypothèses |
| **Disponibilité** | Surestimer ce qui vient à l'esprit | Recherche systématique |
| **Excès de confiance** | Surestimer sa certitude | Calibrer avec historique |
| **Effet de halo** | Généraliser d'un aspect | Évaluer chaque aspect séparément |

---

## Questions d'Auto-Critique

À se poser régulièrement:

1. **Preuves:** "Quelles preuves changeraient mon avis?"
2. **Alternatives:** "Quelle est la meilleure alternative à mon hypothèse favorite?"
3. **Biais:** "Si j'avais tort, comment le saurais-je?"
4. **Sources:** "Mes sources sont-elles fiables et indépendantes?"
5. **Confiance:** "Ma confiance est-elle justifiée par les preuves?"

---

## Fichiers de Travail

| Fichier | Usage |
|---------|-------|
| `TEMPLATE_RECHERCHE.md` | Copier pour chaque nouvelle recherche |
| `ARBRE_HYPOTHESES.md` | Visualiser la structure des hypothèses |
| `recherche_[sujet].md` | Notes actives d'une recherche |

---

## Commandes Utiles

```batch
# Initialiser une nouvelle recherche
scripts\research.bat nouveau "Titre de la recherche"

# Lister les recherches actives
scripts\research.bat liste

# Ouvrir une recherche
scripts\research.bat ouvrir [nom]
```
