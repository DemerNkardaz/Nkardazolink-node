const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const config = (file) => {
  let methods = {};
  const projectDirectory = path.join(__dirname, '..', '..');
  const configPath = path.join(projectDirectory, `${file || 'core-config'}.yaml`);
  const configFile = yaml.load(fs.readFileSync(configPath, 'utf8'));
  methods.handle = (dependency, isNotRequire) => {
    let key = Object.keys(dependency)[0];
    let value = dependency[key];
    key = key.startsWith('./') ? path.join(projectDirectory, key) : key;
    console.log(key);

    if (!isNotRequire) {
      if (value.startsWith('{') && value.endsWith('}')) {
        value = value.substring(1, value.length - 1);
        let imports = value.split(',').map(v => v.trim());
        let moduleExports = require(key);

        imports.forEach(variable => {
          if (moduleExports.hasOwnProperty(variable)) {
            global[variable] = moduleExports[variable];
          } else {
            console.error(`Variable '${variable}' not found in module '${key}'.`);
          }
        });

      } else {
        global[value] = require(key);
      }
    } else {
      global[key] = eval(value);
    }
  };

  methods.init = (args) => {
    if (args !== null && Array.isArray(args)) {
      for (let i = 0; i < args.length; i++) {
        let variable = configFile[args[i]][0] === 'Vars';
        variable && configFile[args[i]].shift();
        Object.values(configFile[args[i]]).forEach(dependency => methods.handle(dependency, variable));
      }
    } else {
      Object.values(configFile).forEach(domains => {
        let variable = domains[0] === 'Vars';
        variable && domains.shift();
        Object.values(domains).forEach(dependency => methods.handle(dependency, variable));
      });
    }
  };
  return methods;
}

module.exports = { config };