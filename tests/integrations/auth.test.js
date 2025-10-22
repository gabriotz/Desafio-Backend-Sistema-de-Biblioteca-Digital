const request = require('supertest');
const app = require('../../src/app');
const prisma = global.prisma;
const jwt = require('jsonwebtoken');

describe('Auth Routes (POST /api/v1/users/register)', () => {
  beforeEach(async () => {
    // Limpa usuários de teste antes de cada teste
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['teste@exemplo.com', 'duplicado@exemplo.com']
        }
      }
    });
  });

  it('deve criar um novo usuário com sucesso', async () => {
    const response = await request(app)
      .post('/api/v1/users/register')
      .send({
        email: 'teste@exemplo.com',
        password: 'senha123',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('teste@exemplo.com');

    const userInDb = await prisma.user.findUnique({ where: { email: 'teste@exemplo.com' } });
    expect(userInDb).not.toBeNull();
    expect(userInDb.email).toBe('teste@exemplo.com');
  });

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

  it('deve retornar 409 para e-mail duplicado', async () => {
    // Primeiro, cria um usuário
    await request(app)
      .post('/api/v1/users/register')
      .send({ email: 'duplicado@exemplo.com', password: 'senha123' });

    // Tenta criar o MESMO usuário de novo
    const response = await request(app)
      .post('/api/v1/users/register')
      .send({ email: 'duplicado@exemplo.com', password: 'senha123' });

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe('Este e-mail já está em uso.');
  });
});

describe('Auth Routes (POST /api/v1/users/login)', () => {
  beforeEach(async () => {
    // Limpa usuários existentes primeiro
    await prisma.user.deleteMany({
      where: {
        email: 'usuario@teste.com'
      }
    });

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
  let testUser;

  beforeEach(async () => {
    // Limpa usuários existentes primeiro
    await prisma.user.deleteMany({
      where: { email: 'perfil@teste.com' }
    });

    // Cria usuário
    testUser = await prisma.user.create({
      data: {
        email: 'perfil@teste.com',
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      },
    });

    // Gera token
    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );
  });

  afterEach(async () => {
    // Limpeza mais agressiva
    await prisma.user.deleteMany({
      where: { email: 'perfil@teste.com' }
    });
  });

  test('deve retornar perfil do usuário com token válido', async () => {
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', 'perfil@teste.com');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).not.toHaveProperty('password');
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

    expect([401, 403]).toContain(response.statusCode);
  });

  test('deve retornar erro com token de usuário inexistente', async () => {
    const fakeToken = jwt.sign(
      { userId: 999999 },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );

    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect([401, 404, 500]).toContain(response.statusCode);
  });
});

// REMOVA qualquer describe block vazio no final do arquivo