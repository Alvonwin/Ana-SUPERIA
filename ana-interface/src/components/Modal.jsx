import React, { useState } from 'react';
import './Modal.css';
// Features: fermeture

// Composant Modal avec bouton de fermeture
export default function Modal() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="modal-container">
      <h1>Modal</h1>
      {/* TODO: Implémenter Composant Modal avec bouton de fermeture */}
      <p>Page en construction...</p>
    </div>
  );
}
