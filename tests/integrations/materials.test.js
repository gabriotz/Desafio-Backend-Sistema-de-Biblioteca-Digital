const request = require('supertest');
const app = require('../../src/app');
const prisma = global.prisma;
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);

// Mock do fetch global - DEVE SER NO TOPO DO ARQUIVO
global.fetch = jest.fn();

describe('Materials Integration Tests', () => {
  let userA, userB, tokenA, tokenB, authorA;

  // Conecta ao banco antes de todos os testes
  beforeAll(async () => {
    await prisma.$connect();
  });

  // Limpa o banco DEPOIS de CADA teste 'it'
  afterEach(async () => {
    await prisma.material.deleteMany();
    await prisma.autor.deleteMany();
    await prisma.user.deleteMany();
    jest.clearAllMocks();
  });

  // Desconecta do banco depois de todos os testes
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ===========================================
  // 1. TESTES DE CREATE (POST)
  // ===========================================
  describe('POST /api/v1/materials', () => {
    // Roda ANTES de CADA teste 'it' neste bloco
    beforeEach(async () => {
      userA = await prisma.user.create({
        data: {
          email: `user.a.post.${Date.now()}@teste.com`,
          password: 'password123',
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
      // FIX: Gerar ISBN dinâmico para evitar falha em DB sujo
      const dynamicIsbn = Date.now().toString(); // 13 dígitos

      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Livro de Teste Válido',
          type: 'LIVRO',
          authorId: authorA.id,
          status: 'PUBLICADO',
          isbn: dynamicIsbn, // Usando o ISBN dinâmico
          pages: 150,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Livro de Teste Válido');
      expect(response.body.isbn).toBe(dynamicIsbn);
    });

    it('deve criar um ARTIGO com sucesso (201)', async () => {
      // FIX: Gerar DOI dinâmico
      const dynamicDoi = `10.1000/${Date.now()}`;

      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Artigo de Teste Válido',
          type: 'ARTIGO',
          authorId: authorA.id,
          doi: dynamicDoi, // Usando o DOI dinâmico
        });

      expect(response.status).toBe(201);
      expect(response.body.doi).toBe(dynamicDoi);
    });

    // TESTE ADICIONADO para cobrir o controller
    it('deve criar um VIDEO com sucesso (201)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Video de Teste Válido',
          type: 'VIDEO',
          authorId: authorA.id,
          url: 'https://exemplo.com/video',
          durationMin: 10,
        });
        
      expect(response.status).toBe(201);
      expect(response.body.type).toBe('VIDEO');
      expect(response.body.url).toBe('https://exemplo.com/video');
    });

    it('deve falhar sem autenticação (401)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .send({
          title: 'Falha',
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: Date.now().toString(),
          pages: 10,
        });

      expect(response.status).toBe(401);
    });

    it('deve falhar se o autor não existir (404)', async () => {
      // FIX: Gerar ISBN dinâmico
      const dynamicIsbn = Date.now().toString();

      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Autor Inexistente',
          type: 'LIVRO',
          authorId: 99999, // ID que não existe
          isbn: dynamicIsbn,
          pages: 10,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Autor não encontrado com o ID fornecido.');
    });

    it('deve falhar com ISBN duplicado (409)', async () => {
      // FIX: Gerar o ISBN único dinamicamente
      const isbnUnico = Date.now().toString();

      // Primeiro livro (sucesso 201)
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

      // Segundo livro com mesmo ISBN (falha 409)
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
      expect(response.body.error).toBe('Este ISBN já está cadastrado.');
    });

    // Teste de validação do controller
    it('deve falhar ao criar LIVRO sem "isbn" ou "pages" (400)', async () => {
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Livro Inválido',
          type: 'LIVRO',
          authorId: authorA.id,
          // Faltando isbn e pages
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Para o tipo "LIVRO", os campos "isbn" e "pages" são obrigatórios (podem ser preenchidos via API).');
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
          password: 'password123',
        },
      });
      const tokenUserA = jwt.sign({ userId: userA.id }, process.env.JWT_SECRET);

      // Cria autor
      authorA = await prisma.autor.create({
        data: {
          name: `Autor GET ${Date.now()}`,
          type: 'PESSOA',
          data_nascimento: new Date('1990-01-01'),
        },
      });

      // Cria materiais via API para garantir que o creatorId seja setado
      const responsePublico = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Livro Público de Teste',
          type: 'LIVRO',
          authorId: authorA.id,
          status: 'PUBLICADO',
          isbn: `${Date.now()}`.slice(0, 13), // Dinâmico
          pages: 10,
        });

      materialPublico = responsePublico.body;

      const responseRascunho = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Artigo Rascunho de Teste',
          type: 'ARTIGO',
          authorId: authorA.id,
          status: 'RASCUNHO',
          doi: `10.1000/rascunho${Date.now()}`, // Dinâmico
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
      expect(response.body.error).toBe('Este material não está disponível publicamente.');
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
          password: 'password123',
        },
      });

      userB = await prisma.user.create({
        data: {
          email: `user.b.patch.${timestamp}@teste.com`,
          password: 'password123',
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
      expect(response.body.status).toBe('ARQUIVADO');
    });

    it('deve PROIBIR outro usuário (userB) de atualizar (403)', async () => {
      const response = await request(app)
        .patch(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenB}`) // Token do usuário errado
        .send({ title: 'Tentativa de Hack' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado. Você não é o criador deste material.');
    });

    it('deve PROIBIR outro usuário (userB) de deletar (403)', async () => {
      const response = await request(app)
        .delete(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenB}`); // Token do usuário errado

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado. Você não é o criador deste material.');
    });

    it('deve permitir o DONO (userA) deletar seu material (204)', async () => {
      const response = await request(app)
        .delete(`/api/v1/materials/${materialDoUserA.id}`)
        .set('Authorization', `Bearer ${tokenA}`); // Token do dono

      expect(response.status).toBe(204);

      // Verifica se foi deletado mesmo
      const findResponse = await request(app).get(`/api/v1/materials/${materialDoUserA.id}`);
      expect(findResponse.status).toBe(404); // Não deve mais encontrar
    });
  });
  // ===========================================
  // 4. TESTES DE INTEGRAÇÃO COM OPENLIBRARY API
  // ===========================================
  describe('Integração com OpenLibrary API', () => {
    let userA, tokenA, authorA;

    beforeEach(async () => {
      userA = await prisma.user.create({
        data: {
          email: `user.a.openlib.${Date.now()}@teste.com`,
          password: 'password123',
        },
      });

      tokenA = jwt.sign({ userId: userA.id }, process.env.JWT_SECRET);

      authorA = await prisma.autor.create({
        data: {
          name: `Autor OpenLib ${Date.now()}`,
          type: 'PESSOA',
          data_nascimento: new Date('1990-01-01'),
        },
      });
    });

    afterEach(async () => {
      await prisma.material.deleteMany();
    });

    it('deve preencher automaticamente título e páginas via ISBN da OpenLibrary (201)', async () => {
      // Mock da resposta da OpenLibrary
      const mockOpenLibraryResponse = {
        'ISBN:9788532511010': {
          title: 'Harry Potter e a Pedra Filosofal',
          number_of_pages: 264
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenLibraryResponse
      });

      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: '9788532511010',
          // Não enviando title e pages - devem ser preenchidos pela API
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Harry Potter e a Pedra Filosofal');
      expect(response.body.pages).toBe(264);
      expect(response.body.isbn).toBe('9788532511010');
      
      // Verifica se o fetch foi chamado com a URL correta
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openlibrary.org/api/books?bibkeys=ISBN:9788532511010&format=json&jscmd=data'
      );
    });

    it('deve usar título manual quando fornecido, mesmo com ISBN válido (201)', async () => {
      // Mock da resposta da OpenLibrary
      const mockOpenLibraryResponse = {
        'ISBN:9788532511011': {
          title: 'Harry Potter e a Pedra Filosofal',
          number_of_pages: 264
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenLibraryResponse
      });

      const tituloManual = 'Título Manual Sobrescrevendo API';
      
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: '9788532511011',
          title: tituloManual, // Título manual deve ter prioridade
          // pages não enviado - deve ser preenchido pela API
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(tituloManual); // Deve usar o título manual
      expect(response.body.pages).toBe(264); // Mas páginas da API
    });

    it('deve usar páginas manuais quando fornecidas, mesmo com ISBN válido (201)', async () => {
      // Mock da resposta da OpenLibrary
      const mockOpenLibraryResponse = {
        'ISBN:9788532511012': {
          title: 'Harry Potter e a Pedra Filosofal',
          number_of_pages: 264
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenLibraryResponse
      });

      const paginasManuais = 999;
      
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: '9788532511012',
          pages: paginasManuais, // Páginas manuais devem ter prioridade
          // title não enviado - deve ser preenchido pela API
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Harry Potter e a Pedra Filosofal'); // Título da API
      expect(response.body.pages).toBe(paginasManuais); // Mas páginas manuais
    });

    it('deve falhar com ISBN inválido mesmo sendo de livro (400)', async () => {
      const isbnInvalido = '123'; // ISBN muito curto
      
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: isbnInvalido,
          // Não enviando title e pages
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Formato de ISBN inválido');
      // O fetch não deve ser chamado para ISBN inválido
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve criar livro normalmente quando API retorna null mas campos foram fornecidos (201)', async () => {
      // Mock da resposta vazia (livro não encontrado)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Retorna objeto vazio
      });

      const isbnInexistente = '9999999999999';
      
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: isbnInexistente,
          title: 'Livro com ISBN Inexistente',
          pages: 100,
        });

      // Deve criar normalmente, pois title e pages foram fornecidos manualmente
      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Livro com ISBN Inexistente');
      expect(response.body.pages).toBe(100);
    });

    it('deve falhar quando API não retorna dados e campos não foram fornecidos (400)', async () => {
      // Mock da resposta vazia (livro não encontrado)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Retorna objeto vazio
      });

      const isbnInexistente = '8888888888888';
      
      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: isbnInexistente,
          // Não enviando title e pages - API não vai encontrar, então deve falhar
        });

      // Deve falhar porque nem API nem usuário forneceram title e pages
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('O Título (manual ou via ISBN) é obrigatório');
    });

    it('deve falhar quando API retorna título mas não páginas (400)', async () => {
      // Mock da resposta com título mas sem páginas
      const mockOpenLibraryResponse = {
        'ISBN:9788532511013': {
          title: 'Livro sem informações de páginas'
          // number_of_pages não está presente
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenLibraryResponse
      });

      const response = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'LIVRO',
          authorId: authorA.id,
          isbn: '9788532511013',
          // Não enviando pages - deve falhar mesmo com título da API
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('O Título (manual ou via ISBN) é obrigatório e deve ter entre 3 e 100 caracteres.');
    });
  });
});