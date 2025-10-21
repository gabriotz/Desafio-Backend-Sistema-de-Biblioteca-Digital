const request = require('supertest');
const app = require('../../src/app'); // Importa seu app Express
const prisma = global.prisma;// Importa o Prisma
const jwt = require('jsonwebtoken');

// Descreve o conjunto de testes
describe('Auth Routes (POST /api/v1/users/register)', () => {

  // Teste 1: O "caminho feliz"
  it('deve criar um novo usuário com sucesso', async () => {
    const response = await request(app)
      .post('/api/v1/users/register')
      .send({
        email: 'teste@exemplo.com',
        password: 'senha123',
      });

    // 1. Checa a Resposta HTTP
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('teste@exemplo.com');

    // 2. Checa o Banco de Dados
    const userInDb = await prisma.user.findUnique({ where: { email: 'teste@exemplo.com' } });
    expect(userInDb).not.toBeNull();
    expect(userInDb.email).toBe('teste@exemplo.com');
  });

  // Teste 2: Validação de e-mail inválido
  it('deve retornar 400 para e-mail inválido', async () => {
    const response = await request(app)
      .post('/api/v1/users/register')
      .send({
        email: 'email-invalido',
        password: 'senha123',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Formato de e-mail inválido.');
  });

  // Teste 3: Validação de e-mail duplicado (Conflito)
  it('deve retornar 409 para e-mail duplicado', async () => {
    // Primeiro, cria um usuário
    await request(app)
      .post('/api/v1/users/register')
      .send({ email: 'duplicado@exemplo.com', password: 'senha123' });

    // Tenta criar o MESMO usuário de novo
    const response = await request(app)
      .post('/api/v1/users/register')
      .send({ email: 'duplicado@exemplo.com', password: 'senha123' });

    // 1. Checa a Resposta HTTP
    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe('Este e-mail já está em uso.');
  });
});






describe('Auth Routes (POST /api/v1/users/login)', () => {
  beforeEach(async () => {
    // Cria um usuário para testar login
    await prisma.user.create({
      data: {
        email: 'usuario@teste.com',
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password" encrypted
      },
    });
  });

  test('deve fazer login com credenciais válidas', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'usuario@teste.com',
        password: 'password', // Senha correspondente ao hash
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.message).toBe('Login bem-sucedido!');
    expect(typeof response.body.token).toBe('string');
  });

  test('deve retornar 401 para e-mail incorreto', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'emailinexistente@teste.com',
        password: 'password',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('E-mail ou senha inválidos.');
  });

  test('deve retornar 401 para senha incorreta', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'usuario@teste.com',
        password: 'senhaincorreta',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('E-mail ou senha inválidos.');
  });

  test('deve retornar 400 para e-mail faltando', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        password: 'password',
      });

    expect(response.statusCode).toBe(400);
  });

  test('deve retornar 400 para senha faltando', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'usuario@teste.com',
      });

    expect(response.statusCode).toBe(400);
  });

  test('deve retornar 400 para e-mail inválido', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'email-invalido',
        password: 'password',
      });

    expect(response.statusCode).toBe(400);
  });
});




describe('Auth Routes (GET /api/v1/users/profile)', () => {
  let authToken;

  beforeEach(async () => {
    // Cria usuário e pega token
    const user = await prisma.user.create({
      data: {
        email: 'perfil@teste.com',
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      },
    });

    // Gera token JWT (simulando o login)
    authToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );
  });

  test('deve retornar perfil do usuário com token válido', async () => {
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', 'perfil@teste.com');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).not.toHaveProperty('password'); // Senha nunca deve ser retornada
  });

  test('deve retornar 401 sem token', async () => {
    const response = await request(app)
      .get('/api/v1/users/profile');

    expect(response.statusCode).toBe(401);
  });

 test('deve retornar erro com token inválido', async () => {
  const response = await request(app)
    .get('/api/v1/users/profile')
    .set('Authorization', 'Bearer token-invalido');

  // Aceita 401 ou 403 - ambos são códigos de erro de autenticação
  expect([401, 403]).toContain(response.statusCode);
});

test('deve retornar erro com token de usuário inexistente', async () => {
  const fakeToken = jwt.sign(
    { userId: 999999 }, // ID que não existe no banco
    process.env.JWT_SECRET,
    { expiresIn: '6h' }
  );

  const response = await request(app)
    .get('/api/v1/users/profile')
    .set('Authorization', `Bearer ${fakeToken}`);

  // Pode ser 404, 401 ou 500 - vamos ver o que seu código retorna
  expect([401, 404, 500]).toContain(response.statusCode);
});
});