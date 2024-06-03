require('dotenv').config();
const { DataExtend } = require('./app/hooks/DataExtend.js');
const { StringHandling } = require('./app/hooks/StringHandling.js');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const sassMiddleware = require('node-sass-middleware');
const sass = require('sass');
const markdownIt = require('markdown-it');
const app = express();
const os = require('os');
const md = markdownIt();
const yaml = require('js-yaml');
const jsonpath = require('jsonpath');
const $ = require('jquery');
const jzsip = require('jszip');
const ejs = require('ejs');
const { Readable } = require('stream');
const { URL } = require('url');

global.__PROJECT_DIR__ = path.resolve(__dirname);

const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'data_base/index.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка при открытии базы данных: ', err.message);
  } else {
    console.log('Успешно подключено к базе данных SQLite');
  }
});


const currencyConverter = require('currency-converter-lt');
const CC = (from, to, amount) => new Promise((resolve, reject) => {
  new currencyConverter({ from, to, amount })
    .convert()
    .then(resolve)
    .catch(reject);
});

//const USD_to_JPY = CC('USD', 'JPY', 100).then(result => console.log(result)).catch(console.error);
  

async function loadComponent(component, data) {
  try {
    const template = await ejs.renderFile(`app/${component}.ejs`, data || {});
    return template;
  }
  catch (error) {
    console.error(error);
  }
}

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


app.use(express.static(path.join(__PROJECT_DIR__, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__PROJECT_DIR__, 'app'));


global.__NK__ = {};
global.__NK__.url = [];
global.__NK__.langs = {};
global.__NK__.langs.list = {
  ru: { emoji: '🇷🇺', name: 'Русский' },
  en: { emoji: '🇬🇧', name: 'English' },
  ja: { emoji: '🇯🇵', name: '日本語' },
  zh: { emoji: '🇨🇳', name: '简体中文' },
  ko: { emoji: '🇰🇷', name: '한국어' },
  vi: { emoji: '🇻🇳', name: 'Tiếng Việt' },
  mo: { emoji: '🇲🇩', name: 'Молдовеняскэ' },
  ro: { emoji: '🇷🇴', name: 'Română' },
};
global.__NK__.langs.supported = Object.keys(__NK__.langs.list);


const dataArray = [];
__NK__.langs.supported.forEach(lang => { dataArray.push({ source: `./public/data/locale/common/main.${lang}.yaml`, as: `locale.${lang}` }) });
dataArray.push({ source: `./public/data/locale/common/asset.common.yaml`, as: `locale.common` });
dataArray.push({ source: `./public/data/locale/common/asset.templates.yaml`, as: `locale.templates` });

DataExtend(dataArray, __PROJECT_DIR__)
    .then(() => console.log('Data extension complete'))
    .catch(err => console.error('Error extending data:', err));


app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});


const VALID_COOKIES = ['savedSettings', 'latestCommands', 'selectedItems'];
const VALID_MODES = ['kamon', 'banners', 'clans', 'cv', 'landing', 'tree', 'license', 'pattern', 'reader'];
const VALID_SELECTED = ['2d', '3d'];



async function PagePrerender(pageTemplate, data) {
  try {
    const template = await ejs.renderFile(`app/${pageTemplate}.ejs`, data || {});
    const processedPage = eval('`' + await StringHandling(template) + '`');

    return processedPage;
  } catch (error) {
    console.error('Ошибка при обработке страницы:', error);
    return null;
  }
}


app.get('/', async (request, response) => {
  try {
    const cookies = {};
    for (const cookieName in request.cookies) {
      for (const validCookie of VALID_COOKIES) {
        if (cookieName.startsWith(validCookie)) {
          const cookieKey = cookieName.split('.')[0]; // Получаем первую часть куки (до точки)
          const cookieValue = request.cookies[cookieName];
          cookies[cookieKey] = cookies[cookieKey] || {};
          cookies[cookieKey][cookieName.substring(cookieKey.length + 1)] = cookieValue;
        }
      }
    }
    console.log(cookies);

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
    console.log(request.headers['accept-language']);
    const __META__ = {
      ...cookies,
      request: request,
      userURL: request.url,
      userDevice: os.platform(),
      navigatorLanguage: request.headers['accept-language'],
      urlModes: await parseUrl(),
    };
    
    console.log(__META__.userDevice);
    if (__META__.urlModes !== null) {
      if (
        __META__.urlModes.mode && !VALID_MODES.includes(__META__.urlModes.mode) ||
        __META__.urlModes.select && !VALID_SELECTED.includes(__META__.urlModes.select)
      ) {
        response.redirect('/');
        return;
      }
    }
    
    const getNavigatorLanguage = __META__.navigatorLanguage.substring(0, 2); // Получаем первые две буквы языка
    __META__.navigatorLanguage = __NK__.langs.supported.includes(getNavigatorLanguage) ? getNavigatorLanguage : 'en';

    const __SETTING_CONFIG__ = new Map([
      ['lang', __META__.navigatorLanguage],
    ]);

    const __COMPILED_DATA = { __META__, __SETTING_CONFIG__ };

    const COMPONENT = {
      HEADER: await loadComponent('components/header', { ...__COMPILED_DATA }),
    }

    const DOCUMENT = {
      HEAD: await loadComponent('document/head', { ...COMPONENT, ...__COMPILED_DATA }),
      BODY: await loadComponent('document/body', { ...COMPONENT, ...__COMPILED_DATA }),
    }

    const Builded = await PagePrerender('layout', { ...DOCUMENT, ...__COMPILED_DATA });

    response.send(Builded);
  } catch (error) {
    console.error(error);
    response.status(500).send(error.message);
  }
});

const [ PORT, HOST ] = [ 3000, 'localhost' ];
app.listen(PORT, () => { console.log(`Server is running on http://${HOST}:${PORT}`) });
