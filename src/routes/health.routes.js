// src/routes/health.routes.js
const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Sistema de biblioteca saudável!' });
});

module.exports = router;