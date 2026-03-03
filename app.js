'use strict';
const express = require('express');
const hbs = require('express-handlebars');
const app = express();
const port = 80;

app.engine('handlebars', hbs.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static('public'));

app.get('/', (req, res) =>{
    res.status(200).render('home', {title: "Home Page"});
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});