require('dotenv').config();
require('./modules/CoreConfig/src/CoreConfig').config().init(['AppVariables', 'CoreModules']);
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const crypto = require('crypto');
const ejs = require('ejs');
const { copyFilesAndMinify, createManifest, index, checkForIndex, buildExtensions, compileSCSS, compileJS, transferUncategorized } = require('./server.workers/server/building.files.js');
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

const cmbScripts = {
  'nginx-php-cgi-start': '@echo off\n' + 'cd /d C:\\nginx\n' + 'start nginx\n' + `php-cgi -b 127.0.0.1:9000 -c ${path.join(__PROJECT_DIR__, 'tools', 'php.ini')}`,
  'nginx-reload': '@echo off\n' + 'cd /d C:\\nginx\n' + 'nginx -s reload',
  'nginx-kill': '@echo off\n' + 'cd /d C:\\nginx\n' + 'nginx -s stop',
  'localtunnel-run': `lt --port ${serverConfig.server.HTTPPort} --subdomain ${serverConfig.server.localTunnel}`,
  'lighthouse-analyzer-http': `lighthouse http://${serverConfig.server.host}:${serverConfig.server.HTTPPort} --output-path=./lighthouse_report.html`,
  'lighthouse-analyzer-https': `lighthouse https://${serverConfig.server.host}:${serverConfig.server.HTTPSPort} --output-path=./lighthouse_report.html`,
  'lighthouse-analyzer-nginx': `lighthouse https://${serverConfig.server.host}:${serverConfig.NGINX.HTTPSPort} --output-path=./lighthouse_report.html`,
  'install-ltunnel-n-lhouse-via-npm-globally': 'npm install -g localtunnel lighthouse',
}

const phpIni = 
'[PHP]\n' +
'engine = On\n' +
'short_open_tag = Off\n' +
'precision = 14\n' +
'output_buffering = 4096\n' +
'implicit_flush = Off\n' +
'serialize_precision = -1\n' +
'zend.enable_gc = On\n' +
'zend.exception_ignore_args = On\n' +
'zend.exception_string_param_max_len = 0\n' +
'expose_php = On\n' +
'max_execution_time = 30\n' +
'max_input_time = 60\n' +
'memory_limit = 128M\n' +
'display_errors = Off\n' +
'display_startup_errors = Off\n' +
'log_errors = Off\n' +
'post_max_size = 8M\n' +
'default_mimetype = "text/html"\n' +
'default_charset = "UTF-8"\n' +
'enable_dl = Off\n' +
'cgi.fix_pathinfo=1\n' +
'file_uploads = On\n' +
'upload_max_filesize = 2M\n' +
'max_file_uploads = 20\n' +
'default_socket_timeout = 60\n\n' +

`extension_dir = "${process.env.PHP}\\ext"\n` +
'extension=php_curl.dll\n' +
'extension=mysqli\n' +
'extension=php_openssl.dll\n\n' +

'[CLI Server]\n' +
'cli_server.color = On\n\n' +

'[MySQLi]\n' +
'mysqli.max_persistent = -1\n' +
'mysqli.allow_persistent = On\n' +
'mysqli.max_links = -1\n' +
`mysqli.default_port = ${serverConfig.dataBase.port}\n` +
'mysqli.default_socket =\n' +
'mysqli.default_host =\n' +
'mysqli.default_user =\n' +
'mysqli.default_pw =';

async function build() {
  try {
    const bashPromise = new Promise((resolve, reject) => {
      try {
        !fs.existsSync('./bin') && fs.mkdirSync('./bin', { recursive: true });
        resolve();
      } catch (err) {
        console.log(err);
        reject();
      }
    });
    bashPromise.then(async () => {
      try {
        for (const [scriptName, scriptContent] of Object.entries(cmbScripts)) {
          const filePath = path.join(__PROJECT_DIR__, 'bin', `${scriptName}.cmd`);
          await writeFileAsync(filePath, scriptContent, 'utf-8');
        }
      } catch (err) {
        console.log(err);
      }
    });

    try {
      await new Promise(async (resolve, reject) => {
        try {
          await transferUncategorized(path.join(__PROJECT_DIR__, 'src/serverside'), path.join(__PROJECT_DIR__, 'app'));
          await compileJS(path.join(__PROJECT_DIR__, 'src/clientside/script'), path.join(__PROJECT_DIR__, 'static/public/script'));
          await compileJS(path.join(__PROJECT_DIR__, 'src/serverside'), path.join(__PROJECT_DIR__, 'app'));
          await compileSCSS(path.join(__PROJECT_DIR__, 'src/clientside/styles'), path.join(__PROJECT_DIR__, 'static/public/styles'));
          console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: Files copied and minified successfully\x1b[39m`);
          resolve();
        } catch (err) {
          console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during copy and minify:`);
          console.log(err);
          reject();
        }
      });

      await new Promise(async (resolve, reject) => {
        try {
          await buildExtensions(path.join(__PROJECT_DIR__, 'extensions'));
          await buildExtensions(path.join(__PROJECT_DIR__, 'modules'));
          resolve();
        } catch (err) {
          console.log(err);
          reject(err);
        }
      });

    } catch (err) {
      console.log(err);
    } finally {
      try {
        {
          await require('./modules/GenerateConfigs/GenerateConfigs').init();
          await writeFileAsync(path.join(__PROJECT_DIR__, 'Tools', `php.ini`), phpIni, 'utf-8');
        }
        {
          const manifestOutput = path.join(__PROJECT_DIR__, 'static/public/manifest/');
          if (!fs.existsSync(manifestOutput)) fs.mkdirSync(manifestOutput, { recursive: true });
          const { Manifest } = require('./app/templates/manifest_template.js');
          const manifestTemplate = new Manifest();
          const createManifestPromises = await serverConfig.language.supported.map(lang => createManifest(__PROJECT_DIR__, lang, manifestTemplate.getManifest()));
          await Promise.all(createManifestPromises)
            .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: All manifests created successfully\x1b[39m`))
            .catch(error => {
              console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build:`);
              console.error(err);
            });
        }
      } catch (err) {
        console.error(err);
      }
    }


    await require('./server.workers/server/sitemap.gen.js').generateSiteMaps(__PROJECT_DIR__);


  } catch (err) {
    console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Error during build:`);
    console.error(err);
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
    (!runArguments.includes('watch') && !runArguments.includes('start')) && process.exit();
  });