const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const config = (file) => {
  let methods = {};
  const configFile = yaml.load(fs.readFileSync(`${file || 'nk.config'}.yaml`, 'utf8'));
  methods.handle = (dependency, isNotRequire) => {
    let depName = Object.keys(dependency)[0];
    let depAlias = dependency[depName];
    if (!isNotRequire) {
      if (depAlias.startsWith('{') && depAlias.endsWith('}')) {
        depAlias = depAlias.substring(1, depAlias.length - 1);
        if (depAlias.includes(', '))
          depAlias = depAlias.split(', '),
          depAlias.forEach(dep => eval(`global.${dep} = require('${depName}').${dep}`));
        else
          eval(`global.${depAlias} = require('${depName}').${depAlias}`);
      } else
        global[depAlias] = require(depName);
    }
    else global[depName] = eval(depAlias);
  };

  methods.init = (...args) => {
    
    if (args[0] === 'Vars' || typeof args[0] === 'undefined' || typeof args[0] === 'null')
      Object.values(configFile).forEach(domain => {
        Object.values(domain).forEach(dependency => methods.handle(dependency, args[0] === 'Vars'));
      })
    else
      args.forEach(argument => {
        Object.values(configFile[argument]).forEach(dependency => methods.handle(dependency));
      })
  };
  return methods;
}

module.exports = { config };