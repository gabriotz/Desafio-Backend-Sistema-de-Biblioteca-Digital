# Desafio Backend - Sistema de Biblioteca Digital

![Node.js](https://img.shields.io/badge/Node.js-18.x+-339933?style=for-the-badge&logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql)
[![Deploy](https://img.shields.io/badge/Deploy-Render-000?style=for-the-badge&logo=render)](https://desafio-backend-sistema-de-biblioteca.onrender.com/)

API RESTful desenvolvida em **Node.js** com **Express.js** e **Prisma ORM** para gerenciar uma plataforma de biblioteca digital. Usuários autenticados podem cadastrar, buscar, visualizar e gerenciar diferentes tipos de materiais (livros, artigos, vídeos), associando-os a autores (pessoas ou instituições).

**A aplicação está disponível online (deploy no Render):**
[https://desafio-backend-sistema-de-biblioteca.onrender.com/](https://desafio-backend-sistema-de-biblioteca.onrender.com/)

*(O frontend simples é servido na rota raiz deste link)*

---

## 📚 Sumário

1.  [Descrição Geral](#1-descrição-geral)
2.  [Funcionalidades Implementadas](#2-funcionalidades-implementadas)
3.  [Tecnologias Utilizadas](#3-tecnologias-utilizadas)
4.  [Estrutura do Projeto](#4-estrutura-do-projeto)
5.  [API Endpoints e Exemplos](#5-api-endpoints-e-exemplos)
6.  [Setup e Instalação Local](#6-setup-e-instalação-local)
7.  [Autenticação (Detalhes)](#7-autenticação-detalhes)
8.  [Regras de Negócio e Validações](#8-regras-de-negócio-e-validações-chave)
9.  [Diferenciais Implementados](#9-diferenciais-implementados)
10. [Resultados dos Testes](#10-testes-automatizados-resultados)

---

## 1. Descrição Geral

O sistema implementa:

* Autenticação segura via **JWT** e criptografia de senhas com **bcrypt**.
* Validações robustas de dados de entrada usando um pipeline de validação.
* Permissões de acesso baseadas no criador do material (somente o criador pode atualizar ou excluir).
* Integração com a API externa **OpenLibrary Books** para enriquecimento de dados de livros via ISBN.
* Banco de dados **PostgreSQL** gerenciado pelo Prisma ORM.
* **Testes automatizados** de integração com Jest e Supertest.
* Um **mini frontend** simples para interação e teste da API.

## 2. Funcionalidades Implementadas

* **Autenticação de Usuários:**
    * Cadastro (`/api/v1/users/register`) com email e senha (mínimo 6 caracteres). Senha armazenada com hash bcrypt. Validação de email único.
    * Login (`/api/v1/users/login`) gerando um token JWT (válido por 6h).
    * Rota de Perfil (`/api/v1/users/profile`, Protegida) para visualizar dados do usuário autenticado.

* **Gerenciamento de Autores:**
    * Cadastro (`/api/v1/authors`, Protegida) de autores do tipo `PESSOA` ou `INSTITUICAO`.
    * Validações específicas:
        * **Pessoa:** Nome (3-80 caracteres), data de nascimento obrigatória, válida e não futura.
        * **Instituição:** Nome (3-120 caracteres), cidade obrigatória (2-80 caracteres).

* **Gerenciamento de Materiais:**
    * Cadastro (`/api/v1/materials`, Protegida) de materiais dos tipos `LIVRO`, `ARTIGO`, `VIDEO`.
    * Campos genéricos: `title` (obrigatório, 3-100 caracteres), `description` (opcional, máx 1000 caracteres), `status` (obrigatório, `RASCUNHO`, `PUBLICADO`, `ARQUIVADO`, default `RASCUNHO`), `authorId` (obrigatório, deve existir), `creatorId` (associado automaticamente ao usuário autenticado).
    * **Integração com OpenLibrary:** Para `LIVRO`, se `isbn` for fornecido e `title` ou `pages` omitidos, busca dados na API externa. Dados manuais têm prioridade.
    * Campos específicos e validações:
        * **LIVRO:** `isbn` (obrigatório, único, 13 dígitos numéricos), `pages` (obrigatório, > 0).
        * **ARTIGO:** `doi` (obrigatório, único, formato DOI válido, ex: `10.1000/xyz123`).
        * **VIDEO:** `url` (obrigatório), `durationMin` (obrigatório, inteiro > 0).
    * **Permissões:** Apenas o usuário criador (`creatorId`) pode `atualizar` (PATCH) ou `excluir` (DELETE) um material.
    * **Unicidade:** Garante que ISBN e DOI sejam únicos na base de dados.

* **Busca e Visualização:**
    * Listagem pública (`GET /api/v1/materials`) de materiais com status `PUBLICADO`.
    * **Filtros (Query Params):** `title`, `authorName`, `description` (contêm, case-insensitive), `type` (igual, case-insensitive).
    * **Paginação (Query Params):** `page` (número da página, default 1), `limit` (itens por página, default 10).
    * Busca por ID (`GET /api/v1/materials/:id`) retorna um material específico, somente se `PUBLICADO`.

* **Testes Automatizados:**
    * Testes de integração usando Jest e Supertest.
    * Cobrem cadastro, login, CRUD de materiais, permissões, filtros, paginação, validações de dados e consumo da API externa.

## 3. Tecnologias Utilizadas

| Categoria | Tecnologia |
| :--- | :--- |
| **Backend** | Node.js, Express.js |
| **ORM** | Prisma |
| **Banco de Dados** | PostgreSQL |
| **Autenticação** | JWT (jsonwebtoken), Bcryptjs |
| **Testes** | Jest, Supertest |
| **Utilitários** | dotenv, nodemon, dotenv-cli |
| **Deploy** | Render |

## 4. Estrutura do Projeto

Abaixo está uma visão geral da organização das pastas e arquivos principais:

* `/` (Raiz)
    * **prisma/**
        * `migrations/` - Armazena as migrações do banco de dados.
        * `schema.prisma` - Arquivo principal do Prisma (modelos, datasource).
    * **src/**
        * `config/` - Configuração do cliente Prisma.
        * `controllers/` - Lógica de negócio e validação de entrada (request).
        * `generated/` - Cliente Prisma gerado automaticamente.
        * `middlewares/` - Middlewares (ex: `authMiddleware` para JWT).
        * `routes/` - Definição de todas as rotas da API.
        * `app.js` - Configuração principal do Express (rotas, middlewares globais).
        * `server.js` - Inicialização do servidor HTTP.
    * **tests/**
        * `integrations/` - Testes de integração (ex: `auth.test.js`, `materials.test.js`).
        * `setup.js` - Configuração global dos testes Jest com Prisma.
    * **frontend/**
        * `index.html` - Estrutura do mini frontend.
        * `script.js` - Lógica de consumo da API (frontend).
        * `style.css` - Estilos do mini frontend.
    * `.env` - Variáveis de ambiente locais (desenvolvimento).
    * `.env.test` - Variáveis de ambiente para o banco de testes.
    * `.gitignore` - Arquivos ignorados pelo Git.
    * `jest.config.js` - Configuração do Jest.
    * `package.json` - Dependências e scripts do projeto.
    * `README.md` - Este arquivo.

## 5. API Endpoints e Exemplos

A base URL para a API V1 é `/api/v1`.

<details>
<summary><strong>Autenticação (`/users`)</strong></summary>

---

* **`POST /register`**: Cria um novo usuário.
    * **Body:** `{ "email": "user@example.com", "password": "password123" }`
    * **Resposta (201):** `{ "id": 1, "email": "user@example.com", "createdAt": "..." }`
    * **Erros:** 400 (dados inválidos/faltando), 409 (email já existe).

* **`POST /login`**: Autentica um usuário.
    * **Body:** `{ "email": "user@example.com", "password": "password123" }`
    * **Resposta (200):** `{ "message": "Login bem-sucedido!", "token": "JWT_TOKEN_AQUI" }`
    * **Erros:** 400 (dados inválidos/faltando), 401 (credenciais inválidas).

* **`GET /profile`**: (Requer Auth: Bearer Token) Retorna o perfil do usuário logado.
    * **Resposta (200):** `{ "id": 1, "email": "user@example.com", "createdAt": "..." }`
    * **Erros:** 401 (sem token), 403 (token inválido), 404 (usuário não encontrado).

---
</details>

<details>
<summary><strong>Autores (`/authors`)</strong></summary>

---

* **`POST /`**: (Requer Auth: Bearer Token) Cria um novo autor.
    * **Body (Pessoa):** `{ "name": "Nome do Autor", "type": "PESSOA", "data_nascimento": "1990-01-15" }`
    * **Body (Instituição):** `{ "name": "Nome da Instituição", "type": "INSTITUICAO", "cidade": "Nome da Cidade" }`
    * **Resposta (201):** `{ "id": 1, "name": "...", "type": "...", ... }`
    * **Erros:** 400 (dados inválidos/faltando), 401 (sem token), 403 (token inválido).

---
</details>

<details>
<summary><strong>Materiais (`/materials`)</strong></summary>

---

* **`POST /`**: (Requer Auth: Bearer Token) Cria um novo material.
    * **Body (Livro com ISBN para busca):**
        ```json
        {
          "type": "LIVRO",
          "authorId": 1,
          "status": "PUBLICADO",
          "isbn": "9788532511010"
        }
        ```
    * **Body (Livro manual):**
        ```json
        {
          "title": "Livro Manual",
          "type": "LIVRO",
          "authorId": 1,
          "status": "RASCUNHO",
          "isbn": "1111111111111",
          "pages": 250,
          "description": "Descrição opcional"
        }
        ```
    * **Body (Artigo):**
        ```json
        {
          "title": "Título do Artigo",
          "type": "ARTIGO",
          "authorId": 2,
          "doi": "10.1000/xyz123"
        }
        ```
    * **Body (Vídeo):**
        ```json
        {
          "title": "Título do Vídeo",
          "type": "VIDEO",
          "authorId": 1,
          "url": "[https://example.com/video.mp4](https://example.com/video.mp4)",
          "durationMin": 15
        }
        ```
    * **Resposta (201):** `{ "id": 1, "title": "...", ..., "author": { ... }, "creator": { ... } }` (Inclui objeto `author` e `creator`)
    * **Erros:** 400 (dados inválidos/faltando, ISBN/DOI formato inválido, autor não existe), 401 (sem token), 403 (token inválido), 404 (autor não encontrado), 409 (ISBN/DOI duplicado).

* **`GET /`**: Lista materiais públicos com filtros e paginação.
    * **Query Params:**
        * `page` (Number, default 1): Número da página.
        * `limit` (Number, default 10): Itens por página.
        * `title` (String): Filtra por título (contém, case-insensitive).
        * `authorName` (String): Filtra por nome do autor (contém, case-insensitive).
        * `description` (String): Filtra por descrição (contém, case-insensitive).
        * `type` (String): Filtra por tipo (ex: `LIVRO`, `ARTIGO`).
    * **Exemplo:** `GET /api/v1/materials?page=2&limit=5&title=Teste&authorName=Autor`
    * **Resposta (200):**
        ```json
        {
          "data": [ { "id": ..., "title": "...", ... } ],
          "pagination": {
            "totalItems": 15,
            "totalPages": 3,
            "currentPage": 2,
            "itemsPerPage": 5
          }
        }
        ```

* **`GET /:id`**: Retorna um material público pelo ID.
    * **Exemplo:** `GET /api/v1/materials/5`
    * **Resposta (200):** `{ "id": 5, "title": "...", ..., "author": { ... }, "creator": { ... } }`
    * **Erros:** 400 (ID inválido), 403 (material não público), 404 (material não encontrado).

* **`PATCH /:id`**: (Requer Auth: Bearer Token) Atualiza um material (só criador).
    * **Body:** `{ "title": "Novo Título", "status": "ARQUIVADO", "description": "Nova descrição" }` (Campos são opcionais)
    * **Resposta (200):** Objeto do material atualizado.
    * **Erros:** 400 (dados inválidos, ID inválido), 401 (sem token), 403 (não é o criador / token inválido), 404 (material não encontrado).

* **`DELETE /:id`**: (Requer Auth: Bearer Token) Remove um material (só criador).
    * **Resposta (204):** Sem conteúdo.
    * **Erros:** 400 (ID inválido), 401 (sem token), 403 (não é o criador / token inválido), 404 (material não encontrado).

---
</details>

## 6. Setup e Instalação Local

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/gabriotz/Desafio-Backend-Sistema-de-Biblioteca-Digital.git](https://github.com/gabriotz/Desafio-Backend-Sistema-de-Biblioteca-Digital.git)
    cd Desafio-Backend-Sistema-de-Biblioteca-Digital
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**
    * Crie um arquivo `.env` na raiz para desenvolvimento:
        ```env
        # Exemplo para PostgreSQL rodando localmente
        DATABASE_URL="postgresql://SEU_USER:SUA_SENHA@localhost:5432/biblioteca_dev?schema=public"
        JWT_SECRET="SEU_SEGREDO_JWT_SUPER_SECRETO"
        PORT=3000
        ```
    * Crie um arquivo `.env.test` para o banco de dados de teste:
        ```env
        # Exemplo para PostgreSQL (banco de dados diferente)
        DATABASE_URL="postgresql://SEU_USER:SUA_SENHA@localhost:5432/biblioteca_test?schema=public"
        JWT_SECRET="SEU_SEGREDO_JWT_SUPER_SECRETO_PARA_TESTES"
        ```
    * *Substitua os valores de usuário, senha, host, porta e nome do banco pelos seus.*

4.  **Banco de Dados:**
    * Certifique-se de ter o PostgreSQL instalado e rodando.
    * Crie os bancos de dados (`biblioteca_dev` e `biblioteca_test` no exemplo acima) manualmente.
    * **Aplique as migrations:**
        ```bash
        # Aplica no banco de desenvolvimento (usa .env)
        npx prisma migrate deploy

        # Aplica no banco de teste (usa .env.test) - Necessário antes de rodar os testes
        npm run test:migrate
        ```

5.  **Rodar a Aplicação:**
    * **Modo de Desenvolvimento (com nodemon):**
        ```bash
        npm run dev
        ```
        A API estará disponível em `http://localhost:3000` (ou a porta definida em `.env`).
    * **Modo de Produção:**
        ```bash
        npm start
        ```

6.  **Rodar os Testes:**
    * Certifique-se de ter rodado `npm run test:migrate` pelo menos uma vez.
    * Execute os testes:
        ```bash
        npm test
        ```

## 7. Autenticação (Detalhes)

* A API usa JSON Web Tokens (JWT) assinados com o `JWT_SECRET` definido no `.env`.
* Após o login (`POST /api/v1/users/login`), o token retornado deve ser enviado em requisições subsequentes para rotas protegidas no cabeçalho `Authorization`.
* **Formato do Cabeçalho:** `Authorization: Bearer <SEU_TOKEN_JWT>`

## 8. Regras de Negócio e Validações Chave

* **Permissões:** Materiais só podem ser alterados/excluídos pelo seu `creatorId` (usuário que o cadastrou).
* **Unicidade:** `ISBN` e `DOI` devem ser únicos na base de dados para evitar duplicidade.
* **Integridade:** Não é possível associar um material a um `authorId` que não exista.
* **Relacionamento:** Um autor pode ter vários materiais, mas um material tem apenas um autor.
* **Enum:** O `status` só pode ser alterado para valores válidos (`RASCUNHO`, `PUBLICADO`, `ARQUIVADO`).
* **Visibilidade:** A busca geral (`GET /materials`) e a busca por ID (`GET /materials/:id`) **retornam apenas materiais com status `PUBLICADO`**. Acesso a materiais não-públicos por ID resulta em erro 403.

## 9. Diferenciais Implementados

Conforme os requisitos do desafio, os seguintes diferenciais foram implementados:

* ✅ **Deploy online:** Aplicação e banco de dados hospedados no Render.
* ✅ **Mini frontend simples:** Um frontend básico (HTML, CSS, JS) para consumir a API está incluído e servido pela própria aplicação na rota raiz.
* ✅ **Testes Automatizados:** Cobertura de testes de integração para as principais funcionalidades, incluindo autenticação, CRUD de materiais, permissões, filtros, paginação e consumo da API externa.

## 10. Testes Automatizados (Resultados)

Abaixo está um exemplo da saída da suíte de testes de integração (`npm test`), demonstrando a cobertura das regras de negócio e endpoints.

```bash
 PASS  tests/integrations/auth.test.js (16.891 s)
  Auth Routes (POST /api/v1/users/register)
    √ deve criar um novo usuário com sucesso (2982 ms)
    √ deve retornar 400 para e-mail inválido (237 ms)
    √ deve retornar 409 para e-mail duplicado (1028 ms)
  Auth Routes (POST /api/v1/users/login)
    √ deve fazer login com credenciais válidas (1457 ms)
    √ deve retornar 401 para e-mail incorreto (705 ms)
    √ deve retornar 401 para senha incorreta (827 ms)
    √ deve retornar 400 para e-mail faltando (481 ms)
    √ deve retornar 400 para senha faltando (470 ms)
    √ deve retornar 400 para e-mail inválido (470 ms)
  Auth Routes (GET /api/v1/users/profile)
    √ deve retornar perfil do usuário com token válido (1166 ms)
    √ deve retornar 401 sem token (800 ms)
    √ deve retornar erro com token inválido (735 ms)
    √ deve retornar erro com token de usuário inexistente (951 ms)

 PASS  tests/integrations/materials.test.js
  Materials Integration Tests
    POST /api/v1/materials
      √ deve criar um LIVRO com sucesso (201) (6606 ms)
      √ deve criar um ARTIGO com sucesso (201) (3032 ms)
      √ deve criar um VIDEO com sucesso (201) (3133 ms)
      √ deve falhar sem autenticação (401) (1176 ms)
      √ deve falhar se o autor não existir (404) (1646 ms)
      √ deve falhar com ISBN duplicado (409) (4082 ms)
      √ deve falhar ao criar LIVRO sem "isbn" ou "pages" (400) (1444 ms)
    GET /api/v1/materials
      √ deve listar APENAS materiais PUBLICADOS (200) (5843 ms)
      √ deve filtrar materiais por título (200) (6049 ms)
      √ deve retornar vazio se o filtro não encontrar nada (200) (5098 ms)
      √ deve acessar um material público por ID (200) (5452 ms)
      √ deve ser PROIBIDO de ver um RASCUNHO por ID (403) (5427 ms)
    PATCH & DELETE /api/v1/materials/:id
      √ deve permitir o DONO (userA) atualizar seu material (200) (5139 ms)
      √ deve PROIBIR outro usuário (userB) de atualizar (403) (3293 ms)
      √ deve PROIBIR outro usuário (userB) de deletar (403) (3278 ms)
      √ deve permitir o DONO (userA) deletar seu material (204) (4213 ms)
    Integração com OpenLibrary API
      √ deve preencher automaticamente título e páginas via ISBN da OpenLibrary (201) (3269 ms)
      √ deve usar título manual quando fornecido, mesmo com ISBN válido (201) (3198 ms)
      √ deve usar páginas manuais quando fornecidas, mesmo com ISBN válido (201) (3064 ms)
      √ deve falhar com ISBN inválido mesmo sendo de livro (400) (1632 ms)
      √ deve criar livro normalmente quando API retorna null mas campos foram fornecidos (201) (3019 ms)
      √ deve falhar quando API não retorna dados e campos não foram fornecidos (400) (1903 ms)
      √ deve falhar quando API retorna título mas não páginas (400) (1866 ms)

Test Suites: 2 passed, 2 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        ...s
Ran all test suites.
