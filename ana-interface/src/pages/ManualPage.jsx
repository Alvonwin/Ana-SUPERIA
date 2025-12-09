/**
 * ManualPage.jsx - Mode d'emploi Ana SUPERIA
 * Version: 2.0 - Date: 6 Decembre 2025
 */

import { useState } from 'react';
import {
  IconBook, IconMessageSquare, IconBrain, IconMic, IconCode2, IconSearch,
  IconLayoutDashboard, IconThumbsUp, IconPalette, IconWorkflow, IconSettings,
  IconFileText, IconMaximize, IconChevronDown, IconChevronRight, IconZap, IconAlertTriangle
} from '../components/Icons';
import './ManualPage.css';

const MANUAL_SECTIONS = [
  { id: 'quick-start', icon: IconZap, title: 'Demarrage Rapide', description: 'Commencer avec Ana en 2 minutes' },
  { id: 'chat', icon: IconMessageSquare, title: 'Chat', description: 'Interface de conversation principale' },
  { id: 'brains', icon: IconBrain, title: 'Cerveaux', description: 'Gestion des 12 modeles IA' },
  { id: 'voice', icon: IconMic, title: 'Mode Vocal', description: 'Conversation vocale bidirectionnelle' },
  { id: 'coding', icon: IconCode2, title: 'Editeur Code', description: 'Editeur Monaco avec execution' },
  { id: 'memory', icon: IconSearch, title: 'Recherche Memoire', description: 'Recherche dans les conversations' },
  { id: 'dashboard', icon: IconLayoutDashboard, title: 'Dashboard', description: 'Vue systeme en temps reel' },
  { id: 'feedback', icon: IconThumbsUp, title: 'Feedback', description: 'Apprentissage et patterns' },
  { id: 'comfyui', icon: IconPalette, title: 'ComfyUI', description: 'Generation images et videos' },
  { id: 'n8n', icon: IconWorkflow, title: 'n8n', description: 'Automatisation workflows' },
  { id: 'upscaler', icon: IconMaximize, title: 'Upscaler', description: 'Agrandissement images' },
  { id: 'settings', icon: IconSettings, title: 'Parametres', description: 'Configuration Ana' },
  { id: 'logs', icon: IconFileText, title: 'Logs', description: 'Journaux systeme' },
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
      'quick-start': { title: 'Bienvenue dans Ana SUPERIA!', text: 'Ana est ton assistante IA locale avec 12 cerveaux.', steps: ['Lancer Ana - Double-clic sur START_ANA.bat', 'Ouvrir http://localhost:3339', 'Commencer a discuter'] },
      'chat': { title: 'Page Chat', text: 'Interface principale pour discuter avec Ana.', features: ['Envoi de messages - Enter pour envoyer', 'Mode streaming - Reponses temps reel', 'Upload fichiers - Images et documents', 'TTS - Ana lit ses reponses', 'Mode vocal - Bouton micro'] },
      'brains': { title: 'Page Cerveaux', text: '12 modeles IA disponibles.', providers: [['Ollama','Local','DeepSeek, Phi-3, Qwen, Llama Vision'],['GROQ','Cloud','Llama, Mixtral'],['CEREBRAS','Cloud','Llama 1000 tok/s']] },
      'voice': { title: 'Mode Vocal', text: 'Conversation vocale bidirectionnelle.', features: ['Microphone - Clic pour parler', 'Mode conversation - Boucle vocale continue', 'TTS - Ana lit a voix haute', 'Parametres: langue, vitesse, voix'] },
      'coding': { title: 'Editeur de Code', text: 'Editeur Monaco avec execution.', features: ['Ouvrir/Sauvegarder fichiers', 'Formater avec Prettier', 'Executer le code', 'Langages: JS, Python, Java, C++, Go, Rust'] },
      'memory': { title: 'Recherche Memoire', text: 'Cherche dans toutes les conversations.', filters: ['Repertoire', 'Periode', 'Type', 'Projet', 'Tags'] },
      'dashboard': { title: 'Dashboard', text: 'Vue systeme en temps reel.', cards: ['Ana Core status', 'LLM Actif', 'Memoire KB', 'Agents Actifs'] },
      'feedback': { title: 'Feedback & Apprentissage', text: 'Systeme d apprentissage base sur tes retours.', sections: ['Stats positifs/negatifs', 'Bons Patterns', 'Anti-patterns'] },
      'comfyui': { title: 'ComfyUI - Generation IA', text: 'Generation images et videos.', modes: [['Text to Image','Prompt vers image'],['Image to Image','Transforme une image'],['AnimateDiff','Animation GIF'],['Mochi Video','Video IA']] },
      'n8n': { title: 'n8n - Automatisation', text: '400+ integrations disponibles.', templates: ['Agents Monitor', 'Email Alerts', 'Backup Auto'] },
      'upscaler': { title: 'Image Upscaler', text: 'Agrandit images avec RealESRGAN.', models: [['RealESRGAN x2','2x'],['RealESRGAN x4','4x'],['UltraSharp','4x']] },
      'settings': { title: 'Parametres', text: 'Configuration globale.', sections: ['Apparence - Theme clair/sombre', 'Voix - TTS on/off', 'LLM - Modele par defaut', 'Notifications'] },
      'logs': { title: 'Logs Systeme', text: 'Surveillance en temps reel.', levels: [['INFO','Bleu','Information'],['WARN','Orange','Avertissement'],['ERROR','Rouge','Erreur critique']] },
      'troubleshooting': { title: 'Depannage', text: 'Solutions aux problemes courants.', issues: [['Page blanche','Lance START_ANA.bat'],['Pas de LLM','ollama serve'],['Vocal KO','Chrome ou Edge requis']] }
    };

    const c = contents[sectionId] || { title: 'Section', text: 'En cours...' };

    return (
      <div className="section-content">
        <h3>{c.title}</h3>
        <p>{c.text}</p>
        {c.steps && <div className="quick-steps">{c.steps.map((s,i) => <div key={i} className="step"><span className="step-number">{i+1}</span><p>{s}</p></div>)}</div>}
        {c.features && <ul>{c.features.map((f,i) => <li key={i}>{f}</li>)}</ul>}
        {c.providers && <table className="info-table"><thead><tr><th>Provider</th><th>Type</th><th>Modeles</th></tr></thead><tbody>{c.providers.map((p,i) => <tr key={i}><td>{p[0]}</td><td>{p[1]}</td><td>{p[2]}</td></tr>)}</tbody></table>}
        {c.filters && <ul>{c.filters.map((f,i) => <li key={i}>{f}</li>)}</ul>}
        {c.cards && <ul>{c.cards.map((f,i) => <li key={i}>{f}</li>)}</ul>}
        {c.sections && <ul>{c.sections.map((f,i) => <li key={i}>{f}</li>)}</ul>}
        {c.modes && <table className="info-table"><thead><tr><th>Mode</th><th>Description</th></tr></thead><tbody>{c.modes.map((m,i) => <tr key={i}><td>{m[0]}</td><td>{m[1]}</td></tr>)}</tbody></table>}
        {c.templates && <ul>{c.templates.map((t,i) => <li key={i}>{t}</li>)}</ul>}
        {c.models && <table className="info-table"><thead><tr><th>Modele</th><th>Facteur</th></tr></thead><tbody>{c.models.map((m,i) => <tr key={i}><td>{m[0]}</td><td>{m[1]}</td></tr>)}</tbody></table>}
        {c.levels && <table className="info-table"><thead><tr><th>Niveau</th><th>Couleur</th><th>Signification</th></tr></thead><tbody>{c.levels.map((l,i) => <tr key={i}><td>{l[0]}</td><td>{l[1]}</td><td>{l[2]}</td></tr>)}</tbody></table>}
        {c.issues && <table className="troubleshooting-table"><thead><tr><th>Probleme</th><th>Solution</th></tr></thead><tbody>{c.issues.map((is,i) => <tr key={i}><td>{is[0]}</td><td>{is[1]}</td></tr>)}</tbody></table>}
      </div>
    );
  };

  const filteredSections = MANUAL_SECTIONS.filter(s => searchQuery === '' || s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="manual-page">
      <header className="manual-header">
        <div className="header-title"><IconBook size={32} /><div><h1>Mode d Emploi Ana SUPERIA</h1><p className="subtitle">Documentation complete</p></div></div>
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
      <footer className="manual-footer"><p>Ana SUPERIA v1.0.0 - Doc mise a jour le 6 decembre 2025</p></footer>
    </div>
  );
}

export default ManualPage;
