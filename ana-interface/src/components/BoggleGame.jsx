import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../config';

const GAME_DURATION = 180;

export default function BoggleGame() {
  const [grid, setGrid] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [word, setWord] = useState('');
  const [score, setScore] = useState(0);
  const [foundWords, setFoundWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const startGame = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/games/boggle/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.grid) {
        setGrid(data.grid);
        setSessionId(data.sessionId);
        setScore(0);
        setFoundWords([]);
        setTimeLeft(GAME_DURATION);
        setGameOver(false);
        setMessage('Trouve des mots!');
      }
    } catch (err) {
      setMessage('Erreur serveur');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver && grid.length > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      setGameOver(true);
      setMessage(`Temps ecoulé! Score: ${score}`);
    }
  }, [timeLeft, gameOver, grid.length, score]);

  const submitWord = async (e) => {
    e.preventDefault();
    if (!word.trim() || gameOver || !sessionId) return;
    const upperWord = word.toUpperCase();
    if (foundWords.includes(upperWord)) {
      setMessage('Déjà trouvé!');
      setWord('');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/games/boggle/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, word: upperWord })
      });
      const data = await res.json();
      if (data.isValid) {
        setScore(data.score);
        setFoundWords([...foundWords, upperWord]);
        const pts = upperWord.length > 4 ? upperWord.length - 3 : 1;
        setMessage(`+${pts} pts!`);
      } else {
        setMessage('Mot invalide');
      }
    } catch (err) {
      setMessage('Erreur');
    }
    setWord('');
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => { startGame(); }, [startGame]);

  const s = {
    container: { display:'flex', flexDirection:'column', alignItems:'center', padding:'20px', color:'#fff', minHeight:'500px' },
    header: { display:'flex', justifyContent:'space-between', width:'100%', maxWidth:'350px', marginBottom:'20px' },
    timer: { fontSize:'2rem', fontWeight:'bold', color: timeLeft < 30 ? '#ff4444' : '#4ecdc4', textShadow:'0 0 10px currentColor' },
    score: { fontSize:'1.5rem', color:'#ffd93d', fontWeight:'bold' },
    grid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'20px', padding:'15px', background:'linear-gradient(135deg,#1a1a2e,#16213e)', borderRadius:'15px', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' },
    cell: { width:'60px', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', fontWeight:'bold', background:'linear-gradient(145deg,#2d3436,#1e272e)', borderRadius:'10px', color:'#fff', border:'2px solid #4ecdc4' },
    form: { display:'flex', gap:'10px', marginBottom:'15px' },
    input: { padding:'12px 20px', fontSize:'1.2rem', borderRadius:'25px', border:'none', background:'#2d3436', color:'#fff', width:'200px', textTransform:'uppercase', outline:'none' },
    button: { padding:'12px 25px', fontSize:'1rem', fontWeight:'bold', borderRadius:'25px', border:'none', background:'linear-gradient(135deg,#4ecdc4,#44a08d)', color:'#fff', cursor:'pointer' },
    message: { fontSize:'1.2rem', marginBottom:'15px', color:'#4ecdc4', minHeight:'30px' },
    wordsList: { display:'flex', flexWrap:'wrap', gap:'8px', maxWidth:'400px', justifyContent:'center' },
    wordTag: { background:'#4ecdc4', color:'#1a1a2e', padding:'5px 12px', borderRadius:'15px', fontSize:'0.9rem', fontWeight:'bold' },
    newBtn: { marginTop:'20px', padding:'15px 30px', fontSize:'1.1rem', background:'linear-gradient(135deg,#ff6b6b,#ee5a24)', border:'none', borderRadius:'25px', color:'#fff', fontWeight:'bold', cursor:'pointer' }
  };

  if (loading && grid.length === 0) return <div style={s.container}><p>Chargement...</p></div>;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.timer}>{formatTime(timeLeft)}</div>
        <div style={s.score}>Score: {score}</div>
      </div>
      <div style={s.grid}>
        {grid.flat ? grid.flat().map((letter, i) => (
          <div key={i} style={s.cell}>{letter}</div>
        )) : Array(16).fill('').map((_, i) => <div key={i} style={s.cell}>?</div>)}
      </div>
      <p style={s.message}>{message}</p>
      {!gameOver ? (
        <form onSubmit={submitWord} style={s.form}>
          <input type="text" value={word} onChange={(e) => setWord(e.target.value)} placeholder="Tape un mot..." style={s.input} autoFocus />
          <button type="submit" style={s.button}>Valider</button>
        </form>
      ) : (
        <button onClick={startGame} style={s.newBtn}>Nouvelle Partie</button>
      )}
      {foundWords.length > 0 && (
        <div style={s.wordsList}>
          {foundWords.map((w, i) => <span key={i} style={s.wordTag}>{w}</span>)}
        </div>
      )}
    </div>
  );
}
