const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
require('dotenv').config();

const app = express();

app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/route'));

app.listen(3000, () => {
    console.log('JUPITER Server running on port 3000');
});