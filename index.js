
const DIR = __dirname;
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
    const template = await ejs.renderFile(`app/${component}.ejs`, data);
    return template;
  }
  catch (error) {
    console.error(error);
  }
}


app.use(express.static(path.join(DIR, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(DIR, 'app'));


app.get('/', async (request, resource) => {
  try {
    resource.setHeader('Content-Type', 'text/html; charset=utf-8');
    const META = {
      request: request,
      userURL: request.url,
      navigatorLanguage: request.headers['accept-language']
    }
    
    const transferedData = {
      title: 'Server-Side Rendering with Node.js',
      message: 'Hello from the server!',
      ...META,
      HEADER: await loadComponent('header', META)
    }


    resource.render('index.page.ejs', transferedData);
  }
  catch (error) {
    resource.render(error.message);
  }
});


const [ PORT, HOST ] = [ 3000, 'localhost' ];
server.listen(PORT, HOST, () => { console.log(`Server is running on http://${HOST}:${PORT}`) });
