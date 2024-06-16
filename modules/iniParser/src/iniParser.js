const fs = require('fs');
const chokidar = require('chokidar');

const ini = {
  parse(file, variable) {
    const data = fs.readFileSync(file, 'utf-8');
    const lines = data.split('\n');
    let currentSection = null;
    const parsedData = {};

    lines.forEach((line) => {
      line = line.trim();

      if (line.startsWith(';') || line === '') {
        return;
      }

      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.substring(1, line.length - 1);
        parsedData[currentSection] = {};
      } else {
        const keyValue = line.split('=');
        const key = keyValue[0].trim();
        let value = keyValue[1].trim();

        if (value.toLowerCase() === 'true') {
          value = true;
        } else if (value.toLowerCase() === 'false') {
          value = false;
        } else if (value.includes(',')) {
          value = value.split(',').map(ext => ext.trim());
        } else {
          value = value; // Оставляем значение как строку
        }

        parsedData[currentSection][key] = value;
      }
    });
    if (variable) global[variable] = parsedData;
    else return parsedData;
  },
  watch(file, variable) {
    chokidar.watch(file).on('change', () => {
      const data = ini.parse(file);
      global[variable] = data;
      console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟧 > [INI] :: Configuration file ${file.split('/').pop()} has been changed\x1b[39m`);
    });
  }
}

module.exports = { ini };
