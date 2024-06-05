require('./nk.config.js').config().init('AppVariables');
const fs = require('fs-extra');
const path = require('path');
const { MANIFEST } = require('./app/templates/manifest_template.js');

const createManifest = async (lang, manifest) => {
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
  await fs.writeFile(outputPath, minifiedManifest, 'utf-8');
  console.log(`[${new Date().toLocaleString().replace(',', '')}] :: => Manifest for [${lang.toUpperCase()}] created successfully!`);
};

const outputDir = path.join(__dirname, 'public', 'manifest');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const createManifestPromises = __NK__.langs.supported.map(lang => createManifest(lang, MANIFEST));
Promise.all(createManifestPromises)
  .then(() => {
    console.log(`[${new Date().toLocaleString().replace(',', '')}] :: => All manifests created successfully`);
  })
  .catch(err => {
    console.error(err);
  });