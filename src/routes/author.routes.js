const { Router } = require('express');
const { createAuthorController } = require('../controllers/author.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = Router();

//Rota protegida pelo JWT
router.post('/', authenticateToken, createAuthorController);

module.exports = router;