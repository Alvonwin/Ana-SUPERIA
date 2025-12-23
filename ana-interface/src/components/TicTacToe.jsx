
import React, { useState } from 'react';

const TicTacToe = () => {
  const [grille, setGrille] = useState([
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ]);
  const [tour, setTour] = useState('X');
  const [gagnant, setGagnant] = useState(null);

  const handleClic = (ligne, colonne) => {
    if (grille[ligne][colonne] === '') {
      const nouvelleGrille = [...grille];
      nouvelleGrille[ligne][colonne] = tour;
      setGrille(nouvelleGrille);
      setTour(tour === 'X' ? 'O' : 'X');
      verifierGagnant(nouvelleGrille);
    }
  };

  const verifierGagnant = (grille) => {
    // Vérifier les lignes
    for (let i = 0; i < 3; i++) {
      if (grille[i][0] === grille[i][1] && grille[i][1] === grille[i][2] && grille[i][0] !== '') {
        setGagnant(grille[i][0]);
        return;
      }
    }
    // Vérifier les colonnes
    for (let i = 0; i < 3; i++) {
      if (grille[0][i] === grille[1][i] && grille[1][i] === grille[2][i] && grille[0][i] !== '') {
        setGagnant(grille[0][i]);
        return;
      }
    }
    // Vérifier les diagonales
    if (grille[0][0] === grille[1][1] && grille[1][1] === grille[2][2] && grille[0][0] !== '') {
      setGagnant(grille[0][0]);
      return;
    }
    if (grille[0][2] === grille[1][1] && grille[1][1] === grille[2][0] && grille[0][2] !== '') {
      setGagnant(grille[0][2]);
      return;
    }
  };

  return (
    <div>
      <h1>Tic Tac Toe</h1>
      {gagnant ? (
        <p>Le gagnant est {gagnant} !</p>
      ) : (
        <p>À {tour} de jouer</p>
      )}
      <div className='grille'>
        {grille.map((ligne, indexLigne) => (
          <div key={indexLigne} className='ligne'>
            {ligne.map((case_, indexColonne) => (
              <div key={indexColonne} className='case' onClick={() => handleClic(indexLigne, indexColonne)}>
                {case_}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicTacToe;
