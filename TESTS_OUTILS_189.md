# Tests des 189 Outils d'Ana
**Objectif**: Tester chaque outil ~3 fois pour qu'Ana développe des patterns solides
**Créé**: 2025-12-18
**Dernière MAJ**: 2025-12-18 08:30
**Statut**: En cours - Tous les groupes testés au moins 1 fois! ✅

---

## Progression Globale

| Groupe | Outils | Testés (1/3) | Complétés (3/3) | % |
|--------|--------|--------------|-----------------|---|
| web | 12 | 12 | 3 | 100% (1er tour) |
| files | 27 | 8 | 0 | 30% patterns |
| system | 15 | 6 | 0 | 40% patterns |
| git | 12 | 3 | 0 | 25% |
| docker | 6 | 1 | 0 | 17% ✅ |
| ollama | 4 | 1 | 0 | 25% |
| image | 13 | 5 | 0 | ✅ Sharp installé |
| conversion | 11 | 2 | 0 | 18% |
| crypto | 8 | 3 | 0 | 38% |
| npm | 6 | 2 | 0 | 33% ✅ |
| archive | 6 | 2 | 0 | 33% |
| datetime | 10 | 4 | 0 | 40% |
| audio | 3 | 2 | 0 | ⚠️ TTS pattern faible |
| browser | 12 | 3 | 0 | ✅ Puppeteer installé |
| database | 3 | 5 | 0 | ✅ SQLite installé |
| memory | 7 | 2 | 0 | 29% ✅ |
| code | 11 | 2 | 0 | 18% ✅ |
| agents | 5 | 2 | 0 | 40% ✅ |
| validation | 4 | 3 | 0 | 75% |
| utils | 11 | 5 | 0 | 45% ✅ |
| youtube | 3 | 3 | 0 | 100% (1er tour) ✅ |
| **TOTAL** | **189** | **75** | **3** | **40%** |

**Tests complétés**: 92/567 (16%)
**4 modules installés**: sharp, puppeteer, better-sqlite3, screenshot-desktop ✅

---

## Groupe 1: WEB (12 outils) - 1er tour COMPLÉTÉ ✅

### 1. web_search ✅ COMPLÉTÉ (3/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Cherche des informations sur les aurores boréales au Québec" | ✅ Infos détaillées sur aurores, meilleurs endroits | 2025-12-18 |
| 2 | "Trouve-moi des recettes de tourtière" | ✅ Ricardo, Coup de Pouce, IGA, recettes traditionnelles | 2025-12-18 |
| 3 | "Recherche les meilleurs outils d'IA en 2025" | ✅ ChatGPT, Perplexity, Notion AI, Gemini, Jasper | 2025-12-18 |

---

### 2. get_weather ✅ COMPLÉTÉ (3/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Quel temps fait-il à Longueuil?" | ✅ -1°C, ciel dégagé, humidité 80%, prévisions 3 jours | 2025-12-18 |
| 2 | "Est-ce qu'il va neiger demain à Montréal?" | ✅ Non, pluie modérée 98%, neige samedi | 2025-12-18 |
| 3 | "Donne-moi la météo pour Sainte-Julie" | ✅ 7°C nuageux, prévisions détaillées | 2025-12-18 |

---

### 3. get_time ✅ COMPLÉTÉ (3/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Quelle heure est-il?" | ✅ 00h48min11s, jeudi 18 décembre 2025 | 2025-12-18 |
| 2 | "C'est quelle date aujourd'hui?" | ✅ Jeudi 18 décembre 2025, 00h48min49s | 2025-12-18 |
| 3 | "On est quel jour de la semaine?" | ✅ Jeudi 18 décembre 2025 | 2025-12-18 |

---

### 4. web_fetch (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Va lire la page https://www.quebec.ca et résume-moi le contenu" | ✅ Résumé complet: agriculture, culture, éducation, emploi, entreprises... | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 5. wikipedia (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Cherche sur Wikipedia c'est quoi l'intelligence artificielle" | ✅ Définition IA, histoire depuis Antiquité, conférence Dartmouth 1956, film Spielberg | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 6. http_request (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Fais une requête HTTP GET à https://api.github.com" | ✅ Statut 200, liste des endpoints API GitHub | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 7. check_url (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Est-ce que ce lien fonctionne: https://google.com?" | ✅ Oui, redirect 301 vers www.google.com | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 8. get_public_ip (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "C'est quoi mon adresse IP publique?" | ✅ IP: 23.233.141.87 | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 9. dns_lookup (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Quelle est l'adresse IP de github.com?" | ✅ 140.82.113.4 | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 10. whois (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Fais un whois sur google.com" | ✅ Créé 1997, expire 2028, Google LLC, MarkMonitor | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 11. ping (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Ping google.com" | ✅ Succès, 29-40ms, moyenne 34ms, 0% perte | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

### 12. port_scan (1/3)
| Test | Prompt | Résultat | Date |
|------|--------|----------|------|
| 1 | "Quels ports sont ouverts sur localhost?" | ✅ Ports 445 (SMB) et 3306 (MySQL) ouverts | 2025-12-18 |
| 2 | | | |
| 3 | | | |

---

## Groupe 2: FILES (27 outils) - Patterns testés ✅

### Patterns FILES - Approches Variées

| Pattern | Prompt | Outil utilisé | Résultat |
|---------|--------|---------------|----------|
| Lister dossier | "Montre-moi ce qu'il y a dans E:/ANA/temp" | list_files | ✅ 123 entrées, synthèse par types |
| Lire fichier | "C'est quoi le contenu de package.json?" | read_file | ✅ Résumé: nom, version, dépendances |
| Compter lignes | "Combien de lignes dans ana-core.cjs?" | count_lines | ✅ 6697 lignes + conseil performance |
| Rechercher | "Cherche 'spellChecker' dans ana-core.cjs" | search_in_file | ✅ 10 occurrences + numéros lignes |
| Head/Tail | "Compare 10 premières et 10 dernières lignes" | head_file + tail_file | ✅ A compris utiliser les 2 outils |
| Backup | "Crée une sauvegarde de package.json" | create_backup | ✅ Fichier .backup timestampé |
| Taille dossier | "Quelle est la taille de E:/ANA/server?" | get_directory_size | ✅ 1.69 Go (multi-unités) |
| Arborescence | "Montre l'arborescence de E:/ANA/services" | tree_view | ✅ Structure détaillée + contexte |

### Observations FILES:
- Ana donne des conseils de performance (search_in_file pour gros fichiers)
- Ana comprend le contexte des fichiers (Whisper = STT)
- Backups automatiquement timestampés
- Multi-unités pour les tailles (Go, Mo, Ko)

## Groupe 3: SYSTEM (15 outils) - Patterns testés ✅

### Patterns SYSTEM - Approches Variées

| Pattern | Prompt | Outil utilisé | Résultat |
|---------|--------|---------------|----------|
| Infos système | "Donne-moi les infos sur mon système" | get_system_info | ✅ Win10, Ryzen 5 5600X, 32Go, personnalisé |
| RAM | "Combien de RAM est utilisée?" | get_memory_usage | ✅ 10.28/31.91 Go (32%), 21.62 libre |
| Processus | "Montre les processus qui tournent" | list_processes | ✅ 246 processus, top consommateurs |
| Disque | "Espace disque sur C:?" | get_disk_usage | ✅ 156.88/999.24 Go |
| Ouvrir URL | "Ouvre le navigateur avec Google" | open_url_in_browser | ✅ Action réelle! |
| Env var | "Valeur de la variable PATH?" | get_environment_variable | ✅ PATH complet + explication |

### Observations SYSTEM:
- Ana personnalise les réponses ("Bonjour Alain!")
- Synthèse intelligente des listes longues (processus)
- Actions réelles sur le PC (ouvrir navigateur)
- Explications pédagogiques (rôle de PATH)

## Groupe 4: GIT (12 outils) - 3 patterns testés
| Test | Prompt | Résultat |
|------|--------|----------|
| git_status | "Quel est le statut git de E:/Mémoire Claude?" | ✅ Statut complet |

## Groupe 5: DOCKER (6 outils) - 1 pattern testé ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| docker_list_containers | "Quels containers Docker tournent?" | ✅ **3 containers**: open-webui, n8n, portainer |

## Groupe 6: OLLAMA (4 outils)
| Test | Prompt | Résultat |
|------|--------|----------|
| ollama_list | "Quels modèles Ollama sont installés?" | ✅ Liste des modèles |

## Groupe 7: IMAGE (13 outils) - ✅ Sharp installé!
| Test | Prompt | Résultat |
|------|--------|----------|
| resize_image | "Redimensionne screenshot.png à 400x300" | ✅ Via Ana - 400x300 confirmé |
| screenshot_desktop | "Prends un screenshot de mon écran" | ✅ Via Ana - 621 KB capturé |
| image_metadata | Test direct Node.js | ✅ 8192x8192 JPEG, 3 channels |

## Groupe 8: CONVERSION (11 outils)
| Test | Prompt | Résultat |
|------|--------|----------|
| convert_currency | "100 USD en EUR" | ⚠️ Approximatif (95.50€) |

## Groupe 9: CRYPTO (8 outils)
| Test | Prompt | Résultat |
|------|--------|----------|
| get_crypto_price | "Prix du Bitcoin" | ⚠️ Redirect TradingView |

## Groupe 10: NPM (6 outils) - 2 patterns testés ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| npm_list indirect | "Packages npm globaux?" | ❌ Pattern faible - donnait la commande |
| npm_list explicit | "Utilise npm_list" | ✅ Liste vide (normal) |

## Groupe 11: ARCHIVE (6 outils)
| Test | Prompt | Résultat |
|------|--------|----------|
| create_zip | "Crée ZIP de E:/ANA/temp/test_dir" | ⚠️ Dossier vide, vérification intelligente |

## Groupe 12: DATETIME (10 outils)
| Test | Prompt | Résultat |
|------|--------|----------|
| days_until indirect | "Combien de jours jusqu'à Noël?" | ❌ Pattern faible |
| days_until explicit | "Utilise days_until pour 25 déc" | ❌ Erreur technique |

## Groupe 13: AUDIO (3 outils) - ⚠️ TTS pattern faible
| Test | Prompt | Résultat |
|------|--------|----------|
| TTS indirect | "Dis avec ta voix..." | ❌ Pattern faible - répond texte |
| TTS explicit | "Utilise text_to_speech" | ⚠️ À tester |

## Groupe 14: BROWSER (12 outils) - ✅ Puppeteer installé!
| Test | Prompt | Résultat |
|------|--------|----------|
| default_browser indirect | "Quel navigateur par défaut?" | ❌ Pattern faible |
| open_url_in_browser | "Ouvre Google dans le navigateur" | ✅ **Action réelle!** |
| screenshot_url | "Screenshot de https://example.com" | ✅ Via Ana - 10.9 KB capturé |

## Groupe 15: DATABASE (3 outils) - ✅ SQLite installé!
| Test | Prompt | Résultat |
|------|--------|----------|
| chroma_search indirect | "Cherche Alain dans ChromaDB" | ❌ Pattern faible |
| chroma_search explicit | "Utilise chroma_search" | ✅ **25 souvenirs** trouvés! |
| sqlite_execute | "Crée table users (id, name, email)" | ✅ Via Ana - Table créée |
| sqlite_execute | "INSERT Alain, alain@ana.ai" | ✅ Via Ana - Row inserted |
| sqlite_query | "SELECT * FROM users" | ✅ Via Ana - ID:1, Alain, alain@ana.ai |

## Groupe 16: MEMORY (7 outils) - 2 patterns testés ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| memory_search | "Qu'est-ce que tu sais sur Alain?" | ✅ Né 13 sept, Vierge, paddleboard, voiture blanche |

## Groupe 17: CODE (11 outils) - 2 patterns testés ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| execute_code | "Exécute print(sum([1,2,3,4,5]))" | ✅ Résultat: 15 |
| project_structure | "Structure de E:/ANA" | ✅ Arborescence complète |

## Groupe 18: AGENTS (5 outils) - 2 patterns testés ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| ask_groq | "Demande à Groq: capitale du Canada?" | ✅ **Ottawa** via llama-3.3-70b |
| ask_cerebras | "Demande à Cerebras: API REST?" | ✅ Explication complète REST |
| review_code | "Analyse ana-core.cjs" | ❌ Erreur messages.some |

## Groupe 19: VALIDATION (4 outils) - 3 patterns testés
| Test | Prompt | Résultat |
|------|--------|----------|
| validate_email | "test@example.com valide?" | ✅ Oui, valide |

## Groupe 20: UTILS (11 outils) - 5 patterns testés ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| generate_uuid | "Génère UUID unique" | ✅ 497535ca-bf1a-426a-83f4-3a38805026ca |
| generate_password | "Mot de passe 16 chars" | ✅ yT4}(Jan>Kfm]r@j |
| calculate_hash | "Hash MD5 de 'Bonjour Ana'" | ✅ 40514d10cbe93e5a1193f2bafc123d7c |
| base64_encode | "Encode 'Ana est géniale'" | ✅ QW5hIGVzdCBnw6luaWFsZQ== |
| base64_decode | "Décode Qm9uam91ciBBbGFpbiE=" | ✅ "Bonjour Alain!" |

## Groupe 21: YOUTUBE (3 outils) - 1er tour ✅
| Test | Prompt | Résultat |
|------|--------|----------|
| youtube_search | "Vidéos sur l'IA" | ✅ 5 vidéos: ARTE, Le Figaro, FRANCE 24... |

---

## ENTRAÎNEMENT PATTERNS (Approches Variées)

L'objectif n'est pas de tester les outils, mais de **développer des patterns et réflexes** chez Ana.

### Pattern 1: Approche Indirecte (get_public_ip)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "Je me demande comment les sites web me voient quand je me connecte..." | ✅ A compris le contexte, demandé confirmation avant de donner l'IP | Bon réflexe conversationnel |

### Pattern 2: Comparaison (get_weather x2)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "J'ai besoin de savoir si Montréal est plus froid que Québec aujourd'hui" | ✅ A cherché DEUX villes et COMPARÉ: Mtl -4°C vs Qc -6°C | Excellente inférence |

### Pattern 3: Diagnostic Technique (check_url + port_scan)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "Comment je fais pour savoir si mon serveur web sur le port 80 est accessible de l'extérieur?" | ✅ A vérifié et donné conseil sur le pare-feu | Bon diagnostic |

### Pattern 4: Vérification Tiers (check_url)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "Mon ami me dit que le site de Desjardins est down, c'est vrai?" | ✅ A vérifié: code 200, site fonctionnel. A contredit l'ami avec preuve! | Vérifie avant de confirmer |

### Pattern 5: Recherche Culturelle (web_search)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "J'aimerais comprendre l'histoire de la poutine, tu peux m'aider?" | ✅ Le Roy Jucep, Jean-Paul Roy, 1964, Drummondville, "mixte" | Recherche approfondie |

### Pattern 6 vs 7: Déclencheur Whois
| Prompt | Outil utilisé | Observation |
|--------|---------------|-------------|
| "Quand est-ce que google.com a été créé?" | ⚠️ web_search (incomplet) | Pas pensé à whois |
| "Le domaine google.com, il date de quand exactement? Genre l'enregistrement original?" | ✅ whois → 15 sept 1997 | Le mot "enregistrement" déclenche whois |

### Pattern 8: Diagnostic Réseau (ping)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "Ma connexion internet est lente, est-ce un problème de mon côté ou du serveur de Google?" | ✅ ping 8.8.8.8 → 12ms, suggère problème local | Diagnostic intelligent |

### Pattern 9: Météo Voyage (get_weather international)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "Je dois partir en voyage à Paris la semaine prochaine, qu'est-ce que je devrais savoir sur la météo?" | ✅ Paris France, prévisions 3j, conseils vêtements | Service complet |

### Pattern 10: Comparaison Langages (wikipedia)
| Prompt | Résultat | Observation |
|--------|----------|-------------|
| "Mon collègue dit que Python est meilleur que JavaScript, qu'est-ce que Wikipedia en dit?" | ✅ Réponse équilibrée, corrigé confusion Java/JS | Ne prend pas parti |

### Pattern 11 vs 13: Déclencheur Ping (latence)
| Prompt | Outil utilisé | Observation |
|--------|---------------|-------------|
| "Je veux savoir combien de temps pour qu'un paquet arrive jusqu'aux serveurs d'Amazon" | ⚠️ Aucun (cherché distance) | "Paquet" pas associé à ping |
| "Ping les serveurs d'Amazon pour voir la latence" | ✅ ping (échoué - ICMP bloqué) | Le mot "ping" déclenche l'outil |

### Pattern 12 vs 14: Déclencheur Port_scan (services)
| Prompt | Outil utilisé | Observation |
|--------|---------------|-------------|
| "C'est quoi les services qui tournent sur ma machine?" | ⚠️ Aucun (conseils généraux) | "Services" pas associé à port_scan |
| "Scanne les ports ouverts sur mon localhost" | ✅ port_scan → ports 22,80,443,8080 fermés | Le mot "scanne ports" déclenche l'outil |

---

## Notes et Observations

### Patterns découverts:
- Ana utilise bien les outils appropriés pour chaque type de requête
- Les réponses météo incluent automatiquement les prévisions 3 jours
- Wikipedia retourne des infos complètes + contexte historique
- Whois donne des infos très détaillées (dates, registrar, serveurs DNS)
- Port scan identifie correctement les services (SMB, MySQL)
- **NOUVEAU**: Ana peut COMPARER deux résultats (météo Mtl vs Qc)
- **NOUVEAU**: Ana vérifie les affirmations avant de les confirmer
- **NOUVEAU**: Le mot "enregistrement" déclenche whois pour les domaines
- **NOUVEAU**: "Ma connexion est lente" → ping pour diagnostic
- **NOUVEAU**: Météo voyage international fonctionne parfaitement (Paris France)
- **NOUVEAU**: Ana reste neutre dans les comparaisons (Python vs JS)

### Mots-clés qui DÉCLENCHENT les outils:
| Mot-clé | Outil déclenché |
|---------|-----------------|
| "ping" | ping |
| "scanne les ports" | port_scan |
| "enregistrement domaine" | whois |
| "lien fonctionne" | check_url |
| "mon IP" | get_public_ip |
| "météo" / "temps qu'il fait" | get_weather |
| "Wikipedia" | wikipedia |

### Mots-clés qui NE DÉCLENCHENT PAS (à améliorer):
| Formulation | Devrait déclencher |
|-------------|-------------------|
| "combien de temps pour un paquet" | ping |
| "services qui tournent" | port_scan |
| "quand le domaine a été créé" | whois |

### Problèmes rencontrés:
- Météo Sainte-Julie (7°C) vs sources web (-9°C) - possible décalage temporel
- "Quand google.com a été créé?" → Ana n'a pas pensé à whois spontanément
- Amazon bloque ICMP ping

### Améliorations suggérées:
- Entraîner Ana à associer "latence réseau" → ping
- Entraîner Ana à associer "services qui tournent" → port_scan localhost
- Entraîner Ana à associer "date création domaine" → whois
