const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const extFolder = path.join(__dirname);
const config = (file) => {
  let methods = {};
  const configFile = yaml.load(fs.readFileSync(`${extFolder}/${file || 'config'}.yaml`, 'utf8'));
  methods.init = (srcMode = false) => {
    for (const [key, value] of Object.entries(configFile['Extensions'])) {
      if (value === 'enabled' || value === true) {
        try {
          const imports = configFile[key].Import.replace(/\s/g, '').split(',');
          const requirePath = path.join(extFolder, key, srcMode ? 'src' : '', `${key}.js`);
          const module = require(requirePath);
          imports.forEach(variable => {
            global[variable] = module[variable];
          });
          

        } catch (error) {
          console.error(`Error reading or processing ${key}.js:`, error);
        }
      }
    }
  }
  return methods;
}

module.exports = { config };