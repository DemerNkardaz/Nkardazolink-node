const fs = require('fs');
const path = require('path');

// Путь к шаблону манифеста
const templatePath = path.join(__dirname, 'app', 'templates', 'manifest_template.js');
const outputDir = path.join(__dirname, 'public', 'manifest');

// Создаем папку outputDir, если она не существует
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Импортируем шаблон манифеста
const { MANIFEST } = require(templatePath);

// Доступные языки из манифеста
const languages = Object.keys(MANIFEST.short_name);

// Функция для замены языка в объекте
function replaceLanguage(obj, lang) {
  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        newObj[key] = replaceLanguage(obj[key], lang);
      } else if (obj[key] && obj[key][lang]) {
        newObj[key] = obj[key][lang];
      } else if (obj[key] && obj[key].en) {
        newObj[key] = obj[key].en;
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  }
  return obj;
}

// Функция для генерации манифеста для каждого языка
function generateManifests() {
  languages.forEach((lang) => {
    const localizedManifest = replaceLanguage(MANIFEST, lang);

    const manifestContent = JSON.stringify(localizedManifest, null, 2);
    const manifestPath = path.join(outputDir, `manifest.${lang}.webmanifest`);

    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
    console.log(`Manifest for ${lang} created at ${manifestPath}`);
  });
}

generateManifests();
