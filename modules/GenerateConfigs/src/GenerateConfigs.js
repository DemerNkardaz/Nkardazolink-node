global.fs = require('fs');
global.path = require('path');
global.promisify = require('util').promisify;
global.writeFileAsync = promisify(fs.writeFile);
require('../../CoreConfig/src/CoreConfig').config().init(['AppVariables', 'CoreModules']);
global.__PROJECT_DIR__ = path.join(__dirname, '..', '..', '..');
global.serverConfig = ini.parse(path.join(__PROJECT_DIR__, 'server.ini'));
global.sourceDir = __PROJECT_DIR__.replace(/\\/g, '/');
global.ejs = require('ejs');

require('./node-wiki-nginx').createNginxConfig();
require('./node-wiki-nginx').generateErrorPages();