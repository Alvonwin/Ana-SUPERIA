const fs = require('fs');

const filePath = 'E:/ANA/server/intelligence/semantic-router.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldKeywords = `'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'temps fait', 'température', 'weather',`;
const newKeywords = `'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'temps fait', 'température', 'weather',
      'whois', 'dns', 'dns lookup', 'ip publique', 'public ip', 'check_url', 'http_request', 'web_fetch',`;

if (content.includes("'whois'")) {
  console.log('SKIP: Keywords already added');
} else if (content.includes(oldKeywords)) {
  content = content.replace(oldKeywords, newKeywords);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Router keywords added!');
} else {
  console.log('ERROR: Old keywords not found');
}
