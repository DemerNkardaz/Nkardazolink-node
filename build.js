require('dotenv').config();
require('./modules/CoreConfig/src/CoreConfig').config().init(['AppVariables']);
const { ini } = require('./modules/iniParser/src/iniParser.js');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const crypto = require('crypto');
const ejs = require('ejs');
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

const nginxErrors = {
  400: ['400 – Bad Request', 'Your browser sent a request that this server could not understand.'],
  401: ['401 – Unauthorized', 'You are not authorized to view the page. Please log in or check your credentials.'],
  403: ['403 – Forbidden', 'You do not have permission to access the requested resource.'],
  404: ['404 – Not Found', 'The requested URL was not found on this server.'],
  405: ['405 – Method Not Allowed', 'The method specified in the request is not allowed for the requested resource.'],
  406: ['406 – Not Acceptable', 'The server cannot generate a response that the requester will accept.'],
  407: ['407 – Proxy Authentication Required', 'The client must authenticate itself with the proxy.'],
  408: ['408 – Request Timeout', 'The server timed out waiting for the request.'],
  409: ['409 – Conflict', 'The request could not be completed due to a conflict with the current state of the resource.'],
  410: ['410 – Gone', 'The requested resource is no longer available at the server and no forwarding address is known.'],
  411: ['411 – Length Required', 'The request did not specify the length of its content, which is required by the requested resource.'],
  412: ['412 – Precondition Failed', 'The server does not meet one of the preconditions that the requester put on the request.'],
  413: ['413 – Payload Too Large', 'The request is larger than the server is willing or able to process.'],
  414: ['414 – URI Too Long', 'The URI provided was too long for the server to process.'],
  415: ['415 – Unsupported Media Type', 'The server does not support the media type of the request body.'],
  416: ['416 – Range Not Satisfiable', 'The server cannot satisfy the range request header indicated in the request.'],
  417: ['417 – Expectation Failed', 'The server cannot meet the requirements of the Expect request-header field.'],
  418: ['418 – I’m a teapot', 'This code was defined in 1998 as one of the traditional April Fools’ jokes in RFC 2324, Hyper Text Coffee Pot Control Protocol, and is not expected to be implemented by actual HTTP servers.'],
  421: ['421 – Misdirected Request', 'The request was directed at a server that is not able to produce a response (for example, because of a connection reuse).'],
  422: ['422 – Unprocessable Entity', 'The server understands the content type of the request entity but was unable to process the contained instructions.'],
  423: ['423 – Locked', 'The resource that is being accessed is locked.'],
  424: ['424 – Failed Dependency', 'The method could not be performed on the resource because the requested action depended on another action and that action failed.'],
  425: ['425 – Too Early', 'The server is unwilling to risk processing a request that might be replayed.'],
  426: ['426 – Upgrade Required', 'The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol.'],
  428: ['428 – Precondition Required', 'The server requires the request to be conditional.'],
  429: ['429 – Too Many Requests', 'The user has sent too many requests in a given amount of time (“rate limiting”).'],
  431: ['431 – Request Header Fields Too Large', 'The server is unwilling to process the request because its header fields are too large.'],
  451: ['451 – Unavailable For Legal Reasons', 'The server is denying access to the resource as a consequence of a legal demand.'],
  500: ['500 – Internal Server Error', 'The server encountered an unexpected condition that prevented it from fulfilling the request.'],
  501: ['501 – Not Implemented', 'The server does not support the functionality required to fulfill the request.'],
  502: ['502 – Bad Gateway', 'The server received an invalid response from an upstream server.'],
  503: ['503 – Service Unavailable', 'The server is currently unavailable (overloaded or down). Please try again later.'],
  504: ['504 – Gateway Timeout', 'The server, while acting as a gateway or proxy, did not receive a timely response from an upstream server it needed to access in order to complete the request.'],
  505: ['505 – HTTP Version Not Supported', 'The server does not support the HTTP protocol version used in the request.'],
  506: ['506 – Variant Also Negotiates', 'Transparent content negotiation for the request results in a circular reference.'],
  507: ['507 – Insufficient Storage', 'The server is unable to store the representation needed to complete the request.'],
  508: ['508 – Loop Detected', 'The server detected an infinite loop while processing the request.'],
  510: ['510 – Not Extended', 'Further extensions to the request are required for the server to fulfill it.'],
  511: ['511 – Network Authentication Required', 'The client needs to authenticate to gain network access.'],
};



function generateErrorPagesNGINX() {
  Object.keys(nginxErrors).forEach(errorCode => {
    const errorHeader = nginxErrors[errorCode][0];
    const errorText = nginxErrors[errorCode][1];
    const data = { errorHeader, errorText };

    const html = ejs.renderFile('./nginx/errors.ejs', data, (err, str) => {
      if (err) {
        console.error('Error during NGINX error pages rendering:', err);
        return;
      }
      const fileName = `./nginx/html/${errorCode}.html`;
      fs.writeFile(fileName, str, (err) => {
        if (err) {
          console.error(`Error during creating NGINX error page ${fileName}:`, err);
        }
      });
    });
  });
}



async function build() {
  try {
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'nginx-start.cmd'),
      '@echo off\n' + 'cd /d C:\\nginx\n' + 'start nginx', 'utf-8');
    await writeFileAsync(
      path.join(__PROJECT_DIR__, 'bin', 'nginx-kill.cmd'),
      '@echo off\n' + 'cd /d C:\\nginx\n' + 'nginx -s stop', 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'localtunnel-run.cmd'), `lt --port ${process.env.PORT} --subdomain ${process.env.LOCAL_TUNNEL}`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'lighthouse-analyzer-http.cmd'), `lighthouse http://${process.env.HOST}:${process.env.PORT} --output-path=./lighthouse_report.html`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'lighthouse-analyzer-https.cmd'), `lighthouse https://${process.env.HOST} --output-path=./lighthouse_report.html`, 'utf-8');
    await writeFileAsync(path.join(__PROJECT_DIR__, 'bin', 'install-ltunnel-n-lhouse-via-npm-globally.cmd'), `npm install -g localtunnel lighthouse`, 'utf-8');
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