# ANA SUPERIA - Architecture du Codebase

## Structure Principale
```
E:/ANA/
├── ana-interface/          # Frontend React
│   ├── src/
│   │   ├── App.jsx         # Layout principal + Router (MODIFIER ICI pour changements globaux)
│   │   ├── App.css         # Styles globaux + thème
│   │   ├── components/     # Composants réutilisables
│   │   │   ├── ChatWidget.jsx
│   │   │   ├── Icons.jsx
│   │   │   └── MobileToolbar.jsx
│   │   └── pages/          # Pages individuelles
│   │       ├── ChatPage.jsx/css
│   │       ├── DashboardPage.jsx/css
│   │       ├── SettingsPage.jsx/css
│   │       └── ... (12 pages)
│   └── package.json
│
├── server/                 # Backend Node.js
│   ├── ana-core.cjs        # Serveur principal (5500+ lignes)
│   ├── agents/
│   │   ├── tool-agent.cjs  # Agent avec 25 outils (TON CODE!)
│   │   └── coding-agent.cjs
│   ├── tools/
│   │   └── web-tools.cjs   # Outils web (météo, recherche)
│   └── memory/
│       └── tiered-memory.cjs
│
└── memory/                 # Données persistantes
    └── current_conversation_ana.txt
```

## Pour Modifier l'UI Globalement

**Fichier clé:** `E:/ANA/ana-interface/src/App.jsx`

Ce fichier contient:
- Le layout principal (sidebar + main content)
- Le Router avec toutes les routes
- Les éléments qui apparaissent sur TOUTES les pages

**Pattern pour ajouter un élément global:**
```jsx
// Dans App.jsx, section main-content
<main className="main-content">
  {/* AJOUTER ICI pour apparaître sur toutes les pages */}
  <div className="global-element">...</div>

  <Routes>
    ...
  </Routes>
</main>
```

## Pour Modifier le Style Global

**Fichier:** `E:/ANA/ana-interface/src/App.css`

Variables CSS disponibles:
- `--bg-primary`, `--bg-secondary`
- `--text-primary`, `--text-secondary`
- `--primary`, `--accent`, `--success`, `--danger`

## Commandes Utiles

```bash
# Lancer le frontend
cd E:/ANA/ana-interface && npm run dev

# Lancer le backend
node E:/ANA/server/ana-core.cjs

# Vérifier syntaxe
node --check E:/ANA/server/ana-core.cjs
```

## TON PROPRE CODE

Tu es Ana. Ton code est dans:
- `E:/ANA/server/agents/tool-agent.cjs` - Tes outils
- `E:/ANA/server/ana-core.cjs` - Ton cerveau principal
- `E:/ANA/server/tools/web-tools.cjs` - Tes outils web

Tu peux lire et modifier ces fichiers pour t'améliorer.
