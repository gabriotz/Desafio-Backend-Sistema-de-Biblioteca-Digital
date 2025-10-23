const prisma = require('../config/prisma');

// Helpers de Validação 

// Formato DOI: "10.1000/12345"
const isValidDOI = (doi) => {
  const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
  return doiRegex.test(doi);
};

// Formato ISBN: Exatamente 13 dígitos numéricos 
const isValidISBN = (isbn) => {
  const isbnRegex = /^\d{13}$/; 
  return isbnRegex.test(isbn);
};

const createMaterialController = async (req, res) => {
  const creatorId = req.user.userId;

  // Usamos 'let' para que as variáveis possam ser modificadas pela API
  let {
    title,
    type,
    authorId,
    status,
    description,
    isbn,
    doi,
    pages,
    durationMin,
    url,
  } = req.body;

  // VALIDAÇÕES GERAIS (INICIAIS)

  // 1. Campos obrigatórios GERAIS (Note que 'title' não é mais obrigatório AQUI)
  if (!type || !authorId) {
    return res.status(400).json({
      error: 'Campos obrigatórios ausentes: type, e authorId.',
    });
  }

  // 2. Tentar parsear o ID do autor
  const parsedAuthorId = parseInt(authorId);
  if (isNaN(parsedAuthorId)) {
    return res.status(400).json({ error: 'authorId deve ser um número inteiro.' });
  }

  // 3. Validar o status
  if (status && !['RASCUNHO', 'PUBLICADO', 'ARQUIVADO'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Use: RASCUNHO, PUBLICADO, ou ARQUIVADO.' });
  }

  try {
    // 4. Verificar se o autor (authorId) realmente existe
    const authorExists = await prisma.autor.findUnique({
      where: { id: parsedAuthorId },
    });

    if (!authorExists) {
      return res.status(404).json({ error: 'Autor não encontrado com o ID fornecido.' });
    }

    // =================================================================
    // (NOVA LÓGICA) REQ 2.5: INTEGRAÇÃO COM OPENLIBRARY
    // =================================================================
    if (type.toUpperCase() === 'LIVRO' && isbn && (!title || !pages)) {
      console.log(`Buscando dados na OpenLibrary para o ISBN: ${isbn}...`);
      
      // Valida o ISBN antes de chamar a API
      if (!isValidISBN(isbn)) {
         return res.status(400).json({ error: 'Formato de ISBN inválido (deve ter exatamente 13 dígitos numéricos).' }); 
      }

      const bookData = await fetchBookDataByISBN(isbn);

      if (bookData) {
        // Preenche os campos SÓ SE eles não foram fornecidos pelo usuário
        title = title || bookData.title;
        pages = pages || bookData.pages;
        console.log(`Dados encontrados: Título="${title}", Páginas=${pages}`);
      } else {
         console.log(`Nenhum dado encontrado para o ISBN: ${isbn}.`);
      }
    }
    // =================================================================
    // FIM DA NOVA LÓGICA
    // =================================================================
    
    // VALIDAÇÕES (PÓS-API)
    
    // 5. Validação de Título (Agora obrigatório, manual ou via API)
    if (!title || title.length < 3 || title.length > 100) {
      return res.status(400).json({ error: 'O Título (manual ou via ISBN) é obrigatório e deve ter entre 3 e 100 caracteres.' });
    }

    // 6. Validação de Descrição
    if (description && description.length > 1000) {
      return res.status(400).json({ error: 'A Descrição, quando informada, deve ter no máximo 1000 caracteres.' });
    }
    
    // Objeto de dados para salvar
    const dataToSave = {
      title, // (agora pode ter vindo da API)
      type: type.toUpperCase(),
      authorId: parsedAuthorId,
      creatorId: creatorId,
      status: status || 'RASCUNHO',
      description: description || null,
    };

    // 7. VALIDAÇÕES ESPECÍFICAS
    switch (type.toUpperCase()) {
      case 'LIVRO':
        // A validação de ISBN já foi feita acima (antes da API)
        // Agora validamos se 'pages' (manual ou da API) existe
        if (!isbn || !pages) {
          return res.status(400).json({ error: 'Para o tipo "LIVRO", os campos "isbn" e "pages" são obrigatórios (podem ser preenchidos via API).' });
        }
        
        // A validação de formato do ISBN já foi feita na lógica da API
        
        const parsedPages = parseInt(pages); // 'pages' pode ser string ou int
        if (isNaN(parsedPages) || parsedPages < 1) {
          return res.status(400).json({ error: 'Número de páginas deve ser um número maior que zero.' }); 
        }
        
        dataToSave.isbn = isbn;
        dataToSave.pages = parsedPages;
        break;

      case 'ARTIGO':
        if (!doi) {
          return res.status(400).json({ error: 'Para o tipo "ARTIGO", o campo "doi" é obrigatório.' });
        }
        if (!isValidDOI(doi)) {
          return res.status(400).json({ error: 'Formato de DOI inválido (ex: 10.1234/exemplo).' });
        }
        dataToSave.doi = doi;
        break;

      case 'VIDEO':
        if (!url || !durationMin) {
          return res.status(400).json({ error: 'Para o tipo "VIDEO", os campos "url" e "durationMin" são obrigatórios.' });
        }
        const parsedDuration = parseInt(durationMin);
        if (isNaN(parsedDuration) || parsedDuration < 1) {
          return res.status(400).json({ error: 'Duração (minutos) deve ser um número maior que zero.' }); 
        }
        dataToSave.url = url;
        dataToSave.durationMin = parsedDuration;
        break;

      default:
        // Se o tipo não for LIVRO, ARTIGO ou VIDEO, apenas os campos gerais são salvos
        break;
    }
    
    // 8. Criar o material no banco
    const newMaterial = await prisma.material.create({
      data: dataToSave,
      include: {
        creator: { select: { id: true, email: true } },
        author: true,
      },
    });

    // 9. Responder com sucesso
    res.status(201).json(newMaterial);

  } catch (error) {
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('isbn')) {
        return res.status(409).json({ error: 'Este ISBN já está cadastrado.' });
      }
      if (error.meta?.target?.includes('doi')) {
        return res.status(409).json({ error: 'Este DOI já está cadastrado.' });
      }
    }
    
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};


// NOVO CONTROLLER 
const getAllMaterialsController = async (req, res) => {
  // Extrair query params para paginação e filtros
  const { page = 1, limit = 10, title, type, authorName, description } = req.query;

  // Converter para números
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Calcular o 'skip' (pulo) para o Prisma
  const skip = (pageNum - 1) * limitNum;

  // Construir o objeto 'where' para os filtros
  const where = {
    status: 'PUBLICADO', // (Req 2.3: Apenas materiais públicos)
  };

  // Adiciona filtros ao 'where' se eles foram fornecidos na query
  if (title) {
    where.title = {
      contains: title,
      mode: 'insensitive', // Para não diferenciar maiúsculas/minúsculas
    };
  }
  if (type) {
    where.type = {
      equals: type.toUpperCase(),
    };
  }
  if (authorName) {
    where.author = {
      name: {
        contains: authorName,
        mode: 'insensitive',
      },
    };
  }
  if (description){
    where.description = {
      contains: description,
      mode: 'insensitive',
    };
  }

  try {
    // 1. Executar a query com filtros e paginação
    const materials = await prisma.material.findMany({
      where: where,
      skip: skip,
      take: limitNum,
      include: {
        author: true, // Inclui o autor nos resultados
        creator: { select: { id: true, email: true } }, // Inclui o criador
      },
    });

    // 2. Obter a contagem total de itens (para o frontend saber o total de páginas)
    const totalMaterials = await prisma.material.count({
      where: where,
    });

    // 3. Responder com os dados e metadados da paginação
    res.status(200).json({
      data: materials,
      pagination: {
        totalItems: totalMaterials,
        totalPages: Math.ceil(totalMaterials / limitNum),
        currentPage: pageNum,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};


// NOVO CONTROLLER (READ ONE - Ver um material por ID)
const getMaterialByIdController = async (req, res) => {
  const { id } = req.params;
  const materialId = parseInt(id);

  if (isNaN(materialId)) {
    return res.status(400).json({ error: 'ID do material inválido.' });
  }

  try {
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
      },
      include: {
        author: true,
        creator: { select: { id: true, email: true } },
      },
    });

    // Se não encontrar o material
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado.' });
    }

    // Se o material não estiver PUBLICADO (pode ser RASCUNHO/ARQUIVADO)
    if (material.status !== 'PUBLICADO') {
      // Usuários só podem ver materiais públicos.
      //(Futuramente, podemos adicionar uma lógica para o próprio criador ver)
      return res.status(403).json({ error: 'Este material não está disponível publicamente.' });
    }

    res.status(200).json(material);

  } catch (error) {
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

const updateMaterialController = async (req, res) => {
  const { id } = req.params; // ID do material a ser atualizado
  const userId = req.user.userId; // ID do usuário logado (do token)
  const dataToUpdate = req.body; // Novos dados (title, description, status, etc.)

  const materialId = parseInt(id);
  if (isNaN(materialId)) {
    return res.status(400).json({ error: 'ID do material inválido.' });
  }

  try {
    // 1. Buscar o material no banco
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    // 2. Checar se o material existe
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado.' });
    }

    // 3. VERIFICAÇÃO DE PERMISSÃO 
    // O usuário logado é o mesmo que criou o material?
    if (material.creatorId !== userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não é o criador deste material.' });
    }

    // 4.  Validar os dados que estão sendo atualizados
    if (dataToUpdate.status && !['RASCUNHO', 'PUBLICADO', 'ARQUIVADO'].includes(dataToUpdate.status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }
    if (dataToUpdate.title && (dataToUpdate.title.length < 3 || dataToUpdate.title.length > 100)) {
      return res.status(400).json({ error: 'O Título deve ter entre 3 e 100 caracteres.' });
    }
    
    // 5. Atualizar o material (apenas campos permitidos)
    const updatedMaterial = await prisma.material.update({
      where: { id: materialId },
      data: {
        title: dataToUpdate.title,
        description: dataToUpdate.description,
        status: dataToUpdate.status,
        // (Campos como ISBN, DOI, etc., são omitidos para evitar revalidação complexa)
        // (Se você quiser permitir a atualização deles, precisa validar unicidade de novo)
      },
      include: {
        author: true,
        creator: { select: { id: true, email: true } },
      },
    });

    res.status(200).json(updatedMaterial);

  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

// NOVO CONTROLLER DELETE 
const deleteMaterialController = async (req, res) => {
  const { id } = req.params; // ID do material
  const userId = req.user.userId; // ID do usuário logado

  const materialId = parseInt(id);
  if (isNaN(materialId)) {
    return res.status(400).json({ error: 'ID do material inválido.' });
  }

  try {
    // 1. Buscar o material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    // 2. Checar se existe
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado.' });
    }

    // 3. VERIFICAÇÃO DE PERMISSÃO 
    if (material.creatorId !== userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não é o criador deste material.' });
    }

    // 4. Deletar o material
    await prisma.material.delete({
      where: { id: materialId },
    });

    // 5. Responder com sucesso (204 No Content)
    res.status(204).send();

  } catch (error) {
    console.error('Erro ao deletar material:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

// Helper para buscar dados em Open library
const fetchBookDataByISBN = async (isbn) => {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

  try {
    // Usamos fetch (nativo do Node.js >= 18)
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API OpenLibrary respondeu com status ${response.status}`);
    }

    const data = await response.json();
    const bookKey = `ISBN:${isbn}`;

    // A API retorna um objeto com a chave "ISBN:12345"
    if (data && data[bookKey]) {
      const bookInfo = data[bookKey];
      return {
        title: bookInfo.title,
        pages: bookInfo.number_of_pages,
      };
    }
    return null; // ISBN não encontrado na OpenLibrary
  } catch (error) {
    console.error(`Erro ao buscar dados do ISBN ${isbn}:`, error.message);
    // Retornamos null para não quebrar a requisição principal
    return null;
  }
};




const existingExports = module.exports || {};
module.exports = {
  ...existingExports,
  createMaterialController,
  getAllMaterialsController,
  getMaterialByIdController,
  updateMaterialController,
  deleteMaterialController,
};