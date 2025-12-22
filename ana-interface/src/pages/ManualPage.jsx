/**
 * ManualPage.jsx - Mode d'emploi Ana SUPERIA
 * Version: 3.0 - Date: 20 Decembre 2025
 */

import { useState } from 'react';
import {
  IconBook, IconMessageSquare, IconBrain, IconMic, IconCode2, IconSearch,
  IconLayoutDashboard, IconThumbsUp, IconPalette, IconWorkflow, IconSettings,
  IconFileText, IconMaximize, IconChevronDown, IconChevronRight, IconZap, IconAlertTriangle,
  IconUpload, IconVolume
} from '../components/Icons';
import './ManualPage.css';

const MANUAL_SECTIONS = [
  { id: 'quick-start', icon: IconZap, title: 'Demarrage Rapide', description: 'Commencer avec Ana en 2 minutes' },
  { id: 'chat', icon: IconMessageSquare, title: 'Chat', description: 'Interface de conversation principale' },
  { id: 'brain', icon: IconBrain, title: 'Modele IA', description: 'Cerebras llama-3.3-70b' },
  { id: 'voice', icon: IconMic, title: 'Mode Vocal', description: 'Conversation vocale avec TTS Sylvie' },
  { id: 'games', icon: IconZap, title: 'Jeux', description: '12 jeux contre Ana ou 2 joueurs' },
  { id: 'coding', icon: IconCode2, title: 'Editeur Code', description: 'Editeur Monaco avec execution' },
  { id: 'memory', icon: IconSearch, title: 'Recherche Memoire', description: 'Recherche dans les conversations' },
  { id: 'dashboard', icon: IconLayoutDashboard, title: 'Dashboard', description: 'Vue systeme en temps reel' },
  { id: 'feedback', icon: IconThumbsUp, title: 'Feedback', description: 'Apprentissage et patterns' },
  { id: 'comfyui', icon: IconPalette, title: 'ComfyUI', description: 'Generation images et videos' },
  { id: 'settings', icon: IconSettings, title: 'Parametres', description: 'Configuration Ana' },
  { id: 'troubleshooting', icon: IconAlertTriangle, title: 'Depannage', description: 'Problemes courants' }
];

function ManualPage() {
  const [expandedSections, setExpandedSections] = useState(['quick-start']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!expandedSections.includes(sectionId)) setExpandedSections(prev => [...prev, sectionId]);
    }
  };

  const isExpanded = (sectionId) => expandedSections.includes(sectionId);

  const renderSectionContent = (sectionId) => {
    const contents = {
      'quick-start': {
        title: 'Bienvenue dans Ana SUPERIA!',
        text: 'Ana est ton assistante IA personnelle utilisant Cerebras llama-3.3-70b avec 180+ outils.',
        steps: [
          'Lancer Ana - Double-clic sur START_ANA.bat',
          'Ouvrir http://localhost:5173',
          'Commencer a discuter!'
        ]
      },
      'chat': {
        title: 'Page Chat',
        text: 'Interface principale pour discuter avec Ana. Supporte le streaming temps reel.',
        features: [
          'Envoi de messages - Enter pour envoyer, Shift+Enter nouvelle ligne',
          'Mode streaming - Reponses en temps reel',
          'Upload fichiers - Images, PDF, code, documents (64 extensions)',
          'TTS - Ana lit ses reponses avec voix Sylvie (Quebec)',
          'Bouton Play/Pause - Lecture audio avec pause/reprise',
          'Mode vocal - Conversation mains-libres',
          'Feedback - Pouces haut/bas pour ameliorer Ana'
        ]
      },
      'brain': {
        title: 'Modele IA',
        text: 'Ana utilise exclusivement Cerebras llama-3.3-70b.',
        features: [
          'Provider: Cerebras Cloud',
          'Modele: llama-3.3-70b',
          'Tier gratuit illimite',
          'Appel d\'outils natif',
          'Temperature: 0.7',
          'Max tokens: 4096'
        ]
      },
      'voice': {
        title: 'Mode Vocal',
        text: 'Conversation vocale bidirectionnelle avec synthese vocale Sylvie (Quebec).',
        features: [
          'TTS Edge - Voix Sylvie (Quebec) haute qualite',
          'Bouton Play/Pause - Pause et reprise de la lecture',
          'Vitesse ajustable - 0.8x, 1x, 1.2x',
          'Mode boucle vocale - Conversation continue',
          'Recognition vocale - Chrome/Edge requis'
        ]
      },
      'games': {
        title: 'Jeux',
        text: '12 jeux disponibles. Mode vs Ana (IA) ou 2 joueurs.',
        features: [
          'Dames - Jeu de dames classique',
          'Echecs - Echecs complet avec IA',
          'Puissance 4 - Alignez 4 jetons',
          'Morpion - Tic-tac-toe',
          'Bataille navale - Coulez les navires',
          'Backgammon - Jeu de plateau',
          'Blackjack - Jeu de cartes 21',
          'Memory - Jeu de memoire',
          'Pendu - Devinez le mot',
          'Pierre-Feuille-Ciseaux',
          'Nim - Jeu de strategie',
          'Devine le nombre'
        ]
      },
      'coding': {
        title: 'Editeur de Code',
        text: 'Editeur Monaco (VS Code) avec execution de code.',
        features: [
          'Ouvrir/Sauvegarder fichiers locaux',
          'Coloration syntaxique',
          'Formater avec Prettier',
          'Executer le code',
          'Langages: JavaScript, Python, Java, C++, Go, Rust, etc.'
        ]
      },
      'memory': {
        title: 'Recherche Memoire',
        text: 'Recherche semantique dans toutes les conversations avec ChromaDB.',
        features: [
          'Recherche par mots-cles',
          'Recherche semantique (embeddings)',
          'Filtres: date, type, projet',
          'Memoire persistante',
          'Consolidation nocturne'
        ]
      },
      'dashboard': {
        title: 'Dashboard',
        text: 'Vue systeme en temps reel.',
        features: [
          'Status Ana Core',
          'LLM actif (Cerebras)',
          'Memoire utilisee',
          'Agents autonomes',
          'Statistiques conversations'
        ]
      },
      'feedback': {
        title: 'Feedback & Apprentissage',
        text: 'Systeme d\'apprentissage base sur tes retours.',
        features: [
          'Pouces haut/bas sur chaque reponse',
          'Stats positifs/negatifs',
          'Bons patterns identifies',
          'Anti-patterns a eviter',
          'Amelioration continue'
        ]
      },
      'comfyui': {
        title: 'ComfyUI - Generation IA',
        text: 'Generation d\'images et videos via ComfyUI sur port 8188.',
        modes: [
          ['Text to Image', 'Genere une image a partir d\'un prompt'],
          ['Image to Image', 'Transforme une image existante'],
          ['Upscale', 'Agrandit une image']
        ]
      },
      'settings': {
        title: 'Parametres',
        text: 'Configuration globale d\'Ana.',
        features: [
          'Theme - Clair/sombre',
          'Voix TTS - On/Off, vitesse',
          'Notifications',
          'Prompt systeme personnalisable'
        ]
      },
      'troubleshooting': {
        title: 'Depannage',
        text: 'Solutions aux problemes courants.',
        issues: [
          ['Page blanche', 'Lancer START_ANA.bat'],
          ['Pas de reponse', 'Verifier cle CEREBRAS_API_KEY dans .env'],
          ['TTS ne fonctionne pas', 'Verifier le backend sur port 3338'],
          ['Pause audio KO', 'Utiliser Chrome ou Edge'],
          ['Jeux bugges', 'Recharger la page (F5)']
        ]
      }
    };

    const c = contents[sectionId] || { title: 'Section', text: 'En cours...' };

    return (
      <div className="section-content">
        <h3>{c.title}</h3>
        <p>{c.text}</p>
        {c.steps && <div className="quick-steps">{c.steps.map((s,i) => <div key={i} className="step"><span className="step-number">{i+1}</span><p>{s}</p></div>)}</div>}
        {c.features && <ul>{c.features.map((f,i) => <li key={i}>{f}</li>)}</ul>}
        {c.modes && <table className="info-table"><thead><tr><th>Mode</th><th>Description</th></tr></thead><tbody>{c.modes.map((m,i) => <tr key={i}><td>{m[0]}</td><td>{m[1]}</td></tr>)}</tbody></table>}
        {c.issues && <table className="troubleshooting-table"><thead><tr><th>Probleme</th><th>Solution</th></tr></thead><tbody>{c.issues.map((is,i) => <tr key={i}><td>{is[0]}</td><td>{is[1]}</td></tr>)}</tbody></table>}
      </div>
    );
  };

  const filteredSections = MANUAL_SECTIONS.filter(s => searchQuery === '' || s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="manual-page">
      <header className="manual-header">
        <div className="header-title"><IconBook size={32} /><div><h1>Mode d'emploi Ana SUPERIA</h1><p className="subtitle">Documentation complete</p></div></div>
        <div className="header-search"><input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
      </header>
      <div className="manual-layout">
        <nav className="manual-toc"><h3>Table des matieres</h3>
          <ul>{MANUAL_SECTIONS.map(s => { const Icon = s.icon; return <li key={s.id} className={isExpanded(s.id)?'active':''} onClick={() => scrollToSection(s.id)}><Icon size={16}/><span>{s.title}</span></li>; })}</ul>
        </nav>
        <main className="manual-content">
          {filteredSections.map(s => {
            const Icon = s.icon;
            const expanded = isExpanded(s.id);
            return (
              <section key={s.id} id={s.id} className="manual-section">
                <div className={"section-header " + (expanded?'expanded':'')} onClick={() => toggleSection(s.id)}>
                  <div className="section-title"><Icon size={24}/><div><h2>{s.title}</h2><p>{s.description}</p></div></div>
                  <div className="section-toggle">{expanded ? <IconChevronDown size={20}/> : <IconChevronRight size={20}/>}</div>
                </div>
                {expanded && <div className="section-body">{renderSectionContent(s.id)}</div>}
              </section>
            );
          })}
          {filteredSections.length === 0 && <div className="no-results"><p>Aucun resultat</p></div>}
        </main>
      </div>
      <footer className="manual-footer"><p>Ana SUPERIA - Documentation mise a jour le 20 decembre 2025</p></footer>
    </div>
  );
}

export default ManualPage;
