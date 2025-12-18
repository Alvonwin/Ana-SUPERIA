import React, { useState } from 'react';
import './TestButton.css';
// Features: click-event

// Bouton de test
export default function TestButton() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="testbutton-container">
      <h1>Test Button</h1>
      {/* TODO: Implémenter Bouton de test */}
      <p>Page en construction...</p>
    </div>
  );
}
