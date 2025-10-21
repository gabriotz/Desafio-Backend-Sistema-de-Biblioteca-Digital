const express = require('express');
const mainRouter = require('./routes'); // Importa o roteador principal

const app = express();

app.use(express.json()); 


app.use('/api/v1', mainRouter);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'API online' });
});

module.exports = app;