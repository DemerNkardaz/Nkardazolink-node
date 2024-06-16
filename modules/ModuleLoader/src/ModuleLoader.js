const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const config = (moduleSource, file) => {
  const modulePath = path.join(__dirname, '..', '..', moduleSource);
  const moduleConfigPath = path.join(path.join(__dirname, '..', '..'), moduleSource, `${file || 'config'}.yaml`);
  console.log(modulePath);
  let methods = {};

  const configFile = yaml.load(fs.readFileSync(moduleConfigPath, 'utf8'));

  methods.init = (srcMode = false) => {
    for (const [key, value] of Object.entries(configFile['Extensions'])) {
      if (value === 'enabled' || value === true) {
        try {
          const requirePath = path.join(modulePath, key, srcMode ? 'src' : '', `${key}.js`);
          const module = require(requirePath);

          // Проверяем, есть ли ключ Import в конфигурации
          const imports = configFile[key]?.Import?.replace(/\s/g, '').split(',') || Object.keys(module);

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
