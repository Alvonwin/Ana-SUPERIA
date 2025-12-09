import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  IconMessageSquare,
  IconCode2,
  IconSearch,
  IconLayoutDashboard,
  IconBookOpen,
  IconSettings,
  IconWorkflow,
  IconPalette,
  IconFileText,
  IconMic,
  IconBrain,
  IconMaximize,
  IconThumbsUp,
  IconX
} from './components/Icons';
import { Toaster } from 'sonner';
import MobileToolbar from './components/MobileToolbar';
import Backdrop from './components/Backdrop';
import './App.css';

// Pages
import ChatPage from './pages/ChatPage';
import CodingPage from './pages/CodingPage';
import MemorySearchPage from './pages/MemorySearchPage';
import DashboardPage from './pages/DashboardPage';
import ManualPage from './pages/ManualPage';
import ComfyUIPage from './pages/ComfyUIPage';
import N8nPage from './pages/n8nPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';
import VoicePage from './pages/VoicePage';
import BrainsPage from './pages/BrainsPage';
import UpscalerPage from './pages/UpscalerPage';
import FeedbackPage from './pages/FeedbackPage';

// Hooks
import { useServiceManager } from './hooks/useServiceManager';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  // Fermer le menu quand on navigue (mobile)
  const handleNavClick = () => {
    onClose();
  };

  const mainPages = [
    { path: '/', icon: IconMessageSquare, label: 'Chat', color: '#3498db' },
    { path: '/brains', icon: IconBrain, label: 'Cerveaux', color: '#8b5cf6' },
    { path: '/coding', icon: IconCode2, label: 'Coding', color: '#2ecc71' },
    { path: '/memory', icon: IconSearch, label: 'Mémoire', color: '#9b59b6' },
    { path: '/dashboard', icon: IconLayoutDashboard, label: 'Dashboard', color: '#e74c3c' },
    { path: '/manual', icon: IconBookOpen, label: 'Manuel', color: '#f39c12' },
  ];

  const additionalPages = [
    { path: '/voice', icon: IconMic, label: 'Voice' },
    { path: '/settings', icon: IconSettings, label: 'Settings' },
    { path: '/workflows', icon: IconWorkflow, label: 'Workflows' },
    { path: '/images', icon: IconPalette, label: 'Images' },
    { path: '/upscaler', icon: IconMaximize, label: 'Upscaler' },
    { path: '/logs', icon: IconFileText, label: 'Logs' },
    { path: '/feedback', icon: IconThumbsUp, label: 'Feedback' },
  ];

  return (
    <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <h1>ANA</h1>
        <p className="sidebar-subtitle">SUPERIA</p>
        {/* Bouton fermer visible uniquement sur mobile quand ouvert */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fermer le menu">
          <IconX size={24} />
        </button>
      </div>

      <div className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Principal</div>
          {mainPages.map((page) => {
            const Icon = page.icon;
            const isActive = location.pathname === page.path;
            return (
              <Link
                key={page.path}
                to={page.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ '--item-color': page.color }}
                onClick={handleNavClick}
              >
                <Icon size={20} />
                <span>{page.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Outils</div>
          {additionalPages.map((page) => {
            const Icon = page.icon;
            const isActive = location.pathname === page.path;
            return (
              <Link
                key={page.path}
                to={page.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Icon size={20} />
                <span>{page.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="memory-indicator">
          <div className="memory-dot"></div>
          <span>Mémoire active</span>
        </div>
      </div>
    </nav>
  );
}

function AppLayout() {
  const location = useLocation();
  const { ensureServicesForPage } = useServiceManager();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Watch for route changes and ensure required services are running
  useEffect(() => {
    console.log('[App] Route changed to:', location.pathname);
    ensureServicesForPage(location.pathname);
  }, [location.pathname, ensureServicesForPage]);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      <Toaster richColors position="top-right" />

      {/* Toolbar mobile - visible uniquement sur mobile */}
      <MobileToolbar onMenuClick={openSidebar} />

      {/* Backdrop - visible uniquement quand sidebar ouverte sur mobile */}
      {sidebarOpen && <Backdrop onClick={closeSidebar} />}

      {/* Sidebar - fixe sur desktop, slide-in sur mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/brains" element={<BrainsPage />} />
          <Route path="/coding" element={<CodingPage />} />
          <Route path="/memory" element={<MemorySearchPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/manual" element={<ManualPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/workflows" element={<N8nPage />} />
          <Route path="/images" element={<ComfyUIPage />} />
          <Route path="/upscaler" element={<UpscalerPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
