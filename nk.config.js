const fs = require('fs');
const yaml = require('js-yaml');

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
    if (typeof args[0] === 'string' || typeof args[0] === 'undefined' || typeof args[0] === 'null') {
      Object.values(configFile).forEach(domain => {
        const isString = typeof domain[0] === 'string';
        const stringValue = isString && domain[0];
        isString && delete domain[0];
        if (stringValue === 'AutoEval')
          for (let command of domain)
            eval(command);
        else
          Object.values(domain).forEach(dependency => methods.handle(dependency, isString));
      });
    } else {
      args.forEach(domain => {
        const isString = typeof domain[0] === 'string';
        isString && delete configFile[domain][0];
        Object.values(configFile[domain]).forEach(dependency => methods.handle(dependency, isVars));
      });
    }
  };
  return methods;
}

module.exports = { config };