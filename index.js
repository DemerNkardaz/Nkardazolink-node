require('dotenv').config();
const { DataExtend } = require('./app/hooks/DataExtend.js');
const fs = require('fs');
const express = require('express');
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

DataExtend(dataArray, __PROJECT_DIR__)
    .then(() => console.log('Data extension complete'))
    .catch(err => console.error('Error extending data:', err));


global.__META__ = {};
global.__SETTING_CONFIG__ = [];

global.__STORAGE_GIVEN__ = false;

app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

app.post('/settings', (req, res) => {
  const settingsData = req.body;
  console.log('Полученные настройки:', settingsData);
  res.send('Настройки успешно получены и обработаны.');
  __STORAGE_GIVEN__ = true;
});


app.get('/', async (request, response) => {
  try {
    //const savedSettingsResponse = await fetch('/getSavedSettings');
    //const savedSettings = await savedSettingsResponse.json();
    
    __META__.request = request;
    __META__.userURL = request.url;
    __META__.navigatorLanguage = request.headers['accept-language']
    const getNavigatorLanguage = __META__.navigatorLanguage.includes('-') ? __META__.navigatorLanguage.split('-')[0] : __META__.navigatorLanguage;
    __NK__.langs.navigatorLanguage = __NK__.langs.supported.includes(getNavigatorLanguage) ? getNavigatorLanguage : 'en';

    __SETTING_CONFIG__ = new Map([
      ['lang', __NK__.langs.navigatorLanguage],
      []
    ]);


    const COMPONENT = {
      HEADER: await loadComponent('components/header'),
    }

    const DOCUMENT = {
      HEAD: await loadComponent('document/head', { ...COMPONENT }),
      BODY: await loadComponent('document/body', { ...COMPONENT })
    }

    response.render('layout.ejs', { ...DOCUMENT });
  } catch (error) {
    console.error(error);
    response.status(500).send(error.message);
  }
});

const [ PORT, HOST ] = [ 3000, 'localhost' ];
app.listen(PORT, () => { console.log(`Server is running on http://${HOST}:${PORT}`) });
