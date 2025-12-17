import React, { useState } from 'react';
import './Button.css';
// Features: hover

// Composant Button avec effet hover
export default function Button() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="button-container">
      <h1>Button</h1>
      {/* TODO: Implémenter Composant Button avec effet hover */}
      <p>Page en construction...</p>
    </div>
  );
}
