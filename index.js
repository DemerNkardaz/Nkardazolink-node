const { DataExtend } = require('./app/hooks/DataExtend.js');

const fs = require('fs');
const express = require('express');
const http = require('http');
const path = require('path');
const markdownIt = require('markdown-it');
const app = express();
const server = http.createServer((request, resource) => { app(request, resource) });
const os = require('os');
const md = markdownIt();
const yaml = require('js-yaml');
const jsonpath = require('jsonpath');
const $ = require('jquery');
const jzsip = require('jszip');

const ejs = require('ejs');

const DIR = path.resolve(__dirname);

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


app.use(express.static(path.join(DIR, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(DIR, 'app'));


global.__NK__ = {};
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

DataExtend(dataArray, DIR)
    .then(() => console.log('Data extension complete'))
    .catch(err => console.error('Error extending data:', err));


global.__META__ = {};
global.__SETTING_CONFIG__ = [];


app.get('/', async (request, response) => {
  try {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    //const savedSettingsResponse = await fetch('/getSavedSettings');
    //const savedSettings = await savedSettingsResponse.json();

    global.__META__.request = request;
    global.__META__.userURL = request.url;
    global.__META__.navigatorLanguage = request.headers['accept-language']
    const getNavigatorLanguage = __META__.navigatorLanguage.includes('-') ? __META__.navigatorLanguage.split('-')[0] : __META__.navigatorLanguage;
    __NK__.langs.navigatorLanguage = __NK__.langs.supported.includes(getNavigatorLanguage) ? getNavigatorLanguage : 'en';

    __SETTING_CONFIG__ = new Map([
      ['lang', __NK__.langs.navigatorLanguage],
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
server.listen(PORT, HOST, () => { console.log(`Server is running on http://${HOST}:${PORT}`) });
