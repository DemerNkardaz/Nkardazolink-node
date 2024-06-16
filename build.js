require('dotenv').config();
require('./core-config').config().init(['AppVariables']);
const { ini } = require('./modules/iniParser/src/iniParser.js');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const crypto = require('crypto');
const { copyFilesAndMinify, createManifest, index, checkForIndex, buildExtensions } = require('./server.workers/server/building.files.js');
global.__PROJECT_DIR__ = path.join(__dirname, '.');
global.serverConfig = ini.parse(path.join(__PROJECT_DIR__, 'server.ini'));

const runArguments = process.argv.slice(2);
function generateToken(count, mode) {
  const tokenization = mode === 'aes' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*~≈×°₽„“”‘’£§‰≠±•«»:;,.<>?/|_\\-+.';
  const key = Array.from({ length: count || 256 }, () => tokenization.charAt(Math.floor(Math.random() * tokenization.length))).join('');
  const hash = crypto.createHash('sha256').update(key).digest('base64');
  return `Random token = ${key}\nToken hash = ${hash} | ${hash.substring(0, 32)}\nRandom IV = ${crypto.randomBytes(16).toString('hex')}`;
}

function generateMuchTokens() {
  let tokens = [];
  for (let i = 0; i < 10; i++) {
    tokens.push(generateToken(1024));
  }
  return tokens.join('\n\n');
}

async function build() {
  try {
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'localtunnel-run.cmd'), `lt --port ${process.env.PORT} --subdomain ${process.env.LOCAL_TUNNER}`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'lighthouse-analyzer-http.cmd'), `lighthouse http://${process.env.HOST}:${process.env.PORT} --output-path=./lighthouse_report.html`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'lighthouse-analyzer-https.cmd'), `lighthouse https://${process.env.HOST} --output-path=./lighthouse_report.html`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'install-ltunnel-n-lhouse-via-npm-globally.cmd'), `npm install -g localtunnel lighthouse`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'static/token.txt'), generateMuchTokens(), 'utf-8');
    await buildExtensions(path.join(__PROJECT_DIR__, 'extensions'));
    await buildExtensions(path.join(__PROJECT_DIR__, 'modules'));
    await copyFilesAndMinify(path.join(__PROJECT_DIR__, 'src/clientside'), path.join(__PROJECT_DIR__, 'static/public'));
    await copyFilesAndMinify(path.join(__PROJECT_DIR__, 'src/serverside'), path.join(__PROJECT_DIR__, 'app'))
      .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: Files copied and minified successfully\x1b[39m`))
      .catch(error => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during copy and minify: ${error.message}`));
    
    const manifestOutput = path.join(__PROJECT_DIR__, 'static/public/manifest/');
    if (!fs.existsSync(manifestOutput)) fs.mkdirSync(manifestOutput, { recursive: true });
    const { Manifest } = require('./app/templates/manifest_template.js');
    const manifestTemplate = new Manifest();
    const createManifestPromises = await serverConfig.language.supported.map(lang => createManifest(__PROJECT_DIR__, lang, manifestTemplate.getManifest()));
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