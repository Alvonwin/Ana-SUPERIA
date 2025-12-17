const fs = require('fs');

const filePath = 'E:/ANA/server/tools/web-tools.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldWeatherCode = `  static async weather(location, options = {}) {
    const { lang = 'fr', format = 'j1' } = options;

    if (!location || location.trim().length < 2) {
      return {
        success: false,
        error: 'Location required (minimum 2 characters)'
      };
    }

    try {
      console.log(\`🌤️ [WebTools] Météo: "\${location}"\`);

      // wttr.in API - format j1 = JSON compact
      const url = \`https://wttr.in/\${encodeURIComponent(location)}?format=\${format}&lang=\${lang}\`;

      const response = await axios.get(url, {
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      if (!data.current_condition || data.current_condition.length === 0) {
        return {
          success: false,
          error: 'Location not found or no weather data'
        };
      }

      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];

      const result = {
        success: true,
        location: {
          name: area?.areaName?.[0]?.value || location,
          region: area?.region?.[0]?.value || null,
          country: area?.country?.[0]?.value || null
        },
        current: {
          temperature: current.temp_C + '°C',
          feelsLike: current.FeelsLikeC + '°C',
          humidity: current.humidity + '%',
          description: current.lang_fr?.[0]?.value || current.weatherDesc?.[0]?.value || 'N/A',
          windSpeed: current.windspeedKmph + ' km/h',
          windDirection: current.winddir16Point,
          visibility: current.visibility + ' km',
          uvIndex: current.uvIndex,
          cloudCover: current.cloudcover + '%'
        },
        forecast: []
      };

      // Ajouter prévisions si disponibles - avec noms de jours corrects (FIX 2025-12-08)
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
      }

      console.log(\`✅ [WebTools] Météo OK: \${result.location.name}\`);
      return result;

    } catch (error) {
      console.error(\`❌ [WebTools] Erreur météo:\`, error.message);

      return {
        success: false,
        error: {
          code: 'WEATHER_ERROR',
          message: error.message,
          location: location
        }
      };
    }
  }`;

const newWeatherCode = `  static async weather(location, options = {}) {
    // FIX 2025-12-13: Utilise Open-Meteo (gratuit, fiable) au lieu de wttr.in (ECONNRESET)
    if (!location || location.trim().length < 2) {
      return {
        success: false,
        error: 'Location required (minimum 2 characters)'
      };
    }

    try {
      console.log(\`🌤️ [WebTools] Météo Open-Meteo: "\${location}"\`);

      // Étape 1: Géocodage (nom -> coordonnées)
      const geoUrl = \`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(location)}&count=1&language=fr\`;
      const geoResponse = await axios.get(geoUrl, { timeout: 10000 });

      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        return { success: false, error: 'Lieu non trouvé: ' + location };
      }

      const geo = geoResponse.data.results[0];
      const { latitude, longitude, name, admin1, country } = geo;

      // Étape 2: Météo actuelle + prévisions
      const weatherUrl = \`https://api.open-meteo.com/v1/forecast?latitude=\${latitude}&longitude=\${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=3\`;
      const weatherResponse = await axios.get(weatherUrl, { timeout: 10000 });
      const data = weatherResponse.data;

      // Codes météo WMO -> description française
      const weatherCodes = {
        0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux', 3: 'Nuageux',
        45: 'Brouillard', 48: 'Brouillard givrant',
        51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
        61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
        71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
        80: 'Averses légères', 81: 'Averses modérées', 82: 'Averses violentes',
        95: 'Orage', 96: 'Orage avec grêle légère', 99: 'Orage avec grêle forte'
      };

      const result = {
        success: true,
        location: { name, region: admin1 || null, country: country || null },
        current: {
          temperature: Math.round(data.current.temperature_2m) + '°C',
          feelsLike: Math.round(data.current.apparent_temperature) + '°C',
          humidity: data.current.relative_humidity_2m + '%',
          description: weatherCodes[data.current.weather_code] || 'N/A',
          windSpeed: Math.round(data.current.wind_speed_10m) + ' km/h',
          windDirection: data.current.wind_direction_10m + '°'
        },
        forecast: []
      };

      // Prévisions 3 jours
      const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      if (data.daily && data.daily.time) {
        result.forecast = data.daily.time.map((date, i) => {
          const dateObj = new Date(date + 'T12:00:00');
          return {
            date,
            jour: \`\${joursSemaine[dateObj.getDay()]} \${dateObj.getDate()} \${dateObj.toLocaleDateString('fr-CA', { month: 'long' })}\`,
            maxTemp: Math.round(data.daily.temperature_2m_max[i]) + '°C',
            minTemp: Math.round(data.daily.temperature_2m_min[i]) + '°C',
            description: weatherCodes[data.daily.weather_code[i]] || 'N/A',
            chanceOfRain: (data.daily.precipitation_probability_max[i] || 0) + '%'
          };
        });
      }

      console.log(\`✅ [WebTools] Météo OK: \${result.location.name}\`);
      return result;

    } catch (error) {
      console.error(\`❌ [WebTools] Erreur météo:\`, error.message);
      return {
        success: false,
        error: { code: 'WEATHER_ERROR', message: error.message, location }
      };
    }
  }`;

if (content.includes('Open-Meteo')) {
  console.log('SKIP: Open-Meteo weather already implemented');
} else if (content.includes(oldWeatherCode)) {
  content = content.replace(oldWeatherCode, newWeatherCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Weather switched to Open-Meteo!');
} else {
  console.log('ERROR: Old weather code not found - trying line-based approach');

  // Approche par numéro de ligne
  const lines = content.split('\n');
  let startLine = -1;
  let endLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('static async weather(location')) {
      startLine = i;
    }
    if (startLine >= 0 && lines[i].trim() === '}' && i > startLine + 10) {
      // Vérifie si c'est la fin de la méthode (niveau d'indentation)
      if (lines[i].match(/^  \}$/)) {
        endLine = i;
        break;
      }
    }
  }

  if (startLine >= 0 && endLine >= 0) {
    // Remplace les lignes
    const newLines = newWeatherCode.split('\n');
    lines.splice(startLine, endLine - startLine + 1, ...newLines);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('SUCCESS: Weather replaced via line-based approach!');
  } else {
    console.log('FAILED: Could not find weather method boundaries');
  }
}
