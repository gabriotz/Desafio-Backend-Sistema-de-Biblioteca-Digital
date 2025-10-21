const { Router } = require('express');
const { loginController,
        createUserController,
        getProfileController 
    } = require('../controllers/user.controller');

const router = Router();

const { authenticateToken } = require('../middlewares/auth.middleware.js');

// rota de registro
router.post('/register', createUserController);
// rota de login
router.post('/login', loginController); // <--- ADICIONE ESTA LINHA

// rotas protegidas pelo JWT
router.get('/profile', authenticateToken,getProfileController)

module.exports = router;