require('./nk.config.js').config().init('AppVariables');
const fs = require('fs-extra');
const path = require('path');
const terser = require('terser');
const htmlMinifier = require('html-minifier');
const sass = require('node-sass');

const sourceDir = './src/serverside';
const destinationDir = './app';
const handlingExtensions = ['.js', '.html', '.scss', '.css'];

async function copyFilesAndMinify(sourceDir, destinationDir) {
  await fs.ensureDir(destinationDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isFile()) {
      if (path.extname(sourcePath) === '.js') {
        const fileContent = await fs.readFile(sourcePath, 'utf8');
        const minified = await terser.minify(fileContent, {
          compress: true,
          mangle: true,
          keep_fnames: true,
          keep_classnames: true
        });
        await fs.writeFile(destinationPath, minified.code);
      } else if (path.extname(sourcePath) === '.html') {
        const fileContent = await fs.readFile(sourcePath, 'utf8');
        const minified = htmlMinifier.minify(fileContent, {
          collapseWhitespace: true,
          removeComments: true
        });
        await fs.writeFile(destinationPath, minified);
      } else if (path.extname(sourcePath) === '.scss' || path.extname(sourcePath) === '.css') {
        const result = sass.renderSync({
          file: sourcePath,
          outputStyle: 'compressed'
        });
        await fs.writeFile(destinationPath, result.css.toString());
      } else if (!handlingExtensions.includes(path.extname(sourcePath))) {
        await fs.copy(sourcePath, destinationPath);
      }
    } else if (entry.isDirectory()) {
      await copyFilesAndMinify(sourcePath, destinationPath);
    }
    console.log(`[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > “${destinationPath}\\${entry.name}” created successfully!`);
  }
}

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
  console.log(`[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > Manifest for [${lang.toUpperCase()}] created successfully!`);
};

async function build() {
  try {
    await copyFilesAndMinify(sourceDir, destinationDir)
      .then(() => console.log(`[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: Files copied and minified successfully`))
      .catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during copy and minify: ${error.message}`));
    const manifestOutput = path.join(__dirname, 'public', 'manifest');
    if (!fs.existsSync(manifestOutput)) fs.mkdirSync(manifestOutput, { recursive: true });
    const { MANIFEST } = await require('./app/templates/manifest_template.js');
    const createManifestPromises = await __NK__.langs.supported.map(lang => createManifest(lang, MANIFEST));
    await Promise.all(createManifestPromises)
      .then(() => console.log(`[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: All manifests created successfully`)).catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build: ${error.message}`));

  } catch (error) {
    console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build: ${error.message}`);
  }
}

build();