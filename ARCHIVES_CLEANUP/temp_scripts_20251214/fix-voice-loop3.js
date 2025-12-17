const fs = require('fs');

const file = 'E:/ANA/ana-interface/src/pages/ChatPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Trouver et remplacer dans handleVoiceLoopTranscript uniquement
const oldCode = `    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Envoyer via socket
    if (socket) {
      socket.emit('chat:message', {
        message: transcript.trim(),
        contextLines: 20
      });
      soundSystem.play('message-sent');
    }
  }, [socket, isLoading]);`;

const newCode = `    // Ajouter message Ana vide avec streaming:true
    const anaMsg = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMsg, anaMsg]);
    setIsLoading(true);

    // Envoyer via socket
    if (socket) {
      socket.emit('chat:message', {
        message: transcript.trim(),
        contextLines: 20
      });
      soundSystem.play('message-sent');
    }
  }, [socket, isLoading]);`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(file, content);
  console.log('Fix applied successfully');
} else {
  console.log('Pattern not found - checking for variations...');

  // Essayer avec des variations de fin de ligne
  const oldCodeCRLF = oldCode.replace(/\n/g, '\r\n');
  if (content.includes(oldCodeCRLF)) {
    content = content.replace(oldCodeCRLF, newCode.replace(/\n/g, '\r\n'));
    fs.writeFileSync(file, content);
    console.log('Fix applied (CRLF)');
  } else {
    console.log('Could not find pattern');
  }
}
