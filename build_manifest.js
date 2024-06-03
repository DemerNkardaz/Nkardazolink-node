const fs = require('fs');
const path = require('path');
const { MANIFEST } = require('./app/templates/manifest_template');

// Фиксированный массив языков
const languages = ['ru', 'en', 'ja', 'zh', 'ko', 'vi'];

// Функция для создания файла манифеста для указанного языка
const createManifest = (lang, manifest) => {
  const translate = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(translate);
    }

    const translated = {};
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        translated[key] = translate(obj[key]);
      } else if (key === lang) {
        return obj[key];
      } else if (key === 'en' && !(lang in obj)) {
        return obj[key];
      } else {
        translated[key] = obj[key];
      }
    }

    return translated;
  };

  const translatedManifest = translate(manifest);
  const outputPath = path.join(__dirname, 'public', 'manifest', `manifest.${lang}.webmanifest`);
  const minifiedManifest = JSON.stringify({ lang, ...translatedManifest }, null, 0);
  fs.writeFileSync(outputPath, minifiedManifest);
};

// Создание директории для манифестов, если она не существует
const outputDir = path.join(__dirname, 'public', 'manifest');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Создание манифестов для каждого языка
languages.forEach(lang => createManifest(lang, MANIFEST));

console.log('Manifests created successfully!');
