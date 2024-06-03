const express = require('express');
const path = require('path');
const sassMiddleware = require('sass-middleware');
const markdownIt = require('markdown-it');
const app = express();
const md = markdownIt();
const port = 3000;

app.use(
  sassMiddleware({
    src: path.join(__dirname, 'app', 'styles'), // Путь к исходным файлам SASS
    dest: path.join(__dirname, 'public'), // Папка, куда будут скомпилированы CSS файлы
    debug: true,
    outputStyle: 'compressed',
    prefix: '/styles' // Префикс для URL, по которому будет доступен скомпилированный CSS
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app'));


app.get('/', (req, res) => {
  res.render('index.page.ejs', {
    title: 'Server-Side Rendering with Node.js',
    message: 'Hello from the server!',
    req: req
  });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
