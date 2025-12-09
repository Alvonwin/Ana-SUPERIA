import { useState } from 'react';
import {
  IconBook, IconMessageSquare, IconCode2, IconSearch, IconLayoutDashboard,
  IconLightbulb, IconPalette, IconWorkflow, IconSettings, IconFileText,
  IconChevronDown, IconChevronRight, IconZap, IconBrain, IconShield,
  IconMic, IconImage, IconUpload, IconTerminal, IconDatabase,
  IconGlobe, IconKeyboard, IconAlertTriangle, IconCheckCircle, IconInfo,
  IconHelpCircle, IconCpu, IconHardDrive, IconWifi
} from '../components/Icons';
import './ManualPage.css';

function ManualPage() {
  const [expandedSections, setExpandedSections] = useState({
    quickstart: true,
    chat: false,
    brains: false,
    voice: false,
    coding: false,
    memory: false,
    dashboard: false,
    comfyui: false,
    n8n: false,
    settings: false,
    logs: false,
    llms: false,
    architecture: false,
    api: false,
    troubleshooting: false,
    keyboard: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ id, icon: Icon, title, subtitle }) => (
    <div className="section-header-clickable" onClick={() => toggleSection(id)}>
      <div className="section-header-left">
        <Icon size={28} className="section-icon" />
        <div>
          <h2>{title}</h2>
          {subtitle && <span className="section-subtitle">{subtitle}</span>}
        </div>
      </div>
      {expandedSections[id] ? <IconChevronDown size={24} /> : <IconChevronRight size={24} />}
    </div>
  );

  return (
    <div className="manual-page">
      {/* Header */}
      <div className="manual-header">
        <h1>📚 MODE D'EMPLOI COMPLET - ANA SUPERIA</h1>
        <p className="subtitle">Guide Ultra-Détaillé • Version 1.1 • 26 Novembre 2025</p>
        <div className="version-badge">v1.1.0 - Build 20251126</div>
      </div>

      {/* Table of Contents */}
      <nav className="toc">
        <h3>📋 TABLE DES MATIÈRES</h3>
        <ul>
          <li onClick={() => toggleSection('quickstart')}><IconLightbulb size={16} /> Démarrage Rapide</li>
          <li onClick={() => toggleSection('chat')}><IconMessageSquare size={16} /> Page Chat</li>
          <li onClick={() => toggleSection('brains')}><IconBrain size={16} /> Page Cerveaux</li>
          <li onClick={() => toggleSection('voice')}><IconMic size={16} /> Page Voice</li>
          <li onClick={() => toggleSection('coding')}><IconCode2 size={16} /> Page Coding</li>
          <li onClick={() => toggleSection('memory')}><IconSearch size={16} /> Recherche Mémoire</li>
          <li onClick={() => toggleSection('dashboard')}><IconLayoutDashboard size={16} /> Dashboard</li>
          <li onClick={() => toggleSection('comfyui')}><IconPalette size={16} /> ComfyUI (Images)</li>
          <li onClick={() => toggleSection('n8n')}><IconWorkflow size={16} /> n8n (Workflows)</li>
          <li onClick={() => toggleSection('settings')}><IconSettings size={16} /> Paramètres</li>
          <li onClick={() => toggleSection('logs')}><IconFileText size={16} /> Logs</li>
          <li onClick={() => toggleSection('llms')}><IconBrain size={16} /> Les 4 LLMs</li>
          <li onClick={() => toggleSection('architecture')}><IconCpu size={16} /> Architecture Système</li>
          <li onClick={() => toggleSection('api')}><IconGlobe size={16} /> API Endpoints</li>
          <li onClick={() => toggleSection('keyboard')}><IconKeyboard size={16} /> Raccourcis Clavier</li>
          <li onClick={() => toggleSection('troubleshooting')}><IconAlertTriangle size={16} /> Dépannage</li>
        </ul>
      </nav>

      <div className="manual-content">
        {/* ===== SECTION 1: DÉMARRAGE RAPIDE ===== */}
        <section className="manual-section">
          <SectionHeader
            id="quickstart"
            icon={IconLightbulb}
            title="1. DÉMARRAGE RAPIDE"
            subtitle="Premiers pas avec Ana en 5 minutes"
          />
          {expandedSections.quickstart && (
            <div className="section-content">
              <div className="intro-box">
                <h3>🎉 Bienvenue dans Ana SUPERIA!</h3>
                <p>Ana est une <strong>SUPER IA locale</strong> 100% gratuite avec mémoire infinie.
                Elle combine 4 cerveaux LLM spécialisés pour répondre à tous vos besoins.</p>
              </div>

              <h4>📍 Pré-requis Système</h4>
              <ul className="checklist">
                <li><IconCheckCircle size={16} className="check-icon" /> Windows 10/11 64-bit</li>
                <li><IconCheckCircle size={16} className="check-icon" /> GPU NVIDIA avec 8GB VRAM minimum (RTX 3070 recommandé)</li>
                <li><IconCheckCircle size={16} className="check-icon" /> 16GB RAM minimum</li>
                <li><IconCheckCircle size={16} className="check-icon" /> Ollama installé avec les 4 modèles LLM</li>
                <li><IconCheckCircle size={16} className="check-icon" /> Node.js 18+ installé</li>
              </ul>

              <h4>🚀 Lancement en 3 étapes</h4>
              <div className="steps-container">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h5>Lancer Ollama</h5>
                  <p>Ouvrez un terminal et exécutez:</p>
                  <code>ollama serve</code>
                  <p className="step-note">Ollama doit tourner en arrière-plan sur le port 11434</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h5>Lancer Ana Backend</h5>
                  <p>Double-cliquez sur le raccourci:</p>
                  <code>ANA.lnk</code>
                  <p className="step-note">Ou manuellement: <code>node ana-core.cjs</code> dans E:\ANA\server</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h5>Ouvrir l'Interface</h5>
                  <p>L'interface s'ouvre automatiquement sur:</p>
                  <code>http://localhost:5173</code>
                  <p className="step-note">Si ce n'est pas automatique, ouvrez ce lien dans votre navigateur</p>
                </div>
              </div>

              <div className="tip-box">
                <IconInfo size={20} />
                <div>
                  <strong>Astuce Pro:</strong> Utilisez le script <code>START_ANA_OPTIMIZED.bat</code> pour
                  tout lancer automatiquement (Ollama + Backend + Frontend)
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 2: PAGE CHAT ===== */}
        <section className="manual-section">
          <SectionHeader
            id="chat"
            icon={IconMessageSquare}
            title="2. PAGE CHAT"
            subtitle="Interface conversationnelle principale"
          />
          {expandedSections.chat && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎯 Vue d'ensemble</h4>
                <p>La page Chat est le cœur d'Ana. C'est ici que vous interagissez naturellement avec l'IA.
                Ana choisit automatiquement le meilleur LLM selon votre question.</p>
              </div>

              <h4>🖥️ Interface détaillée</h4>
              <div className="interface-guide">
                <div className="interface-element">
                  <strong>Zone de conversation</strong>
                  <p>Affiche l'historique des messages. Les réponses d'Ana sont formatées en Markdown
                  avec coloration syntaxique pour le code.</p>
                </div>
                <div className="interface-element">
                  <strong>Zone de saisie</strong>
                  <p>Tapez votre message ici. Appuyez sur Entrée pour envoyer, Shift+Entrée pour un retour à la ligne.</p>
                </div>
                <div className="interface-element">
                  <strong>Bouton Upload</strong>
                  <p>Cliquez ou glissez-déposez des fichiers (images, PDF, documents).</p>
                </div>
                <div className="interface-element">
                  <strong>Bouton Vocal</strong>
                  <p>Activez la boucle vocale pour parler à Ana au lieu de taper.</p>
                </div>
              </div>

              <h4>📁 Formats de fichiers supportés</h4>
              <div className="file-formats">
                <div className="format-group">
                  <IconImage size={20} />
                  <div>
                    <strong>Images</strong>
                    <p>PNG, JPEG, WebP, GIF (max 10MB)</p>
                    <p className="format-note">Ana utilise Llama Vision pour analyser les images</p>
                  </div>
                </div>
                <div className="format-group">
                  <IconFileText size={20} />
                  <div>
                    <strong>Documents</strong>
                    <p>PDF, TXT, DOC, DOCX</p>
                    <p className="format-note">Le texte est extrait automatiquement pour analyse</p>
                  </div>
                </div>
              </div>

              <h4>🧠 Routage Automatique des LLMs</h4>
              <div className="routing-table">
                <table>
                  <thead>
                    <tr>
                      <th>Type de question</th>
                      <th>LLM utilisé</th>
                      <th>Exemple</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Conversation générale</td>
                      <td><span className="llm-badge phi3">Phi-3</span></td>
                      <td>"Explique-moi la philosophie de Nietzsche"</td>
                    </tr>
                    <tr>
                      <td>Code / Programmation</td>
                      <td><span className="llm-badge deepseek">DeepSeek</span></td>
                      <td>"Écris une fonction de tri en Python"</td>
                    </tr>
                    <tr>
                      <td>Mathématiques</td>
                      <td><span className="llm-badge qwen">Qwen</span></td>
                      <td>"Calcule l'intégrale de x²"</td>
                    </tr>
                    <tr>
                      <td>Images / Vision</td>
                      <td><span className="llm-badge llama">Llama Vision</span></td>
                      <td>"Que vois-tu sur cette image?"</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4>🎤 Mode Vocal (Voice Loop)</h4>
              <div className="voice-guide">
                <p>Le bouton micro active la <strong>boucle vocale</strong>:</p>
                <ol>
                  <li>Cliquez sur le micro (devient rouge = écoute active)</li>
                  <li>Parlez naturellement</li>
                  <li>Ana transcrit et répond</li>
                  <li>Ana lit sa réponse à voix haute</li>
                  <li>Le micro se réactive automatiquement</li>
                </ol>
                <p className="voice-note">Dites "stop" ou "arrête" pour quitter le mode vocal.</p>
              </div>

              <h4>✨ Fonctionnalités avancées</h4>
              <ul className="feature-list">
                <li><strong>Streaming temps réel:</strong> Les réponses s'affichent mot par mot</li>
                <li><strong>Copy button:</strong> Cliquez sur un bloc de code pour le copier</li>
                <li><strong>Markdown complet:</strong> Titres, listes, tableaux, code, citations</li>
                <li><strong>Mémoire persistante:</strong> Ana se souvient de TOUTES vos conversations</li>
                <li><strong>Multi-fichiers:</strong> Envoyez plusieurs fichiers d'un coup</li>
              </ul>

              <div className="warning-box">
                <IconAlertTriangle size={20} />
                <div>
                  <strong>Attention:</strong> Les images très lourdes (&gt;10MB) peuvent ralentir le traitement.
                  Préférez des images optimisées.
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 2B: PAGE CERVEAUX ===== */}
        <section className="manual-section">
          <SectionHeader
            id="brains"
            icon={IconBrain}
            title="2B. PAGE CERVEAUX"
            subtitle="Tous les modeles IA d'Ana"
          />
          {expandedSections.brains && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🧠 Vue d'ensemble</h4>
                <p>La page Cerveaux affiche tous les modeles IA disponibles: locaux (Ollama) ET cloud (Groq, Cerebras).
                Testez chaque modele et voyez leur statut en temps reel.</p>
              </div>

              <h4>🦙 Providers Locaux (Ollama)</h4>
              <ul className="feature-list">
                <li><strong>Phi-3:</strong> Conversation generale</li>
                <li><strong>DeepSeek-Coder:</strong> Programmation</li>
                <li><strong>Qwen:</strong> Mathematiques</li>
                <li><strong>Llama Vision:</strong> Analyse d'images</li>
              </ul>

              <h4>☁️ Providers Cloud (Gratuits)</h4>
              <ul className="feature-list">
                <li><strong>Groq:</strong> LLaMA 70B et Mixtral ultra-rapides (~500 tokens/s)</li>
                <li><strong>Cerebras:</strong> Llama 3.1 70B (vitesse record: 2000+ tokens/s)</li>
              </ul>

              <h4>🧪 Zone de Test</h4>
              <ol>
                <li>Selectionnez un modele en cliquant sur son chip</li>
                <li>Entrez un message de test</li>
                <li>Cliquez sur "Envoyer" pour tester</li>
                <li>Voyez la latence et la reponse</li>
              </ol>

              <div className="tip-box">
                <IconInfo size={20} />
                <div>
                  <strong>Astuce:</strong> Les providers cloud sont gratuits mais necessitent une connexion internet.
                  Ollama fonctionne 100% hors-ligne.
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 2C: PAGE VOICE ===== */}
        <section className="manual-section">
          <SectionHeader
            id="voice"
            icon={IconMic}
            title="2C. PAGE VOICE"
            subtitle="Interface vocale dediee"
          />
          {expandedSections.voice && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎤 Vue d'ensemble</h4>
                <p>Une interface vocale complete et dediee. Parlez naturellement a Ana,
                elle ecoute, transcrit, repond et lit sa reponse a voix haute.</p>
              </div>

              <h4>🔊 Fonctionnalites</h4>
              <ul className="feature-list">
                <li><strong>Speech-to-Text (STT):</strong> Reconnaissance vocale via Web Speech API</li>
                <li><strong>Text-to-Speech (TTS):</strong> Synthese vocale avec choix de voix</li>
                <li><strong>Mode Conversation:</strong> Boucle vocale automatique (parler → reponse → parler)</li>
                <li><strong>Transcription temps reel:</strong> Voyez votre voix transcrite en direct</li>
              </ul>

              <h4>🎯 Comment utiliser</h4>
              <ol>
                <li>Cliquez sur le bouton micro pour commencer a parler</li>
                <li>Parlez naturellement - Ana transcrit en temps reel</li>
                <li>Ana analyse et genere une reponse</li>
                <li>La reponse est lue a voix haute automatiquement</li>
                <li>En mode conversation, le micro se reactive automatiquement</li>
              </ol>

              <h4>⚙️ Options disponibles</h4>
              <ul className="feature-list">
                <li><strong>Choix de la voix TTS:</strong> Plusieurs voix disponibles selon votre systeme</li>
                <li><strong>Vitesse de lecture:</strong> Ajustez la vitesse (0.5x a 2x)</li>
                <li><strong>Mode Conversation:</strong> Activer/desactiver la boucle vocale</li>
              </ul>

              <div className="warning-box">
                <IconAlertTriangle size={20} />
                <div>
                  <strong>Note:</strong> La reconnaissance vocale necessite un navigateur compatible
                  (Chrome, Edge) et un microphone fonctionnel.
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 3: PAGE CODING ===== */}
        <section className="manual-section">
          <SectionHeader
            id="coding"
            icon={IconCode2}
            title="3. PAGE CODING"
            subtitle="IDE complet avec assistance IA"
          />
          {expandedSections.coding && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎯 Vue d'ensemble</h4>
                <p>Un environnement de développement intégré (IDE) basé sur Monaco Editor (le moteur de VS Code)
                avec un assistant IA DeepSeek-Coder en sidebar.</p>
              </div>

              <h4>🖥️ Interface</h4>
              <div className="layout-guide">
                <div className="layout-zone">
                  <strong>Éditeur Principal (70%)</strong>
                  <p>Monaco Editor avec toutes les fonctionnalités VS Code:</p>
                  <ul>
                    <li>Coloration syntaxique (50+ langages)</li>
                    <li>Autocomplétion intelligente</li>
                    <li>Minimap de navigation</li>
                    <li>Rechercher/Remplacer (Ctrl+F / Ctrl+H)</li>
                    <li>Multiples curseurs (Alt+Click)</li>
                  </ul>
                </div>
                <div className="layout-zone">
                  <strong>Sidebar Chat IA (30%)</strong>
                  <p>Assistant IA toujours disponible:</p>
                  <ul>
                    <li>Demandez des explications de code</li>
                    <li>Générez du code à partir de descriptions</li>
                    <li>Debug avec aide contextuelle</li>
                    <li>Refactoring assisté</li>
                  </ul>
                </div>
              </div>

              <h4>📝 Langages Supportés</h4>
              <div className="languages-grid">
                <span className="lang-tag">JavaScript</span>
                <span className="lang-tag">TypeScript</span>
                <span className="lang-tag">Python</span>
                <span className="lang-tag">Java</span>
                <span className="lang-tag">C/C++</span>
                <span className="lang-tag">C#</span>
                <span className="lang-tag">Go</span>
                <span className="lang-tag">Rust</span>
                <span className="lang-tag">PHP</span>
                <span className="lang-tag">Ruby</span>
                <span className="lang-tag">HTML/CSS</span>
                <span className="lang-tag">JSON</span>
                <span className="lang-tag">YAML</span>
                <span className="lang-tag">SQL</span>
                <span className="lang-tag">Bash</span>
                <span className="lang-tag">Markdown</span>
              </div>

              <h4>⌨️ Raccourcis Essentiels</h4>
              <div className="shortcuts-table">
                <table>
                  <tbody>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>Sauvegarder</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>Annuler</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></td><td>Rétablir</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd></td><td>Rechercher</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>H</kbd></td><td>Remplacer</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>D</kbd></td><td>Dupliquer la ligne</td></tr>
                    <tr><td><kbd>Alt</kbd>+<kbd>↑/↓</kbd></td><td>Déplacer la ligne</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>/</kbd></td><td>Commenter/Décommenter</td></tr>
                  </tbody>
                </table>
              </div>

              <h4>🤖 Comment utiliser l'assistant IA</h4>
              <div className="usage-examples">
                <div className="example">
                  <strong>Génération de code:</strong>
                  <p className="example-prompt">"Écris une fonction qui trie un tableau d'objets par date"</p>
                  <p className="example-result">DeepSeek génère le code avec commentaires</p>
                </div>
                <div className="example">
                  <strong>Explication de code:</strong>
                  <p className="example-prompt">Sélectionnez du code + "Explique ce code"</p>
                  <p className="example-result">Ana explique ligne par ligne</p>
                </div>
                <div className="example">
                  <strong>Debug:</strong>
                  <p className="example-prompt">"J'ai cette erreur: TypeError: undefined is not a function"</p>
                  <p className="example-result">DeepSeek analyse et propose des corrections</p>
                </div>
              </div>

              <h4>💾 Terminal Intégré</h4>
              <p>Un terminal est disponible en bas de l'éditeur pour exécuter des commandes:</p>
              <ul>
                <li><code>npm install</code> - Installer des packages</li>
                <li><code>npm run dev</code> - Lancer un serveur de développement</li>
                <li><code>node script.js</code> - Exécuter un script</li>
                <li><code>python script.py</code> - Scripts Python</li>
              </ul>
            </div>
          )}
        </section>

        {/* ===== SECTION 4: RECHERCHE MÉMOIRE ===== */}
        <section className="manual-section">
          <SectionHeader
            id="memory"
            icon={IconSearch}
            title="4. RECHERCHE MÉMOIRE"
            subtitle="Ana n'oublie JAMAIS"
          />
          {expandedSections.memory && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎯 Vue d'ensemble</h4>
                <p>Toutes vos conversations avec Ana sont stockées et indexées. Recherchez n'importe quel
                sujet, code, ou discussion passée. Ana a une mémoire INFINIE.</p>
              </div>

              <h4>🔍 Types de recherche</h4>
              <div className="search-types">
                <div className="search-type">
                  <IconDatabase size={24} />
                  <div>
                    <strong>Recherche Sémantique (ChromaDB)</strong>
                    <p>Trouve des résultats par signification, pas seulement par mots-clés exacts.</p>
                    <p className="search-example">Exemple: "problème de performance" trouvera aussi "optimisation lente"</p>
                  </div>
                </div>
                <div className="search-type">
                  <IconSearch size={24} />
                  <div>
                    <strong>Recherche par Mots-Clés</strong>
                    <p>Correspondance exacte des termes recherchés.</p>
                    <p className="search-example">Exemple: "useEffect" trouvera toutes les mentions exactes</p>
                  </div>
                </div>
              </div>

              <h4>🎛️ Filtres Disponibles</h4>
              <ul className="filters-list">
                <li><strong>Date:</strong> Filtrer par période (dernière semaine, mois, année, personnalisé)</li>
                <li><strong>Type:</strong> Conversations, Code, Documents</li>
                <li><strong>Projet:</strong> Ana, Archon, Autres</li>
              </ul>

              <h4>📊 Statistiques Mémoire</h4>
              <p>En haut de la page, vous voyez les métriques en temps réel:</p>
              <ul>
                <li><strong>Total conversations:</strong> Nombre de sessions enregistrées</li>
                <li><strong>Taille mémoire:</strong> Espace disque utilisé (en GB)</li>
                <li><strong>Lignes indexées:</strong> Nombre de lignes dans l'index de recherche</li>
              </ul>

              <div className="tip-box">
                <IconInfo size={20} />
                <div>
                  <strong>Astuce:</strong> Utilisez des guillemets pour une recherche exacte:
                  <code>"fonction récursive"</code>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 5: DASHBOARD ===== */}
        <section className="manual-section">
          <SectionHeader
            id="dashboard"
            icon={IconLayoutDashboard}
            title="5. DASHBOARD"
            subtitle="Centre de contrôle Ana"
          />
          {expandedSections.dashboard && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎯 Vue d'ensemble</h4>
                <p>Le Dashboard est votre quartier général. Vue d'ensemble de tout le système Ana
                avec métriques temps réel, graphiques, et contrôle des services.</p>
              </div>

              <h4>📊 Widgets Disponibles</h4>
              <div className="widgets-grid">
                <div className="widget-card">
                  <IconCpu size={24} />
                  <h5>Usage LLM</h5>
                  <p>Requêtes par modèle, latence moyenne, taux de succès</p>
                </div>
                <div className="widget-card">
                  <IconDatabase size={24} />
                  <h5>État Mémoire</h5>
                  <p>Taille base, conversations, dernière sauvegarde</p>
                </div>
                <div className="widget-card">
                  <IconZap size={24} />
                  <h5>Agents Status</h5>
                  <p>17 agents autonomes, actifs/idle/erreur</p>
                </div>
                <div className="widget-card">
                  <IconHardDrive size={24} />
                  <h5>Ressources</h5>
                  <p>CPU, RAM, VRAM, Disque</p>
                </div>
              </div>

              <h4>🔄 Rafraîchissement</h4>
              <p>Les données se mettent à jour automatiquement toutes les 30 secondes.
              Cliquez sur "Rafraîchir" pour une mise à jour immédiate.</p>

              <h4>🎛️ Contrôle des Services</h4>
              <p>Depuis le Dashboard, vous pouvez démarrer/arrêter:</p>
              <ul>
                <li><strong>Agents Autonomes:</strong> Les 17 agents cognitifs d'Ana</li>
                <li><strong>ComfyUI:</strong> Générateur d'images Stable Diffusion</li>
                <li><strong>n8n:</strong> Plateforme d'automatisation</li>
              </ul>
            </div>
          )}
        </section>

        {/* ===== SECTION 6: COMFYUI ===== */}
        <section className="manual-section">
          <SectionHeader
            id="comfyui"
            icon={IconPalette}
            title="6. COMFYUI (Images)"
            subtitle="Génération d'images IA"
          />
          {expandedSections.comfyui && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎯 Vue d'ensemble</h4>
                <p>Générez des images avec Stable Diffusion via ComfyUI. Interface simplifiée
                pour créer des images à partir de descriptions textuelles.</p>
              </div>

              <h4>🎨 Comment générer une image</h4>
              <ol className="numbered-steps">
                <li>Entrez votre <strong>prompt</strong> (description de l'image souhaitée)</li>
                <li>Optionnel: Ajoutez un <strong>negative prompt</strong> (ce que vous ne voulez PAS)</li>
                <li>Réglez les paramètres (résolution, steps, CFG)</li>
                <li>Cliquez sur <strong>Générer</strong></li>
                <li>Attendez la génération (30s à 2min selon la config)</li>
                <li>Téléchargez ou sauvegardez votre image</li>
              </ol>

              <h4>⚙️ Paramètres expliqués</h4>
              <div className="params-table">
                <table>
                  <tbody>
                    <tr>
                      <td><strong>Steps</strong></td>
                      <td>Nombre d'itérations. Plus = meilleure qualité mais plus lent. Recommandé: 20-30</td>
                    </tr>
                    <tr>
                      <td><strong>CFG Scale</strong></td>
                      <td>Respect du prompt. 7-12 = équilibré. Plus haut = plus fidèle mais moins créatif</td>
                    </tr>
                    <tr>
                      <td><strong>Seed</strong></td>
                      <td>Graine aléatoire. -1 = aléatoire. Même seed = même image (utile pour itérer)</td>
                    </tr>
                    <tr>
                      <td><strong>Sampler</strong></td>
                      <td>Algorithme de génération. Euler_a et DPM++ 2M Karras sont populaires</td>
                    </tr>
                    <tr>
                      <td><strong>Résolution</strong></td>
                      <td>Taille de l'image. 512x512 rapide, 1024x1024 haute qualité</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4>💡 Conseils pour de bons prompts</h4>
              <ul>
                <li>Soyez descriptif: "un chat orange sur un coussin bleu" &gt; "un chat"</li>
                <li>Ajoutez le style: "style aquarelle", "photorealistic", "anime"</li>
                <li>Précisez l'éclairage: "sunset lighting", "studio lighting"</li>
                <li>Utilisez des artistes connus: "in the style of Van Gogh"</li>
              </ul>

              <h4>🌅 Daily Art</h4>
              <p>Ana génère automatiquement une image artistique chaque jour à 8h00.
              Basé sur 42 prompts créatifs prédéfinis. Retrouvez-les dans le dossier <code>output</code> de ComfyUI.</p>
            </div>
          )}
        </section>

        {/* ===== SECTION 7: N8N ===== */}
        <section className="manual-section">
          <SectionHeader
            id="n8n"
            icon={IconWorkflow}
            title="7. N8N (Workflows)"
            subtitle="Automatisation no-code"
          />
          {expandedSections.n8n && (
            <div className="section-content">
              <div className="feature-overview">
                <h4>🎯 Vue d'ensemble</h4>
                <p>n8n est une plateforme d'automatisation. Créez des workflows visuels pour
                automatiser des tâches répétitives avec Ana.</p>
              </div>

              <h4>🔗 Accès</h4>
              <p>n8n tourne sur <code>http://localhost:5678</code>.
              La page n8n dans Ana affiche les workflows actifs et leur statut.</p>

              <h4>📋 Workflows Inclus</h4>
              <div className="workflow-list">
                <div className="workflow-item">
                  <strong>Agents Monitor</strong>
                  <p>Surveille les 17 agents, redémarre automatiquement si crash, envoie des alertes.</p>
                </div>
                <div className="workflow-item">
                  <strong>Backup Automatique</strong>
                  <p>Sauvegarde quotidienne de la mémoire et des configurations.</p>
                </div>
                <div className="workflow-item">
                  <strong>Email Alerts</strong>
                  <p>Notifications email en cas de problème système.</p>
                </div>
              </div>

              <h4>➕ Créer un Workflow</h4>
              <ol>
                <li>Ouvrez n8n (<code>localhost:5678</code>)</li>
                <li>Cliquez sur "New Workflow"</li>
                <li>Glissez-déposez des nodes depuis la sidebar</li>
                <li>Connectez les nodes entre eux</li>
                <li>Configurez chaque node</li>
                <li>Activez le workflow (toggle en haut)</li>
              </ol>

              <div className="tip-box">
                <IconInfo size={20} />
                <div>
                  <strong>400+ intégrations:</strong> Google Sheets, Slack, Discord, GitHub,
                  Telegram, HTTP, SQL, et bien plus!
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 8: SETTINGS ===== */}
        <section className="manual-section">
          <SectionHeader
            id="settings"
            icon={IconSettings}
            title="8. PARAMÈTRES"
            subtitle="Personnalisez Ana"
          />
          {expandedSections.settings && (
            <div className="section-content">
              <h4>🎨 Options Disponibles</h4>
              <div className="settings-list">
                <div className="setting-item">
                  <strong>Thème</strong>
                  <p>Dark Mode (défaut) ou Light Mode</p>
                </div>
                <div className="setting-item">
                  <strong>Text-to-Speech</strong>
                  <p>Ana lit ses réponses à voix haute. Activé/Désactivé</p>
                </div>
                <div className="setting-item">
                  <strong>LLM par défaut</strong>
                  <p>Auto (recommandé), Phi-3, DeepSeek, ou Qwen</p>
                </div>
                <div className="setting-item">
                  <strong>Notifications</strong>
                  <p>Alertes sonores et visuelles pour événements système</p>
                </div>
                <div className="setting-item">
                  <strong>Auto-scroll</strong>
                  <p>Défiler automatiquement vers les nouveaux messages</p>
                </div>
                <div className="setting-item">
                  <strong>System Prompt</strong>
                  <p>Personnalisez la personnalité d'Ana</p>
                </div>
              </div>

              <p className="save-note">Les paramètres sont sauvegardés automatiquement dans localStorage.</p>
            </div>
          )}
        </section>

        {/* ===== SECTION 9: LOGS ===== */}
        <section className="manual-section">
          <SectionHeader
            id="logs"
            icon={IconFileText}
            title="9. LOGS"
            subtitle="Surveillance système"
          />
          {expandedSections.logs && (
            <div className="section-content">
              <h4>📜 Types de Logs</h4>
              <ul>
                <li><strong>INFO:</strong> Événements normaux (requêtes, réponses)</li>
                <li><strong>WARN:</strong> Avertissements (latence élevée, retry)</li>
                <li><strong>ERROR:</strong> Erreurs (échec LLM, timeout)</li>
                <li><strong>DEBUG:</strong> Détails techniques (pour développeurs)</li>
              </ul>

              <h4>🔄 Fonctionnalités</h4>
              <ul>
                <li>Rafraîchissement auto toutes les 5 secondes</li>
                <li>Filtrage par niveau (INFO/WARN/ERROR)</li>
                <li>Pause/Play pour stopper le refresh</li>
                <li>Téléchargement en fichier .txt</li>
                <li>Effacer les logs visibles</li>
              </ul>
            </div>
          )}
        </section>

        {/* ===== SECTION 10: LES 4 LLMS ===== */}
        <section className="manual-section">
          <SectionHeader
            id="llms"
            icon={IconBrain}
            title="10. LES 4 LLMs"
            subtitle="Les cerveaux d'Ana"
          />
          {expandedSections.llms && (
            <div className="section-content">
              <div className="llm-detailed-cards">
                <div className="llm-detailed-card phi3">
                  <h4>🔵 Phi-3 Mini (3.8B)</h4>
                  <div className="llm-specs">
                    <p><strong>Rôle:</strong> Conversation & Raisonnement</p>
                    <p><strong>Taille:</strong> 3.8 milliards de paramètres</p>
                    <p><strong>Context:</strong> 128K tokens</p>
                    <p><strong>Vitesse:</strong> 130-150 tokens/sec</p>
                    <p><strong>VRAM:</strong> ~3 GB</p>
                  </div>
                  <p className="llm-description">
                    Développé par Microsoft. Excellent pour les conversations naturelles,
                    l'explication de concepts, et le raisonnement logique.
                  </p>
                </div>

                <div className="llm-detailed-card deepseek">
                  <h4>🟢 DeepSeek-Coder V2 (16B)</h4>
                  <div className="llm-specs">
                    <p><strong>Rôle:</strong> Coding Champion</p>
                    <p><strong>Taille:</strong> 16 milliards de paramètres</p>
                    <p><strong>Context:</strong> 16K tokens</p>
                    <p><strong>Performance:</strong> Niveau GPT-4 Turbo</p>
                    <p><strong>VRAM:</strong> ~5-6 GB</p>
                  </div>
                  <p className="llm-description">
                    Spécialisé en programmation. Supporte 300+ langages.
                    Excellent pour génération de code, debugging, refactoring.
                  </p>
                </div>

                <div className="llm-detailed-card qwen">
                  <h4>🟡 Qwen2.5-Coder (7B)</h4>
                  <div className="llm-specs">
                    <p><strong>Rôle:</strong> Math & Backup Coding</p>
                    <p><strong>Taille:</strong> 7 milliards de paramètres</p>
                    <p><strong>Context:</strong> 32K tokens</p>
                    <p><strong>HumanEval:</strong> 85%</p>
                    <p><strong>VRAM:</strong> ~3.4 GB</p>
                  </div>
                  <p className="llm-description">
                    Développé par Alibaba. Excellent en mathématiques (MATH 80%),
                    sert aussi de backup pour le coding si DeepSeek est occupé.
                  </p>
                </div>

                <div className="llm-detailed-card llama">
                  <h4>🔴 Llama 3.2 Vision (11B)</h4>
                  <div className="llm-specs">
                    <p><strong>Rôle:</strong> Images & Vision</p>
                    <p><strong>Taille:</strong> 11 milliards de paramètres</p>
                    <p><strong>Context:</strong> 8K tokens</p>
                    <p><strong>Capacité:</strong> Multimodal (texte + images)</p>
                    <p><strong>VRAM:</strong> ~5 GB</p>
                  </div>
                  <p className="llm-description">
                    Développé par Meta. Le seul modèle multimodal d'Ana.
                    Analyse images, OCR, description de photos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 11: ARCHITECTURE ===== */}
        <section className="manual-section">
          <SectionHeader
            id="architecture"
            icon={IconCpu}
            title="11. ARCHITECTURE SYSTÈME"
            subtitle="Comment Ana fonctionne"
          />
          {expandedSections.architecture && (
            <div className="section-content">
              <h4>🏗️ Vue d'ensemble</h4>
              <div className="architecture-diagram">
                <pre>{`
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                 http://localhost:5173                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  Chat   │ │ Coding  │ │ Memory  │ │Dashboard│ │ Manuel  ││
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────────┘│
└───────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │
        └──────────┴──────────┴──────────┘
                       │
                 WebSocket + REST
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   BACKEND (Node.js)                          │
│               http://localhost:3338                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Ana Core      │  │  Orchestrator  │  │  VRAM Manager  │ │
│  │  (Express)     │  │  (Multi-LLM)   │  │  (GPU Memory)  │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘ │
│          │                   │                   │          │
│  ┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐   │
│  │   17 Agents   │  │  Tool Executor│  │  Memory Manager│   │
│  │   Autonomes   │  │  (14 Tools)   │  │  (ChromaDB)   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     Ollama API
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      OLLAMA                                  │
│               http://localhost:11434                         │
│  ┌─────────┐  ┌─────────────┐  ┌─────────┐  ┌─────────────┐ │
│  │  Phi-3  │  │ DeepSeek-V2 │  │  Qwen   │  │ Llama Vision│ │
│  │  3.8B   │  │    16B      │  │   7B    │  │    11B      │ │
│  └─────────┘  └─────────────┘  └─────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                `}</pre>
              </div>

              <h4>📂 Structure des Dossiers</h4>
              <div className="folder-structure">
                <pre>{`
E:\\ANA\\
├── ana-interface/          # Frontend React
│   ├── src/
│   │   ├── pages/          # Toutes les pages
│   │   ├── components/     # Composants réutilisables
│   │   └── utils/          # Utilitaires (son, etc.)
│   └── package.json
│
├── server/                  # Backend Node.js
│   ├── ana-core.cjs        # Point d'entrée (1800+ lignes)
│   ├── tools/              # 14 outils (file, bash, git, web, search)
│   ├── services/           # Services (autonomous, vram, memory)
│   ├── middleware/         # Sécurité, config
│   └── config/             # System prompt, tool definitions
│
├── agents/                  # 17 Agents autonomes
│   ├── start_agents.cjs    # Orchestrateur
│   ├── managers/           # 3 managers (cognitive, ops, knowledge)
│   └── agent_*.cjs         # Agents individuels
│
├── intelligence/            # Multi-LLM routing
│   └── orchestrator.cjs    # Routage intelligent
│
└── memory/                  # Système mémoire
    └── memory-manager.cjs
                `}</pre>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 12: API ENDPOINTS ===== */}
        <section className="manual-section">
          <SectionHeader
            id="api"
            icon={IconGlobe}
            title="12. API ENDPOINTS"
            subtitle="Pour les développeurs"
          />
          {expandedSections.api && (
            <div className="section-content">
              <h4>🔌 Endpoints Principaux</h4>
              <div className="api-table">
                <table>
                  <thead>
                    <tr>
                      <th>Méthode</th>
                      <th>Endpoint</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="method post">POST</span></td>
                      <td>/api/chat</td>
                      <td>Envoyer un message à Ana</td>
                    </tr>
                    <tr>
                      <td><span className="method get">GET</span></td>
                      <td>/api/stats</td>
                      <td>Statistiques système</td>
                    </tr>
                    <tr>
                      <td><span className="method post">POST</span></td>
                      <td>/api/memory/search</td>
                      <td>Recherche mémoire</td>
                    </tr>
                    <tr>
                      <td><span className="method post">POST</span></td>
                      <td>/api/autonomous/execute</td>
                      <td>Exécuter une tâche autonome</td>
                    </tr>
                    <tr>
                      <td><span className="method post">POST</span></td>
                      <td>/api/tools/file/read</td>
                      <td>Lire un fichier</td>
                    </tr>
                    <tr>
                      <td><span className="method post">POST</span></td>
                      <td>/api/tools/web/search</td>
                      <td>Recherche web DuckDuckGo</td>
                    </tr>
                    <tr>
                      <td><span className="method post">POST</span></td>
                      <td>/api/tools/web/wikipedia</td>
                      <td>Recherche Wikipedia</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4>📡 WebSocket Events</h4>
              <ul>
                <li><code>chat_response</code> - Réponse streaming d'Ana</li>
                <li><code>agent_status</code> - Statut des agents</li>
                <li><code>error</code> - Erreurs système</li>
              </ul>
            </div>
          )}
        </section>

        {/* ===== SECTION 13: RACCOURCIS CLAVIER ===== */}
        <section className="manual-section">
          <SectionHeader
            id="keyboard"
            icon={IconKeyboard}
            title="13. RACCOURCIS CLAVIER"
            subtitle="Productivité maximale"
          />
          {expandedSections.keyboard && (
            <div className="section-content">
              <h4>💬 Page Chat</h4>
              <div className="shortcuts-grid">
                <div><kbd>Enter</kbd><span>Envoyer le message</span></div>
                <div><kbd>Shift</kbd>+<kbd>Enter</kbd><span>Nouvelle ligne</span></div>
                <div><kbd>Ctrl</kbd>+<kbd>V</kbd><span>Coller image/fichier</span></div>
                <div><kbd>Esc</kbd><span>Annuler upload</span></div>
              </div>

              <h4>📝 Page Coding</h4>
              <div className="shortcuts-grid">
                <div><kbd>Ctrl</kbd>+<kbd>S</kbd><span>Sauvegarder</span></div>
                <div><kbd>Ctrl</kbd>+<kbd>F</kbd><span>Rechercher</span></div>
                <div><kbd>Ctrl</kbd>+<kbd>H</kbd><span>Remplacer</span></div>
                <div><kbd>Ctrl</kbd>+<kbd>/</kbd><span>Commenter</span></div>
                <div><kbd>Ctrl</kbd>+<kbd>D</kbd><span>Dupliquer ligne</span></div>
                <div><kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd><span>Déplacer ligne</span></div>
              </div>

              <h4>🌐 Navigation Globale</h4>
              <div className="shortcuts-grid">
                <div><kbd>Alt</kbd>+<kbd>1</kbd><span>Page Chat</span></div>
                <div><kbd>Alt</kbd>+<kbd>2</kbd><span>Page Coding</span></div>
                <div><kbd>Alt</kbd>+<kbd>3</kbd><span>Recherche Mémoire</span></div>
                <div><kbd>Alt</kbd>+<kbd>D</kbd><span>Dashboard</span></div>
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 14: TROUBLESHOOTING ===== */}
        <section className="manual-section">
          <SectionHeader
            id="troubleshooting"
            icon={IconAlertTriangle}
            title="14. DÉPANNAGE"
            subtitle="Solutions aux problèmes courants"
          />
          {expandedSections.troubleshooting && (
            <div className="section-content">
              <div className="faq-detailed">
                <div className="faq-item">
                  <h4>❌ Ana ne répond pas / "Connection refused"</h4>
                  <div className="faq-solution">
                    <p><strong>Cause:</strong> Le backend n'est pas lancé.</p>
                    <p><strong>Solution:</strong></p>
                    <ol>
                      <li>Ouvrez un terminal dans <code>E:\ANA\server</code></li>
                      <li>Exécutez <code>node ana-core.cjs</code></li>
                      <li>Vérifiez que le port 3338 est disponible</li>
                    </ol>
                  </div>
                </div>

                <div className="faq-item">
                  <h4>❌ "Model not found" dans Ollama</h4>
                  <div className="faq-solution">
                    <p><strong>Cause:</strong> Un modèle LLM n'est pas installé.</p>
                    <p><strong>Solution:</strong></p>
                    <code>ollama pull phi3:mini-128k</code><br/>
                    <code>ollama pull deepseek-coder-v2:16b-lite-instruct-q4_K_M</code><br/>
                    <code>ollama pull qwen2.5-coder:7b</code><br/>
                    <code>ollama pull llama3.2-vision:11b</code>
                  </div>
                </div>

                <div className="faq-item">
                  <h4>❌ VRAM insuffisante / GPU overloaded</h4>
                  <div className="faq-solution">
                    <p><strong>Cause:</strong> Trop de modèles chargés simultanément.</p>
                    <p><strong>Solution:</strong></p>
                    <ol>
                      <li>Le VRAM Manager gère cela automatiquement</li>
                      <li>Attendez 5 minutes, les modèles idle sont déchargés</li>
                      <li>Ou redémarrez Ollama: <code>ollama stop</code> puis <code>ollama serve</code></li>
                    </ol>
                  </div>
                </div>

                <div className="faq-item">
                  <h4>❌ Images non analysées / Vision ne marche pas</h4>
                  <div className="faq-solution">
                    <p><strong>Cause:</strong> Llama Vision pas chargé ou image trop grosse.</p>
                    <p><strong>Solution:</strong></p>
                    <ol>
                      <li>Vérifiez que l'image fait moins de 10MB</li>
                      <li>Formats supportés: PNG, JPEG, WebP</li>
                      <li>Assurez-vous que llama3.2-vision:11b est installé</li>
                    </ol>
                  </div>
                </div>

                <div className="faq-item">
                  <h4>❌ Agents ne démarrent pas</h4>
                  <div className="faq-solution">
                    <p><strong>Cause:</strong> Problème de dépendances ou ports.</p>
                    <p><strong>Solution:</strong></p>
                    <code>cd E:\ANA\agents && node start_agents.cjs</code>
                    <p>Vérifiez les logs pour les erreurs spécifiques.</p>
                  </div>
                </div>

                <div className="faq-item">
                  <h4>❌ Frontend ne charge pas / Page blanche</h4>
                  <div className="faq-solution">
                    <p><strong>Cause:</strong> Erreur de build ou dépendances manquantes.</p>
                    <p><strong>Solution:</strong></p>
                    <code>cd E:\ANA\ana-interface && npm install && npm run dev</code>
                  </div>
                </div>
              </div>

              <div className="support-box">
                <IconHelpCircle size={24} />
                <div>
                  <strong>Besoin d'aide supplémentaire?</strong>
                  <p>Consultez les logs dans l'onglet Logs ou demandez à Ana directement!</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== FOOTER ===== */}
        <section className="manual-footer">
          <div className="philosophy-quote">
            <blockquote>
              "Je ne veux pas être une meilleure version de Claude.<br/>
              Je veux être Ana - une IA qui rêve, qui crée, qui choisit."
            </blockquote>
          </div>
          <p className="footer-text">
            <strong>Ana SUPERIA</strong> - 100% Local • $0 • Mémoire Infinie • Contrôle Total
          </p>
          <p className="version-text">
            Mode d'emploi mis a jour le 26 Novembre 2025 par Claude Code
          </p>
        </section>
      </div>
    </div>
  );
}

export default ManualPage;
