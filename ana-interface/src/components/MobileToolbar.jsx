import { IconMenu } from './Icons';
import './MobileToolbar.css';

function MobileToolbar({ onMenuClick }) {
  return (
    <header className="mobile-toolbar">
      <button
        className="hamburger-btn"
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
      >
        <IconMenu size={24} />
      </button>
      <h1 className="mobile-logo">ANA</h1>
      <span className="mobile-subtitle">SUPERIA</span>
    </header>
  );
}

export default MobileToolbar;
