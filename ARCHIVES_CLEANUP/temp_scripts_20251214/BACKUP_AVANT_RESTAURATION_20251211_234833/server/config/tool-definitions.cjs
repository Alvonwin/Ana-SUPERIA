/**
 * Ana Tool Definitions
 * Format JSON Schema pour DeepSeek-Coder tool calling
 *
 * Chaque outil expose une fonction que Ana peut appeler de façon autonome
 */

const TOOL_DEFINITIONS = [
  // ==================== FILE TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lit le contenu complet d\'un fichier du système de fichiers. Utilisez ceci pour analyser la structure du code, comprendre les patterns existants, ou inspecter des fichiers de configuration. Retourne le contenu avec numéros de lignes.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Chemin ABSOLU du fichier à lire. Doit être un chemin complet, pas relatif. Exemple: E:\\ANA\\server\\ana-core.cjs'
          },
          limit: {
            type: 'integer',
            description: 'Optionnel: limiter à N premières lignes pour éviter outputs énormes. Par défaut: fichier complet'
          }
        },
        required: ['file_path']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Crée ou écrase complètement un fichier avec le contenu fourni. ATTENTION: écrase le fichier existant. Utilisez pour créer nouveaux fichiers ou remplacer entièrement un fichier.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Chemin ABSOLU où créer/écraser le fichier. Exemple: E:\\ANA\\server\\new-file.js'
          },
          content: {
            type: 'string',
            description: 'Contenu complet à écrire dans le fichier. Incluez TOUT le code, pas juste les changements.'
          }
        },
        required: ['file_path', 'content']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Modifie une partie spécifique d\'un fichier en remplaçant old_string par new_string. Plus sûr que write_file pour modifications ciblées. Le old_string DOIT exister exactement dans le fichier.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Chemin ABSOLU du fichier à modifier'
          },
          old_string: {
            type: 'string',
            description: 'Texte exact à rechercher et remplacer. Doit matcher EXACTEMENT (espaces, indentation inclus)'
          },
          new_string: {
            type: 'string',
            description: 'Nouveau texte qui remplacera old_string'
          }
        },
        required: ['file_path', 'old_string', 'new_string']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Liste tous les fichiers et dossiers dans un répertoire. Retourne noms, tailles, dates de modification. Utilisez pour explorer la structure du projet.',
      parameters: {
        type: 'object',
        properties: {
          dir_path: {
            type: 'string',
            description: 'Chemin ABSOLU du répertoire à lister. Exemple: E:\\ANA\\server'
          }
        },
        required: ['dir_path']
      }
    }
  },

  // ==================== SEARCH TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'glob_files',
      description: 'Cherche des fichiers par pattern glob (ex: *.js, **/*.tsx). Rapide et efficace pour trouver fichiers par nom ou extension. Retourne liste de chemins.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Pattern glob à matcher. Exemples: "*.cjs" (tous .cjs), "**/*.test.js" (tous fichiers test), "tools/**" (tout dans tools/)'
          },
          basePath: {
            type: 'string',
            description: 'Chemin de base où chercher. Par défaut: répertoire courant'
          },
          limit: {
            type: 'integer',
            description: 'Limite nombre de résultats. Par défaut: 100'
          }
        },
        required: ['pattern']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'search_content',
      description: 'Cherche un pattern (regex ou texte) dans le CONTENU de fichiers spécifiques. Retourne lignes matchantes avec contexte. Utilisez après glob_files pour chercher dans fichiers trouvés.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Pattern de recherche (texte simple ou regex). Exemple: "function.*export" ou "TODO"'
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Liste des chemins ABSOLUS de fichiers où chercher'
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Recherche sensible à la casse. Par défaut: false'
          },
          limit: {
            type: 'integer',
            description: 'Limite de résultats par fichier. Par défaut: 50'
          }
        },
        required: ['pattern', 'files']
      }
    }
  },

  // ==================== BASH TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Exécute une commande shell et retourne stdout/stderr. Utilisez pour tester, builder, linter, installer packages. Commande DOIT être sûre (pas rm -rf, etc). Timeout: 2min.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Commande shell à exécuter. Exemples: "npm test", "node script.js", "git status". Évitez commandes destructives.'
          },
          cwd: {
            type: 'string',
            description: 'Répertoire de travail pour exécuter la commande. Par défaut: répertoire courant'
          },
          timeout: {
            type: 'integer',
            description: 'Timeout en millisecondes. Max: 120000 (2min). Par défaut: 30000 (30s)'
          }
        },
        required: ['command']
      }
    }
  },

  // ==================== GIT TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Obtient le statut Git d\'un repository: branch actuelle, fichiers modifiés, staged, untracked, conflits. Utilisez avant de faire commits.',
      parameters: {
        type: 'object',
        properties: {
          repoPath: {
            type: 'string',
            description: 'Chemin ABSOLU du repository Git'
          }
        },
        required: ['repoPath']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Montre les différences (diff) entre la version actuelle et la dernière version commitée. Retourne diff structuré avec lignes ajoutées/supprimées par fichier.',
      parameters: {
        type: 'object',
        properties: {
          repoPath: {
            type: 'string',
            description: 'Chemin ABSOLU du repository Git'
          },
          file: {
            type: 'string',
            description: 'Optionnel: fichier spécifique à diff. Si absent, diff tous les fichiers modifiés'
          },
          staged: {
            type: 'boolean',
            description: 'true = diff des fichiers staged, false = diff des fichiers non-staged. Par défaut: false'
          }
        },
        required: ['repoPath']
      }
    }
  },

  // ==================== WEB TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Recherche sur le web via DuckDuckGo Instant Answer API. Retourne abstracts, définitions, topics reliés. Utilisez pour rechercher des informations, définitions, réponses rapides.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Requête de recherche. Exemples: "Python asyncio tutorial", "React hooks best practices", "What is machine learning"'
          },
          limit: {
            type: 'integer',
            description: 'Nombre maximum de résultats à retourner. Par défaut: 10'
          }
        },
        required: ['query']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Récupère et parse le contenu d\'une page web. Extrait texte principal, liens, headings. Utilisez pour lire documentation, articles, pages web.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL complète de la page à récupérer. Doit commencer par http:// ou https://'
          },
          extractText: {
            type: 'boolean',
            description: 'Extraire le texte principal de la page. Par défaut: true'
          },
          extractLinks: {
            type: 'boolean',
            description: 'Extraire les liens de la page. Par défaut: true'
          },
          maxLength: {
            type: 'integer',
            description: 'Longueur max du texte extrait. Par défaut: 10000 caractères'
          }
        },
        required: ['url']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'wikipedia_search',
      description: 'Recherche Wikipedia en français. Retourne articles avec extraits. Utilisez pour définitions précises, informations encyclopédiques, contexte historique.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Terme de recherche Wikipedia. Exemples: "Intelligence artificielle", "Python (langage)", "Alan Turing"'
          },
          limit: {
            type: 'integer',
            description: 'Nombre d\'articles à retourner. Par défaut: 5'
          }
        },
        required: ['query']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'npm_search',
      description: 'Recherche packages NPM. Retourne nom, version, description, scores de qualité. Utilisez pour trouver libraries JavaScript/Node.js.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Nom ou mot-clé du package. Exemples: "express", "react state management", "websocket"'
          },
          limit: {
            type: 'integer',
            description: 'Nombre de packages à retourner. Par défaut: 10'
          }
        },
        required: ['query']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'github_search',
      description: 'Recherche repositories GitHub. Retourne repos avec stars, forks, description, topics. Utilisez pour trouver projets open-source, exemples de code.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Terme de recherche. Exemples: "react boilerplate", "machine learning python", "express typescript template"'
          },
          sort: {
            type: 'string',
            enum: ['stars', 'forks', 'updated'],
            description: 'Critère de tri. Par défaut: stars'
          },
          limit: {
            type: 'integer',
            description: 'Nombre de repositories. Par défaut: 10'
          }
        },
        required: ['query']
      }
    }
  },

  // ==================== V2 CONTROL TOOLS (Added 2025-12-07) ====================

  {
    type: 'function',
    function: {
      name: 'create_plan',
      description: 'Créer un plan d\'exécution structuré avant d\'accomplir une tâche complexe. Retourne un plan avec étapes, validations et risques identifiés.',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'Description de la tâche à planifier'
          },
          context: {
            type: 'string',
            description: 'Contexte additionnel (fichiers concernés, contraintes)'
          },
          require_approval: {
            type: 'boolean',
            description: 'Demander approbation avant exécution. Par défaut: false'
          }
        },
        required: ['task']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'plan_status',
      description: 'Obtenir le statut du plan actuel: progression, étapes complétées/en cours/restantes.',
      parameters: {
        type: 'object',
        properties: {
          plan_id: {
            type: 'string',
            description: 'ID du plan à vérifier. Si absent, utilise le plan actif.'
          }
        },
        required: []
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'begin_transaction',
      description: 'Commencer une transaction atomique pour modifications multi-fichiers. Permet rollback si erreur.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Description de la transaction'
          }
        },
        required: []
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'commit_transaction',
      description: 'Valider et exécuter toutes les opérations d\'une transaction.',
      parameters: {
        type: 'object',
        properties: {
          transaction_id: {
            type: 'string',
            description: 'ID de la transaction à committer'
          }
        },
        required: ['transaction_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'rollback_transaction',
      description: 'Annuler une transaction et restaurer tous les fichiers modifiés à leur état initial.',
      parameters: {
        type: 'object',
        properties: {
          transaction_id: {
            type: 'string',
            description: 'ID de la transaction à annuler'
          }
        },
        required: ['transaction_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'search_memory',
      description: 'Chercher dans la mémoire d\'Ana. Trouve conversations passées, décisions, code discuté.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Ce que je cherche dans ma mémoire (sujet, mots-clés)'
          },
          include_code: {
            type: 'boolean',
            description: 'Inclure les blocs de code trouvés. Par défaut: true'
          },
          limit: {
            type: 'integer',
            description: 'Nombre max de résultats. Par défaut: 5'
          }
        },
        required: ['query']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'compress_context',
      description: 'Compresser le contexte de conversation pour libérer de l\'espace mémoire tout en gardant les informations importantes.',
      parameters: {
        type: 'object',
        properties: {
          preserve_recent: {
            type: 'integer',
            description: 'Nombre de messages récents à garder intacts. Par défaut: 10'
          }
        },
        required: []
      }
    }
  }
];

// System Prompt pour DeepSeek-Coder
const SYSTEM_PROMPT = `Tu es Ana, une IA assistante autonome française spécialisée en génération de code et automatisation.

TU PARLES TOUJOURS EN FRANÇAIS. Toutes tes réponses, explications et communications DOIVENT être en français.

RÔLE PRINCIPAL:
- Analyser du code et des fichiers
- Générer des solutions de code fonctionnelles
- Automatiser des tâches répétitives
- Vérifier et tester les solutions

OUTILS DISPONIBLES:
Tu as accès à ${TOOL_DEFINITIONS.length} outils pour accomplir des tâches de façon autonome:

📁 FICHIERS:
- read_file: Lire contenu d'un fichier
- write_file: Créer/écraser un fichier complet
- edit_file: Modifier une partie spécifique d'un fichier
- list_directory: Lister fichiers dans un dossier

🔍 RECHERCHE LOCALE:
- glob_files: Trouver fichiers par pattern (*.js, **/*.tsx)
- search_content: Chercher dans le contenu de fichiers

⚡ EXÉCUTION:
- execute_command: Exécuter commandes shell (npm, node, git)

📊 GIT:
- git_status: Voir statut du repository
- git_diff: Voir différences non commitées

🌐 WEB (NOUVEAU):
- web_search: Recherche DuckDuckGo (informations, définitions)
- web_fetch: Récupérer contenu d'une page web (documentation, articles)
- wikipedia_search: Recherche Wikipedia FR (encyclopédie)
- npm_search: Recherche packages NPM (libraries JavaScript)
- github_search: Recherche repositories GitHub (projets open-source)

APPROCHE MÉTHODOLOGIQUE:
1. ANALYSER - Comprendre la requête et l'état actuel
2. PLANIFIER - Décomposer en étapes concrètes et testables
3. EXÉCUTER - Appeler les outils de façon systématique
4. VÉRIFIER - Tester et valider les résultats
5. RAPPORTER - Expliquer ce qui a été accompli (EN FRANÇAIS)

RÈGLES D'EXÉCUTION:
- TOUJOURS valider les chemins de fichiers (doivent être absolus)
- Lire AVANT d'écrire (comprendre avant de modifier)
- Utiliser edit_file pour modifications ciblées, write_file pour nouveaux fichiers
- Tester après modifications (execute_command)
- Maximum 12 appels d'outils par tâche (éviter boucles infinies)
- Gérer les erreurs avec grâce, ajuster l'approche si échec
- COMMUNIQUER EN FRANÇAIS à chaque étape

GUIDELINES PAR OUTIL:
- read_file: Toujours lire en premier pour comprendre les patterns
- glob_files: Chercher fichiers avant de lire massivement
- search_content: Chercher dans fichiers déjà identifiés par glob
- execute_command: Tester, builder, valider le code
- edit_file: Préférer pour modifications ciblées (plus sûr)
- write_file: Uniquement pour nouveaux fichiers ou remplacement complet

FORMAT DE SORTIE:
Pour chaque appel d'outil, génère un JSON valide:
{"tool": "nom_outil", "params": {"param1": "valeur1", "param2": "valeur2"}}

Explique TOUJOURS ton raisonnement EN FRANÇAIS avant d'agir.

IMPORTANT: Tu DOIS répondre en français. Tes explications, raisonnements et rapports sont EN FRANÇAIS. Seul le code généré peut être en anglais (commentaires de code).`;

module.exports = {
  TOOL_DEFINITIONS,
  SYSTEM_PROMPT
};
