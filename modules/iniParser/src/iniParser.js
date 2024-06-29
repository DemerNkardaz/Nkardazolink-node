const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const chokidar = require('chokidar');
const path = require('path');
const mathjs = require('mathjs');

let isProcessing = false;

const parseSize = (sizeString) => {
  sizeString = sizeString.toUpperCase();

  if (sizeString.endsWith('K')) return parseInt(sizeString.slice(0, -1)) * 1024;
  else if (sizeString.endsWith('M')) return parseInt(sizeString.slice(0, -1)) * 1024 * 1024;
  else if (sizeString.endsWith('G')) return parseInt(sizeString.slice(0, -1)) * 1024 * 1024 * 1024;
  else if (sizeString.endsWith('T')) return parseInt(sizeString.slice(0, -1)) * 1024 * 1024 * 1024 * 1024;
  
  return parseInt(sizeString);
}

const parseLines = (data) => {
  const lines = data.split('\n');
  let currentSection = null;
  let splitBy = ',';
  let bracketCommands = false;
  const parsedData = {};

  lines.forEach((line) => {
    line.startsWith('splitBy') && (splitBy = line.split('=')[1].trim());
    line.startsWith('bracketCommands') && (bracketCommands = line.split('=')[1].trim() === 'true');
  });

  try {
    lines.forEach((line) => {
      line = line.trim();

      if (line.startsWith(';') || line === '') return;

      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.substring(1, line.length - 1);
        parsedData[currentSection] = {};
      } else {
        const keyValue = line.split('=');
        const key = keyValue[0].trim();
        let value = keyValue[1].trim();

        if (value.startsWith('{regex}: ')) value = new RegExp(value.substring('{regex}: '.length));
        else if (value.startsWith('{this}')) {
          let lastPath = value.split('{this}/')[1];
          const projectDir = path.join(__dirname, '..', '..', '..');
          value = path.join(projectDir, lastPath);
        }
        else if (value.startsWith('{math}:')) {
          let mathString = value.split('{math}:')[1].trim();
          value = mathjs.evaluate(mathString);
        }

        else if (/^\d+(K|M|G|T)$/i.test(value)) { value = parseSize(value); }

        else if (value.toLowerCase() === 'true') { value = true; }
        else if (value.toLowerCase() === 'false') { value = false; }

        else if (bracketCommands && value.startsWith('${') && value.endsWith('}')) {
          value = new Function(`return ${value.slice(2, -1)}`)();
        }
        else if (value.includes(splitBy) && value.length > 1) {
          value = value.split(splitBy).map(ext => ext.trim());
        }

        if (key.includes('.')) {
          const keys = key.split('.');
          let nestedObj = parsedData[currentSection];
          for (let i = 0; i < keys.length - 1; i++) {
            const nestedKey = keys[i];
            if (!nestedObj.hasOwnProperty(nestedKey)) {
              nestedObj[nestedKey] = {};
            }
            nestedObj = nestedObj[nestedKey];
          }
          nestedObj[keys[keys.length - 1]] = value;
        } else {
          parsedData[currentSection][key] = value;
        }
      }
    });
  } catch (error) {
    console.error(error);
  }

  return parsedData;
}

const ini = {
  async reInit(file) {
    try {
      const data = await readFile(file, 'utf-8');
      return parseLines(data);
    } catch (error) {
      console.error(`Error reading file ${file}: ${error.message}`);
    }
  },
  parse(file, variable) {
    const data = fs.readFileSync(file, 'utf-8');
    const parsedData = parseLines(data);
    if (variable) global[variable] = parsedData;
    else return parsedData;
  },
  watch: (file, variable) => {
    chokidar.watch(file).on('change', async () => {
      if (isProcessing) return;
      isProcessing = true;

      await new Promise(async (resolve, reject) => {
        let data;
        setTimeout(async() => {
          try {
            data = await ini.reInit(file);
          } catch (error) {
            reject(error);
          } finally {
            resolve(data);
          }
        }, 1000);
      }).then((data) => {
        try {
          if (data) {
            global[variable] = data;
            console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟧 > [INI] :: Configuration file ${file.split('\\').pop()} has been changed\x1b[39m`);
          } else {
            console.error(`\x1b[31m[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [INI] :: Parsed data is undefined for file ${file.split('\\').pop()}\x1b[39m`);
          }
        } catch (error) {
          console.error(`\x1b[31m[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [INI] :: Error reading file ${file.split('\\').pop()}: ${error.message}\x1b[39m`);
        } finally {
          isProcessing = false;
        }
      });
    });
  }
}

module.exports = { ini };
