require('./nk.config.js').config().init(['AppVariables']);
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const terser = require('terser');
const htmlMinifier = require('html-minifier');
const sass = require('node-sass');
const { promisify } = require('util');
const writeFilePromise = promisify(fs.writeFile);
const serverSource = './src/serverside';
const serverDestination = './app';
const clientSource = './src/clientside';
const clientDestination = './public';
const handlingExtensions = ['.js', '.html', '.scss', '.css'];


const runArguments = process.argv.slice(2);

const checkForIndex = async () => {
  try {
    await fs.access(path.join(__dirname, 'index.js'));
    execSync('node index.js', { stdio: 'inherit' });
  } catch (error) {
    console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Not found [index.js], runnig % builder %`);
    execSync('node build.js index', { stdio: 'inherit' });
  }
}

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
    console.log(`\x1b[33m[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > [BUILDER] % “${destinationPath}\\${entry.name}” created successfully!\x1b[39m`);
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
  console.log(`\x1b[33m[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > [BUILDER] % Manifest for [${lang.toUpperCase()}] created successfully!\x1b[39m`);
};


async function index() {
  const sourcePath = path.join(__dirname, 'index.dev.js');
  const destinationPath = path.join(__dirname, 'index.js');

  const fileContent = await fs.readFile(sourcePath, 'utf8');
  const minified = await terser.minify(fileContent, {
    compress: true,
    mangle: true,
    keep_fnames: true,
    keep_classnames: true
  });
  await writeFilePromise(destinationPath, minified.code);

  console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [BUILDER] :: “${destinationPath}” Index file builded\x1b[39m`);
}
async function build() {
  try {
    await copyFilesAndMinify(clientSource, clientDestination);
    await copyFilesAndMinify(serverSource, serverDestination)
      .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: Files copied and minified successfully\x1b[39m`))
      .catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during copy and minify: ${error.message}`));
    const manifestOutput = path.join(__dirname, 'public', 'manifest');
    if (!fs.existsSync(manifestOutput)) fs.mkdirSync(manifestOutput, { recursive: true });
    const { MANIFEST } = await require('./app/templates/manifest_template.js');
    const createManifestPromises = await __NK__.langs.supported.map(lang => createManifest(lang, MANIFEST));
    await Promise.all(createManifestPromises)
      .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: All manifests created successfully\x1b[39m`)).catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build: ${error.message}`));

  } catch (error) {
    console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build: ${error.message}`);
  }
}

const BUILING_PROMISE = new Promise((resolve, reject) => {
  try {
    (async () => {
      if (runArguments.includes('start')) await checkForIndex();
      if (!runArguments.includes('index_rebuild')) await build();
      if (runArguments.includes('index') || runArguments.includes('index_rebuild')) await index();
      resolve();
    })();
  } catch (error) {
    reject(error);
  }
});
BUILING_PROMISE
  .then(() => {
    const exec = runArguments.includes('start') ? 'node' : (runArguments.includes('watch') ? 'nodemon' : null);
    const index = runArguments.includes('watch') ? 'index.dev.js': 'index.js';
    exec !== null && execSync(`${exec} ${index}`, { stdio: 'inherit' });
  });