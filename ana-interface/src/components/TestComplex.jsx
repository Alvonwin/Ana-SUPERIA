
import React, { useState, useEffect } from 'react';
import './TestComplex.css';

function TestComplex() {
  const [counter, setCounter] = useState(0);
  const [input, setInput] = useState('');
  const [errors, setErrors] = useState({});
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    let interval = setInterval(() => {
      setCounter(counter + 1);
    }, 1000);
    setTimer(interval);
    return () => clearInterval(interval);
  }, [counter]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const newErrors = {};
    if (!input) {
      newErrors.input = 'Input est requis';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Soumettre le formulaire
      console.log('Formulaire soumis');
    }
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  return (
    <div className='grid-container'>
      <h1>Compteur : {counter}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          value={input}
          onChange={handleInputChange}
          placeholder='Entrez quelque chose'
        />
        {errors.input && <div className='error'>{errors.input}</div>}
        <button type='submit' className='btn-submit'>
          Soumettre
        </button>
      </form>
      <button className='btn-reset' onClick={() => setCounter(0)}>
        Réinitialiser
      </button>
    </div>
  );
}

export default TestComplex;
