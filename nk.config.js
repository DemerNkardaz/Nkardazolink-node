const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('nk.config.yaml', 'utf8'));


const configHandle = (dep, reg) => {
  const depName = Object.keys(dep)[0];
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

[...config.IndexDependencies, ...config.ProjectDependencies].forEach(dep => { configHandle(dep); });
[...config.Globals].forEach(dep => { configHandle(dep, true); })