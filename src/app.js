const express = require('express');
const cors = require('cors');
const mainRouter = require('./routes'); // Importa o roteador principal

const app = express();
app.use(cors());

app.use(express.json()); 


app.use('/api/v1', mainRouter);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'API online' });
});

module.exports = app;