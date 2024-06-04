const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('nk.config.yaml', 'utf8'));


const configHandle = (dep, reg) => {
  let depName = Object.keys(dep)[0];
  let depAlias = dep[depName];
  if (!reg) {
    if (depAlias.startsWith('{') && depAlias.endsWith('}')) {
      depAlias = depAlias.substring(1, depAlias.length - 1);
      eval(`global.${depAlias} = require('${depName}').${depAlias}`);
    } else {
      global[depAlias] = require(depName);
    }
  } else {
    global[depName] = eval(depAlias);
  }
}

const initializeConfig = (...args) => {
  if (args[0] === 'All' || typeof args[0] === 'undefined' || typeof args[0] === 'null') {
    Object.values(config).forEach(domain => {
      const isVars = domain[0] === 'Vars';
      isVars && delete domain[0];
      Object.values(domain).forEach(dep => {
        configHandle(dep, isVars);
      });
    });
  } else {
    args.forEach(domain => {
      const isVars = config[domain][0] === 'Vars';
      isVars && delete config[domain][0];
      Object.values(config[domain]).forEach(dep => {
        configHandle(dep, isVars);
      });
    });
  }
}
module.exports = { initializeConfig };
/*
[...config.IndexDependencies, ...config.ProjectDependencies].forEach(dep => { configHandle(dep); });
[...config.Globals].forEach(dep => { configHandle(dep, true); });
*/