const request = require('supertest');
const app = require('../../src/app');
const prisma = require('@prisma/client');

const jwt = require('jsonwebtoken');

describe('Materials Integration Tests', () => {
  let userA, userB, tokenA, tokenB, authorA;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    await prisma.material.deleteMany();
    await prisma.autor.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ===========================================
  // 1. TESTES DE CREATE (POST)
  // ===========================================
  describe('POST /api/v1/materials', () => {
    beforeEach(async () => {
      userA = await prisma.user.create({
        data: { 
          email: `user.a.post.${Date.now()}@teste.com`, 
          password: 'password123' 
        },
      });

      tokenA = jwt.sign({ userId: userA.id }, process.env.JWT_SECRET);

      authorA = await prisma.autor.create({
        data: {
          name: `Autor POST ${Date.now()}`,
          type: 'PESSOA',
          data_nascimento: new Date('1990-01-01'),
        },
      });
    });

    it('deve criar um LIVRO com sucesso (201)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Livro de Teste Válido',
          type: 'LIVRO',
          authorId: authorA.id,
          status: 'PUBLICADO',
          isbn: '1234567890123',
          pages: 150,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Livro de Teste Válido');
    });

    it('deve criar um ARTIGO com sucesso (201)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Artigo de Teste Válido',
          type: 'ARTIGO',
          authorId: authorA.id,
          doi: '10.1000/xyz123',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.doi).toBe('10.1000/xyz123');
    });

    it('deve falhar sem autenticação (401)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .send({ 
          title: 'Falha', 
          type: 'LIVRO', 
          authorId: authorA.id 
        });
      
      expect(response.status).toBe(401);
    });

    it('deve falhar se o autor não existir (404)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Autor Inexistente',
          type: 'LIVRO',
          authorId: 99999,
          isbn: '1112223334445',
          pages: 10,
        });
      
      expect(response.status).toBe(404);
    });

    it('deve falhar com ISBN duplicado (409)', async () => {
      const isbnUnico = '9876543210987';
      
      // Primeiro livro
      await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Livro Original',
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: isbnUnico,
          pages: 100,
        });

      // Segundo livro com mesmo ISBN
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Livro Duplicado',
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: isbnUnico,
          pages: 200,
        });

      expect(response.status).toBe(409);
    });
  });

  // ===========================================
  // 2. TESTES DE READ (GET)
  // ===========================================
  describe('GET /api/v1/materials', () => {
    let materialPublico, materialRascunho;

    beforeEach(async () => {
      // Cria usuário
      userA = await prisma.user.create({
        data: { 
          email: `user.a.get.${Date.now()}@teste.com`, 
          password: 'password123' 
        },
      });

      // Cria autor
      authorA = await prisma.autor.create({
        data: {
          name: `Autor GET ${Date.now()}`,
          type: 'PESSOA',
          data_nascimento: new Date('1990-01-01'),
        },
      });

      // Cria materiais via API para garantir que o creatorId seja setado corretamente
      const responsePublico = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${jwt.sign({ userId: userA.id }, process.env.JWT_SECRET)}`)
        .send({
          title: 'Livro Público de Teste',
          type: 'LIVRO',
          authorId: authorA.id,
          status: 'PUBLICADO',
          isbn: `111${Date.now()}`.slice(0, 13),
          pages: 10,
        });

      materialPublico = responsePublico.body;

      const responseRascunho = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${jwt.sign({ userId: userA.id }, process.env.JWT_SECRET)}`)
        .send({
          title: 'Artigo Rascunho de Teste',
          type: 'ARTIGO',
          authorId: authorA.id,
          status: 'RASCUNHO',
          doi: `10.1000/rascunho${Date.now()}`,
        });

      materialRascunho = responseRascunho.body;
    });

    it('deve listar APENAS materiais PUBLICADOS (200)', async () => {
      const response = await request(app).get('/api/v1/materials');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Livro Público de Teste');
    });

    it('deve filtrar materiais por título (200)', async () => {
      const response = await request(app).get('/api/v1/materials?title=Público');
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Livro Público de Teste');
    });

    it('deve retornar vazio se o filtro não encontrar nada (200)', async () => {
      const response = await request(app).get('/api/v1/materials?title=Inexistente');
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('deve acessar um material público por ID (200)', async () => {
      const response = await request(app).get(`/api/v1/materials/${materialPublico.id}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Livro Público de Teste');
    });

    it('deve ser PROIBIDO de ver um RASCUNHO por ID (403)', async () => {
      const response = await request(app).get(`/api/v1/materials/${materialRascunho.id}`);
      
      expect(response.status).toBe(403);
    });
  });

  // ===========================================
  // 3. TESTES DE UPDATE & DELETE
  // ===========================================
  describe('PATCH & DELETE /api/v1/materials/:id', () => {
    let materialDoUserA;

    beforeEach(async () => {
      const timestamp = Date.now();
      
      // Cria usuários
      userA = await prisma.user.create({
        data: { 
          email: `user.a.patch.${timestamp}@teste.com`, 
          password: 'password123' 
        },
      });

      userB = await prisma.user.create({
        data: { 
          email: `user.b.patch.${timestamp}@teste.com`, 
          password: 'password123' 
        },
      });

      // Cria tokens
      tokenA = jwt.sign({ userId: userA.id }, process.env.JWT_SECRET);
      tokenB = jwt.sign({ userId: userB.id }, process.env.JWT_SECRET);

      // Cria autor
      authorA = await prisma.autor.create({
        data: {
          name: `Autor PATCH ${timestamp}`,
          type: 'PESSOA',
          data_nascimento: new Date('1990-01-01'),
        },
      });

      // Cria material via API para garantir creatorId correto
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Material do User A',
          type: 'VIDEO',
          authorId: authorA.id,
          status: 'PUBLICADO',
          url: 'http://video.com',
          durationMin: 10,
        });

      materialDoUserA = response.body;
    });

    it('deve permitir o DONO (userA) atualizar seu material (200)', async () => {
      const response = await request(app)
        .patch(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Título Atualizado pelo Dono',
          status: 'ARQUIVADO',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Título Atualizado pelo Dono');
    });

    it('deve PROIBIR outro usuário (userB) de atualizar (403)', async () => {
      const response = await request(app)
        .patch(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Tentativa de Hack' });
      
      expect(response.status).toBe(403);
    });

    it('deve PROIBIR outro usuário (userB) de deletar (403)', async () => {
      const response = await request(app)
        .delete(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      
      expect(response.status).toBe(403);
    });

    it('deve permitir o DONO (userA) deletar seu material (204)', async () => {
      const response = await request(app)
        .delete(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      
      expect(response.status).toBe(204);
    });
  });
});