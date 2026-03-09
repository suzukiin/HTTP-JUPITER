const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');

const app = express();

// Configuração do express-handlebars
app.engine('hbs', engine({
    extname: '.hbs', // Usa a extensão mais curta .hbs
    defaultLayout: 'main', // Aponta para views/layouts/main.hbs
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Servir arquivos estáticos (CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.use('/', require('./routes/route'));

app.listen(8080, () => {
    console.log('JUPITER Server running on port 8080');
});