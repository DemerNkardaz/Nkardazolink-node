const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app'));

app.get('/', (req, res) => {
    res.render('index.page.ejs', { title: 'Server-Side Rendering with Node.js', message: 'Hello from the server!' });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
