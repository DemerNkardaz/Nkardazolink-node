require('./nk.config.js').config().init(['AppVariables']);
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { copyFilesAndMinify, createManifest, index, checkForIndex } = require('./server.workers/server/building.files.js');


const runArguments = process.argv.slice(2);


async function build() {
  try {
    await copyFilesAndMinify(path.join(__PROJECT_DIR__, 'src/clientside'), path.join(__PROJECT_DIR__, 'static/public'));
    await copyFilesAndMinify(path.join(__PROJECT_DIR__, 'src/serverside'), path.join(__PROJECT_DIR__, 'app'))
      .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: Files copied and minified successfully\x1b[39m`))
      .catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during copy and minify: ${error.message}`));
    
    const manifestOutput = path.join(__PROJECT_DIR__, 'static/public/manifest/');
    if (!fs.existsSync(manifestOutput)) fs.mkdirSync(manifestOutput, { recursive: true });
    const { MANIFEST } = await require('./app/templates/manifest_template.js');
    const createManifestPromises = await __NK__.langs.supported.map(lang => createManifest(__PROJECT_DIR__, lang, MANIFEST));
    await Promise.all(createManifestPromises)
      .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: All manifests created successfully\x1b[39m`)).catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build: ${error.message}`));
    require('./server.workers/server/sitemap.gen.js').generateSiteMaps(__PROJECT_DIR__);
  } catch (error) {
    console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build: ${error.message}`);
  }
}

const BUILING_PROMISE = new Promise((resolve, reject) => {
  try {
    (async () => {
      if (runArguments.includes('start')) await checkForIndex(__PROJECT_DIR__);
      if (!runArguments.includes('index_rebuild')) await build();
      if (runArguments.includes('index') || runArguments.includes('index_rebuild')) await index(__PROJECT_DIR__);
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