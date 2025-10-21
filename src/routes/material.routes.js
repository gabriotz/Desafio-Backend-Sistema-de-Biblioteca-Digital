const { Router } = require('express');
const { createMaterialController } = require('../controllers/material.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = Router();

// Rota para criar material protegida pelo middleware de autenticação
router.post('/', authenticateToken, createMaterialController);

module.exports = router;