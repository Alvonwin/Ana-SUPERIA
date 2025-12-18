import React, { useState } from 'react';
import './Counter.css';
// Features: useState, increment, decrement

// Compteur avec increment et decrement
export default function Counter() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="counter-container">
      <h1>Counter</h1>
      {/* TODO: Implémenter Compteur avec increment et decrement */}
      <p>Page en construction...</p>
    </div>
  );
}
