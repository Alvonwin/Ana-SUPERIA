const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3338/api/chat/v2';
const TEMP = 'E:/ANA/temp';

const questions = {
  'web_search': 'Cherche sur le web: météo Québec',
  'get_weather': 'Quel temps fait-il à Montréal?',
  'get_time': 'Quelle heure est-il?',
  'read_file': 'Lis E:/ANA/temp/LISTE_181_OUTILS.txt',
  'file_info': 'Info sur E:/ANA/temp/LISTE_181_OUTILS.txt',
  'list_files': 'Liste les fichiers dans E:/ANA/temp/',
  'write_file': 'Écris "test" dans E:/ANA/temp/test.txt',
  'get_cpu_usage': 'Quel est l\'usage CPU?',
  'get_memory_usage': 'Quelle est l\'utilisation RAM?',
  'git_status': 'Statut git dans E:/ANA?',
  '_default': (nom) => `Utilise l'outil ${nom}`
};

async function tester(outil, i, total) {
  const q = questions[outil] || questions._default(outil);
  console.log(`\n[${i}/${total}] ${outil}`);
  console.log(`   Q: ${q}`);
  
  try {
    const debut = Date.now();
    const r = await axios.post(API, {message: q}, {timeout: 30000});
    const duree = Date.now() - debut;
    
    if (r.data && r.data.success) {
      console.log(`   ✅ ${duree}ms - ${r.data.model}`);
      console.log(`   ${r.data.response.substring(0, 80)}...`);
      return {outil, statut: 'ok', duree};
    }
    console.log(`   ❌ Pas de réponse`);
    return {outil, statut: 'fail'};
  } catch (e) {
    console.log(`   ❌ ${e.message}`);
    return {outil, statut: 'error', erreur: e.message};
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST 181 OUTILS');
  console.log('='.repeat(60));
  
  const resultats = [];
  let reussis = 0;
  
  for (let g = 1; g <= 5; g++) {
    console.log(`\n>>> GROUPE ${g}`);
    const outils = fs.readFileSync(path.join(TEMP, `GROUPE_${g}_OUTILS.txt`), 'utf8')
      .split('\n').map(l => l.trim()).filter(l => l);
    
    for (let i = 0; i < outils.length; i++) {
      const r = await tester(outils[i], i+1, outils.length);
      resultats.push(r);
      if (r.statut === 'ok') reussis++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`RÉSULTAT: ${reussis}/${resultats.length} = ${(reussis/resultats.length*100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  fs.writeFileSync(path.join(TEMP, 'RESULTATS_181.json'), JSON.stringify(resultats, null, 2));
}

main().catch(console.error);
