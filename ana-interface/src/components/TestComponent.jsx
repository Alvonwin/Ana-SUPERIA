import React, { useState } from 'react';
import './TestComponent.css';


// undefined
export default function TestComponent() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="testcomponent-container">
      <h1>Test Component</h1>
      {/* TODO: Implémenter undefined */}
      <p>Page en construction...</p>
    </div>
  );
}
