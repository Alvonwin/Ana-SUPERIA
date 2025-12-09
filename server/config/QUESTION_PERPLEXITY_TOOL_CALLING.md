# QUESTION POUR PERPLEXITY - Tool Calling Ana SUPERIA

## CONTEXTE

Ana SUPERIA est une plateforme IA locale utilisant Ollama avec qwen2.5-coder:7b.
Je veux implémenter le tool calling (météo, heure, fichiers, web search) de façon PROPRE.

## CE QUE J'AI DÉCOUVERT

Le template natif de qwen2.5-coder:7b (via `ollama show qwen2.5-coder:7b --modelfile`) montre:

```
{{- if .Tools }}
# Tools
You are provided with function signatures within <tools></tools>:
<tools>
{{- range .Tools }}
{"type": "function", "function": {{ .Function }}}
{{- end }}
</tools>

For each function call, return a json object with function name and arguments within <tool_call></tool_call>
<tool_call>
{"name": <function-name>, "arguments": <args-json-object>}
</tool_call>
```

Le modèle supporte DÉJÀ nativement le tool calling via `{{ .Tools }}`.

## PROBLÈME OBSERVÉ

Quand j'envoie une requête avec `tools` via l'API Ollama:
```javascript
axios.post('http://localhost:11434/api/chat', {
  model: 'qwen2.5-coder:7b',
  messages: [...],
  tools: TOOL_DEFINITIONS,
  stream: false
});
```

Le modèle retourne le tool call dans `msg.content`:
```
{"name": "get_time", "arguments": {"timezone": "America/Montreal"}}
```

Au lieu de le retourner dans `msg.tool_calls` (array structuré).

## MA QUESTION

1. Est-ce normal que qwen2.5-coder retourne dans `content` au lieu de `tool_calls`?
2. Dois-je créer un Modelfile personnalisé `ana-tools` pour corriger ça?
3. Ou dois-je parser les `<tool_call>` tags côté serveur Node.js?
4. Quelle est la meilleure pratique 2025 pour tool calling propre avec Ollama?

## OBJECTIF

Implémenter le tool calling de façon SUPÉRIEURE (pas de hack, pas de regex quick-fix).
Le code doit être digne du nom Ana SUPERIA.

## FICHIERS CONCERNÉS

- `E:\ANA\server\agents\tool-agent.cjs` - Agent actuel (avec fix regex temporaire)
- `E:\ANA\server\ana-core.cjs` - Serveur principal
- Potentiel nouveau: `E:\ANA\models\Modelfile.ana-tools`
