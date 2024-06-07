const { loadComponent } = require('./src/serverside/scripts/ComponentHandling.js');
require('dotenv').config();
require('./nk.config.js').config().init();
console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Server started\x1b[39m`);
app.use(compression());
app.use(express.static(path.join(__PROJECT_DIR__, 'static/assets')));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/public')));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/site.maps')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__PROJECT_DIR__, 'app'));
markdown.core.ruler.enable(['abbr']);
markdown.inline.ruler.enable(['ins', 'mark','footnote_inline', 'sub', 'sup']);
markdown.block.ruler.enable(['footnote', 'deflist']);

markdown.renderFile = async function (filePath, data) {
  const fileContent = await readFileAsync(filePath, 'utf8');
  const parsedContent = fileContent
    .replace(/```js\s\%([\s\S]*?)```/g, (match, code) => {
      try {
        const boundFunction = new Function('data', code).bind(null, data);
        return boundFunction();
      } catch (err) {
        console.log(err);
        return match;
      }
    })
    .replace(/\${((?!{[^{]*}).*?)}/g, (match, code) => {
      const varLink = code.match(/\.[\s\S]*?\)/g) ?
        code.replace(/\.[\s\S]*?\)/g, '').split('.').map(key => `[\"${key}\"]`).join('')
        : !code.includes('(') ? code.split('.').map(key => `[\"${key}\"]`).join('') : code;
      const varMethods = code.match(/(\.\w+\(.*?\))/g) ? code.match(/(\.\w+\(.*?\))/g).join('') : '';
      try {
        return new Function('data', `return data${varLink}${varMethods}`)(data);
      } catch (err) {
        try {
          return new Function('data', `return ${code}`)(data)
          } catch (err) {
          console.log(err);
          return `<span title="${err}" style="cursor: help">${match}</span>`;
        }
      }
    });
  return await markdown.render(parsedContent);
};

app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        const scssFilePath = path.join(__dirname, 'app', 'styles', req.url.replace('.css', '.scss'));

        if (fs.existsSync(scssFilePath)) {
            const result = sass.compile(scssFilePath, { style: 'compressed' });

            const stream = new Readable();
            stream._read = () => {};
            stream.push(result.css);
            stream.push(null);

            stream.pipe(res);
        } else {
            const scssSkinFilePath = path.join(__dirname, 'app', 'styles', 'skins', req.url.replace('.css', '.scss'));
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
});


const dataArray = [];
__NK__.langs.supported.forEach(lang => { dataArray.push({ source: `./static/assets/locale/common/main.${lang}.yaml`, as: `locale.${lang}` }) });
dataArray.push({ source: `./static/assets/locale/common/asset.common.yaml`, as: `locale.common` });
dataArray.push({ source: `./static/assets/locale/common/asset.templates.yaml`, as: `locale.templates` });

DataExtend(dataArray, __PROJECT_DIR__)
    .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [DATA-EXTEND] :: Extension of data completed\x1b[39m`))
    .catch(err => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [DATA-EXTEND] :: Error extending data: ${err.message}`));


app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

function generateUserId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let userId = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        userId += characters.charAt(randomIndex);
    }
    return userId;
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


app.get('/', async (request, response) => {
  try {
    console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 💠 > [SERVER] :: Latest modify date is [${new Date(await getLastModifiedInFolders()).toLocaleString()}]\x1b[39m`);
    const cookies = {};
    for (const cookieName in request.cookies) {
      for (const validCookie of VALID_COOKIES) {
        if (cookieName.startsWith(validCookie)) {
          const cookieKey = cookieName.split('.')[0];
          const cookieValue = request.cookies[cookieName];
          cookies[cookieKey] = cookies[cookieKey] || {};
          cookies[cookieKey][cookieName.substring(cookieKey.length + 1)] = cookieValue;
        }
      }
    }

    async function parseUrl() {
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
    const __META__ = {
      ...cookies,
      request: request,
      userURL: request.url,
      fullURL: `${request.protocol}://${request.get('host')}${request.url}`,
      domainURL: `${request.protocol}://${request.get('host')}`,
      userDevice: os.platform(),
      navigatorLanguage: request.headers['accept-language'],
      urlModes: await parseUrl(),
    };
    if (__META__.urlModes !== null) {
      if (
        __META__.urlModes.mode && !VALID_MODES.includes(__META__.urlModes.mode) ||
        __META__.urlModes.select && !VALID_SELECTED.includes(__META__.urlModes.select)
      ) {
        response.redirect('/');
        return;
      }
    }
    
    __META__.navigatorLanguage =
      __META__.urlModes && __META__.urlModes.lang ?
        __META__.urlModes.lang :
        (
          __NK__.langs.supported.includes(__META__.navigatorLanguage.substring(0, 2)) ?
            __META__.navigatorLanguage.substring(0, 2) :
            'en'
        );
    const __SETTING_CONFIG__ = new Map([
      ['lang', __META__.navigatorLanguage],
    ]);
    let __MANIFEST__ = await readFileAsync(path.join(`${__PROJECT_DIR__}/static/public/manifest/manifest.${__META__.navigatorLanguage}.webmanifest`), 'utf8');
    __MANIFEST__ = JSON.parse(__MANIFEST__);
    const __COMPILED_DATA = { __META__, __SETTING_CONFIG__, __MANIFEST__ };

    let DOCUMENT = ['TEST=test.pug', 'TEST2=test.md', 'HEAD=document/head', 'BODY=document/body'];
    let COMPONENT = ['HEADER'];
    for (let names of COMPONENT) {
      let [variable, path] = names.includes('=') ? names.split('=') : [names, names.toLowerCase()];
      Array.isArray(COMPONENT) && (COMPONENT = {});
      COMPONENT[variable] = await loadComponent(path.includes('components') ? path : `components/${path}`, { ...__COMPILED_DATA });
    }
    for (let names of DOCUMENT) {
      let [variable, path] = names.split('=');
      Array.isArray(DOCUMENT) && (DOCUMENT = {});
      DOCUMENT[variable] = await loadComponent(path, { ...COMPONENT, ...__COMPILED_DATA })
    }

    const Builded = await loadComponent('layout', { ...DOCUMENT, ...__COMPILED_DATA }).PostProcessor({ ...__COMPILED_DATA });

    response.send(Builded);
  } catch (error) {
    console.error(error);
    const errorText = error.stack.replace(/\n/g, '<br>');
    response.status(500).send(await loadComponent('500.pug', { errorText: errorText, navigatorLanguage: request.headers['accept-language'], currentURL: `${request.protocol}://${request.get('host')}${request.url}` }));
  }
});


app.get('/wiki', async (request, response) => {
  try {

    response.send('Future WIKI Section')
  } catch (error) {
    console.error(error);
    response.status(500).send(await loadComponent('500.pug', { errorText: errorText, navigatorLanguage: request.headers['accept-language'], currentURL: `${request.protocol}://${request.get('host')}${request.url}` }));
  }
});


app.use(async (req, res, next) => {
  const page = await loadComponent('404.pug', { navigatorLanguage: req.headers['accept-language'], currentURL: `${req.protocol}://${req.get('host')}${req.url}` });
  await res.status(404).send(page);
  next();
});


const server = app.listen(process.env.PORT, () => { 
  console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Runned server at [http://${process.env.HOST}:${process.env.PORT}]\x1b[39m`);
});
