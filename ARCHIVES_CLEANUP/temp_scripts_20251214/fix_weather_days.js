/**
 * Fix weather forecast - calcule les vrais jours de la semaine
 */
const fs = require('fs');

const file = 'E:/ANA/server/tools/web-tools.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Backup
fs.writeFileSync(file + '.backup_20251208_weather_fix', content, 'utf8');
console.log('Backup created');

const old = `      // Ajouter prévisions si disponibles
      if (data.weather && data.weather.length > 0) {
        result.forecast = data.weather.slice(0, 3).map(day => ({
          date: day.date,
          maxTemp: day.maxtempC + '°C',
          minTemp: day.mintempC + '°C',
          description: day.hourly?.[4]?.lang_fr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || 'N/A',
          chanceOfRain: day.hourly?.[4]?.chanceofrain + '%'
        }));
      }`;

const replacement = `      // Ajouter prévisions si disponibles - avec noms de jours corrects (FIX 2025-12-08)
      if (data.weather && data.weather.length > 0) {
        const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

        result.forecast = data.weather.slice(0, 3).map(day => {
          // Calculer le vrai jour de la semaine à partir de la date YYYY-MM-DD
          const dateObj = new Date(day.date + 'T12:00:00');
          const jourNom = joursSemaine[dateObj.getDay()];
          const jourNum = dateObj.getDate();
          const mois = dateObj.toLocaleDateString('fr-CA', { month: 'long' });

          return {
            date: day.date,
            jour: \`\${jourNom} \${jourNum} \${mois}\`,  // ex: "lundi 9 décembre"
            maxTemp: day.maxtempC + '°C',
            minTemp: day.mintempC + '°C',
            description: day.hourly?.[4]?.lang_fr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || 'N/A',
            chanceOfRain: day.hourly?.[4]?.chanceofrain + '%'
          };
        });
      }`;

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[FIX] Weather forecast days - APPLIED');
} else {
  console.log('[FIX] Pattern not found - checking...');
  if (content.includes('result.forecast = data.weather.slice')) {
    console.log('Found forecast code but pattern differs');
  }
}
