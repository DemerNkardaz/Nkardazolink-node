const express = require('express');
const path = require('path');
const sass = require('sass');
const app = express();
const port = 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'app/styles')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app'));

app.get('/', (req, res) => {
    res.render('index.page.ejs', { title: 'Server-Side Rendering with Node.js', message: 'Hello from the server!' });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
