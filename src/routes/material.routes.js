const { Router } = require('express');
const {
  createMaterialController,
  getAllMaterialsController,
  getMaterialByIdController,
  updateMaterialController, 
  deleteMaterialController, 
} = require('../controllers/material.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = Router();

// Rotas Públicas 
router.get('/', getAllMaterialsController);
router.get('/:id', getMaterialByIdController);

// Rotas Protegidas (Requerem Token)
router.post('/', authenticateToken, createMaterialController);

// PATCH /api/v1/materials/:id (Atualizar)
router.patch('/:id', authenticateToken, updateMaterialController); // <--- 2. VERIFIQUE SE ESTA LINHA EXISTE

// DELETE /api/v1/materials/:id (Remover)
router.delete('/:id', authenticateToken, deleteMaterialController); // <--- 2. VERIFIQUE SE ESTA LINHA EXISTE

module.exports = router;