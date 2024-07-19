const fs = require('fs');
const path = require('path');
const sass = require('sass');

function mergeObjects(...objects) {
  try {
    const result = {};
    for (const object of objects) Object.assign(result, object);
    return result;
  } catch (error) {
    console.error('Error merging objects:', error);
  }
}
Array.prototype.mergeObjects = function () { return mergeObjects(...this) };

async function varToYaml(variableName, variable) {
  const yamlString = yaml.dump(variable);
  const filePath = `test/${variableName}.yaml`;

  try {
    fs.writeFileSync(filePath, yamlString, 'utf8');
    console.log(`Variable saved as YAML in ${filePath}`);
  } catch (error) {
    console.error('Error saving variable as YAML:', error);
  }
}

async function getLastModifiedInFolders() {
  try {
    const paths = ['./', './app', './static'];
    const lastModifiedDates = await Promise.all(paths.map(async folderPath => {
      const files = await fs.promises.readdir(folderPath);
      const lastModifiedDates = await Promise.all(files.map(async file => {
        const filePath = path.join(folderPath, file);
        const stats = await fs.promises.stat(filePath);
        return stats.mtime;
      }));
      return Math.max(...lastModifiedDates);
    }));
    return Math.max(...lastModifiedDates);
  } catch (error) {
    console.error('Ошибка при получении даты последнего обновления:', error);
    throw error;
  }
}

async function parseUrl(request) {
  try {
    const protocol = request.protocol;
    const host = request.get('host');
    const urlPath = `${protocol}://${host}${request.url}`;
    const urlObject = new URL(urlPath);
    const urlSearchParams = urlObject.searchParams;
    const urlParamsObject = {};

    for (const [key, value] of urlSearchParams.entries()) {
      urlParamsObject[key] = value;
    }

    if (Object.keys(urlParamsObject).length === 0) {
      return null;
    }

    return urlParamsObject;
  } catch (error) {
    console.error(error);
    return null;
  }
}

const urlSpaceToUnderscore = (req, res, next) => {
  let decodedUrl = decodeURIComponent(req.url);
  req.originalUrl = req.url;
  req.url = encodeURI(decodedUrl.replace(/\s/g, '_'));
  next();
};

const liveSassCompiler = (req, res, next) => {
  const parentDirectory = path.join(__dirname, '..', '..', '..');
  if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
    const scssFilePath = path.join(parentDirectory, 'app', 'styles', req.url.replace('.css', '.scss'));

    if (fs.existsSync(scssFilePath)) {
      const result = sass.compile(scssFilePath, { style: 'compressed' });

      const stream = new Readable();
      stream._read = () => { };
      stream.push(result.css);
      stream.push(null);

      stream.pipe(res);
    } else {
      const scssSkinFilePath = path.join(parentDirectory, 'app', 'styles', 'skins', req.url.replace('.css', '.scss'));
      if (fs.existsSync(scssSkinFilePath)) {
        const child = spawn('node', ['-e', `
                    const sass = require('sass');
                    const fs = require('fs');
                    const scssFilePath = '${scssSkinFilePath}';
                    const result = sass.compile(scssFilePath, { style: 'compressed' });
                    process.stdout.write(result.css);
                `]);

        child.stdout.on('data', (data) => {
          res.write(data);
        });

        child.on('close', (code) => {
          res.end();
        });

        child.stderr.on('data', (data) => {
          console.error(`Ошибка: ${data}`);
          res.status(500).send('Ошибка компиляции SCSS');
        });
      } else {
        next();
      }
    }
  } else {
    next();
  }
}

function parseToInterval(intervalStr) {
  const match = intervalStr.match(/^(\d+)([shdwmy])$/);
  if (!match) {
    throw new Error('Invalid interval string. Valid examples: "1h", "7d", "2w", "9m", "10y"');
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    case 'm':
      return value * 30 * 24 * 60 * 60 * 1000;
    case 'y':
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid interval unit. Valid units: "h", "d", "w", "m", "y"');
  }
}

function parseToDays(intervalStr) {
  const match = intervalStr.match(/^(\d+)([shdwmy])$/);
  if (!match) {
    throw new Error('Неверная строка интервала. Примеры верных значений: "1h", "7d", "2w", "9m", "10y"');
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value / (24 * 60 * 60 * 1000);
    case 'h':
      return value / (60 * 60 * 1000);
    case 'd':
      return value;
    case 'w':
      return value * 7;
    case 'm':
      return value * 30;
    case 'y':
      return value * 365;
    default:
      throw new Error('Неверная единица интервала. Допустимые единицы: "h", "d", "w", "m", "y"');
  }
}


const parseSize = (sizeString) => {
  sizeString = sizeString.toUpperCase();
  if (sizeString.endsWith('K')) {
    return parseInt(sizeString.slice(0, -1)) * 1024;
  } else if (sizeString.endsWith('M')) {
    return parseInt(sizeString.slice(0, -1)) * 1024 * 1024;
  } else if (sizeString.endsWith('G')) {
    return parseInt(sizeString.slice(0, -1)) * 1024 * 1024 * 1024;
  } else if (sizeString.endsWith('T')) {
    return parseInt(sizeString.slice(0, -1)) * 1024 * 1024 * 1024 * 1024;
  }
  return parseInt(sizeString);
}

const space2underline = (str) => str.replace(/\s/g, '_');
const underline2space = (str) => str.replace(/\_/g, ' ');


function setResponseHeaders(req, res, next) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Project-name', serverConfig.server.wiki.project);
  res.setHeader('Project-core', `${serverConfig.server.wiki.core} ${serverConfig.server.wiki.version}`);
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'microphone=(), camera=()');


  if (!req.headers['nginx-active']) {
    res.setHeader('Project-proxy', 'Disabled');
  }

  next();
}


module.exports = {
  mergeObjects, varToYaml, getLastModifiedInFolders, parseUrl, urlSpaceToUnderscore, liveSassCompiler, parseToInterval,
  parseToDays, parseSize, space2underline, underline2space, setResponseHeaders
};