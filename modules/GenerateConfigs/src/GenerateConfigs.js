global.fs = require('fs');
global.path = require('path');
global.promisify = require('util').promisify;
global.writeFileAsync = promisify(fs.writeFile);
require('../../CoreConfig/src/CoreConfig').config().init(['AppVariables', 'CoreModules']);
global.__PROJECT_DIR__ = path.join(__dirname, '..', '..', '..');
global.serverConfig = ini.parse(path.join(__PROJECT_DIR__, 'server.ini'));
global.sourceDir = __PROJECT_DIR__.replace(/\\/g, '/');
global.ejs = require('ejs');
global.os = require('os').platform();

if (global.os.includes('win')) os = 'win'
else if (global.os = 'darwin') os = 'macos'

const { createNginxConfig, generateErrorPages } = require('./node-wiki-nginx');

const init = async () => {
  try {
    console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [BUILDER] :: NGINX files updated succesfully\x1b[39m`)
    await createNginxConfig();
    await generateErrorPages();
  } catch (err) {
    throw new Error(err);
  }
};
module.exports = { init };