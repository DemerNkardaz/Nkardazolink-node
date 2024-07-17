const path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const fs = require('fs');
const yaml = require('js-yaml');
const chokidar = require('chokidar');

const config = (file) => {
  let methods = {};
  const projectDirectory = path.join(__dirname, '..', '..', '..');
  const configPath = path.join(projectDirectory, `${file || 'core-config'}.yaml`);
  let configFile = null;
  let previousInit = [];
  
  methods.reloadConfigFile = () => {
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
  }

  methods.handle = async (dependency, isNotRequire) => {
    let key = Object.keys(dependency)[0];
    let value = dependency[key];
    key = key.startsWith('./') ? path.join(projectDirectory, key) : key;
    //console.log(key);

    if (!isNotRequire) {
      if (value.startsWith('{') && value.endsWith('}')) {
        value = value.substring(1, value.length - 1);
        let imports = value.split(',').map(v => v.trim());
        let moduleExports = require(key);

        imports.forEach(variable => {
          if (moduleExports.hasOwnProperty(variable)) {
            global[variable] = moduleExports[variable];
            previousInit.push(variable);
          } else {
            console.error(`Variable '${variable}' not found in module '${key}'.`);
          }
        });

      } else {
        global[value] = require(key);
        previousInit.push(value);
      }
    } else {
      global[key] = eval(value);
      previousInit.push(key);
    }
  };

  methods.watch = (args) => {
    chokidar.watch(configPath).on('change', async () => {
      console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟧 > [CONFIG] :: Configuration file [${configPath.split('\\').pop()}] has been changed\x1b[39m`);
    
      try {
        previousInit.forEach(variable => global[variable] && delete global[variable]);
        previousInit = [];
        await methods.init(args, false);
      
        console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟧 > [CONFIG] :: Configuration reloaded successfully\x1b[39m`);
      } catch (error) {
        console.error(`Error reloading configuration: ${error}`);
      }
    });
  };
  methods.init = async (args, watcher = true) => {
    const initializePromise = new Promise((resolve, reject) => {
      try {
        configFile = methods.reloadConfigFile();
        if (args !== null && Array.isArray(args)) {
          for (let i = 0; i < args.length; i++) {
            let variable = configFile[args[i]][0] === 'Vars';
            variable && configFile[args[i]].shift();
            Object.values(configFile[args[i]]).forEach(async dependency => await methods.handle(dependency, variable));
          }
        } else {
          Object.values(configFile).forEach(domains => {
            let variable = domains[0] === 'Vars';
            variable && domains.shift();
            Object.values(domains).forEach(async dependency => await methods.handle(dependency, variable));
          });
        }
      } catch (error) {
        console.error(error);
        reject(error);
      }
      resolve();
    });
    Promise.all([initializePromise]).then(() => {
      watcher && methods.watch(args);
    });
  };
  return methods;
}

module.exports = { config };