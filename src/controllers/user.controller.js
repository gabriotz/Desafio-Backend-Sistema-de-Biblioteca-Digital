const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Helper para validação do email
const isEmailValid = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const createUserController = async (req, res) => {
  const { email, password } = req.body;

  // Validação do email e senha
  // campos obrigatórios
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  if(!isEmailValid(email)){
    return res.statues(400).json({error: 'Formato de email inválido'});
  }
  if (password.length < 6) { 
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' }); 
  }

  try {
    //Criptografia da senha em 10 salt rounds
    const hashedPassword = await bcrypt.hash(password,10); 

    //Salvar usuário no BD
    const newUser = await prisma.user.create({
        data: {
            email: email,
            password: hashedPassword,
        },
    });

    // Resposta de sucesso 
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      createdAt: newUser.createdAt,
    });

  } catch (error) {
    // Erro comum: email já existe (por causa do @unique) 
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ error: 'Este e-mail já está em uso.' }); 
    }

    // Outros erros
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Encontrar o usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // 2. Se o usuário não existir, retorne "Não autorizado"
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    // 3. Comparar a senha enviada com o hash salvo no banco
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // 4. Se a senha estiver incorreta, retorne "Não autorizado"
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    // 5. Se tudo estiver correto, gerar o Token JWT
    const token = jwt.sign(
      { userId: user.id }, // "Payload" - O que queremos guardar no token
      process.env.JWT_SECRET,   // O "segredo" do .env
      { expiresIn: '6h' }      // Tempo de expiração (ex: 1 dia)
    );

    // 6. Enviar o token para o usuário
    res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token,
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

const getProfileController = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      // Usamos 'select' para NUNCA retornar a senha
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};


module.exports = {
  createUserController,
  loginController,
  getProfileController,
};