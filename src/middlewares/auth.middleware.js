const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  //1. Separando o token
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Se não houver token, retorne 401 (Não Autorizado)
  if (token == null) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  // 3. Verificar se o token é válido
  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    
    // 4. Se o token for inválido (expirado, assinatura errada), retorne 403 (Proibido)
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }

    // 5. Se o token for válido, anexamos o payload (que contém o userId)
    //    ao objeto 'req' para que os controllers possam usá-lo.
    req.user = userPayload;

    // 6. Chame 'next()' para passar para o próximo middleware ou controller
    next();
  });
};

module.exports = {
  authenticateToken,
};