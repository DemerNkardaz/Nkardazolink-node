const express = require('express');
const path = require('path');
const sassMiddleware = require('sass-middleware');
const markdownIt = require('markdown-it');
const app = express();
const md = markdownIt();
const yaml = require('js-yaml');
const jsonpath = require('jsonpath');
const $ = require('jquery');
const jzsip = require('jszip');
const port = 3000;


app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app'));


app.get('/', (request, resource) => {
  resource.render('index.page.ejs', {
    title: 'Server-Side Rendering with Node.js',
    message: 'Hello from the server!',
    request: request,
    userURL: request.url,
    navigatorLanguage: request.headers['accept-language']
  });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
