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

module.exports = { mergeObjects, varToYaml, getLastModifiedInFolders, parseUrl, urlSpaceToUnderscore, liveSassCompiler };