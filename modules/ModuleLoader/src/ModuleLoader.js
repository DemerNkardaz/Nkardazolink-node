const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const chokidar = require('chokidar');

const config = (moduleSource, file) => {
  const modulePath = path.join(__dirname, '..', '..', moduleSource);
  const moduleConfigPath = path.join(path.join(__dirname, '..', '..'), moduleSource, `${file || 'config'}.yaml`);
  let methods = {};
  let previousInit = [];
  let configFile = null;
  methods.reloadConfigFile = () => {
    return yaml.load(fs.readFileSync(moduleConfigPath, 'utf8'));
  }
  

  methods.watch = (srcMode = false) => {
    chokidar.watch(moduleConfigPath).on('change', async () => {
      console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟧 > [CONFIG] :: Configuration file [${moduleSource}\\${moduleConfigPath.split('\\').pop()}] has been changed\x1b[39m`);
      try {
        previousInit.forEach(variable => global[variable] && delete global[variable]);
        previousInit = [];
        await methods.init(srcMode, false);
        console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟧 > [CONFIG] :: Configuration reloaded successfully\x1b[39m`);
      } catch (error) {
        console.error(`Error reloading configuration: ${error}`);
      }
    })
  }

  methods.init = async (srcMode = false, watcher = true) => {
    const initializePromise = new Promise((resolve, reject) => {
      configFile = methods.reloadConfigFile();
      for (const [key, value] of Object.entries(configFile['Extensions'])) {
        if (value === 'enabled' || value === true) {
          try {
            const requirePath = path.join(modulePath, key, srcMode ? 'src' : '', `${key}.js`);
            const module = require(requirePath);

            const imports = configFile[key]?.Import?.replace(/\s/g, '').split(',') || Object.keys(module);

            imports.forEach(variable => {
              global[variable] = module[variable];
              previousInit.push(variable);
            });

          } catch (error) {
            console.error(`Error reading or processing ${key}.js:`, error);
          }
        }
      }

      resolve();
    });

    Promise.all([initializePromise]).then(() => { watcher && methods.watch(srcMode); });
  }

  return methods;
}

module.exports = { config };
