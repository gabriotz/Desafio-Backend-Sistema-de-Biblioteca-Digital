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

  const {
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

  // VALIDAÇÕES GERAIS 

  // 1. Campos obrigatórios GERAIS
  if (!title || !type || !authorId) {
    return res.status(400).json({
      error: 'Campos obrigatórios ausentes: title, type, e authorId.',
    });
  }

  // 2. Validação de Título 
  if (title.length < 3 || title.length > 100) {
    return res.status(400).json({ error: 'O Título deve ter entre 3 e 100 caracteres.' });
  }

  // 3. Validação de Descrição 
  if (description && description.length > 1000) {
    return res.status(400).json({ error: 'A Descrição, quando informada, deve ter no máximo 1000 caracteres.' });
  }
  
  // 4. Tentar parsear o ID do autor
  const parsedAuthorId = parseInt(authorId);
  if (isNaN(parsedAuthorId)) {
    return res.status(400).json({ error: 'authorId deve ser um número inteiro.' });
  }

  // 5. Validar o status 
  if (status && !['RASCUNHO', 'PUBLICADO', 'ARQUIVADO'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Use: RASCUNHO, PUBLICADO, ou ARQUIVADO.' });
  }


  try {
    // 6. Verificar se o autor (authorId) realmente existe
    const authorExists = await prisma.autor.findUnique({
      where: { id: parsedAuthorId },
    });

    if (!authorExists) {
      return res.status(404).json({ error: 'Autor não encontrado com o ID fornecido.' });
    }
    
    // Objeto de dados para salvar, começa com os dados genéricos validados
    const dataToSave = {
      title,
      type: type.toUpperCase(),
      authorId: parsedAuthorId,
      creatorId: creatorId,
      status: status || 'RASCUNHO',
      description: description || null,
    };

    // 7. VALIDAÇÕES ESPECÍFICAS 
    switch (type.toUpperCase()) {
      case 'LIVRO':
        if (!isbn || !pages) {
          return res.status(400).json({ error: 'Para o tipo "LIVRO", os campos "isbn" e "pages" são obrigatórios.' });
        }
        if (!isValidISBN(isbn)) {
          return res.status(400).json({ error: 'Formato de ISBN inválido (deve ter exatamente 13 dígitos numéricos).' }); 
        }
        const parsedPages = parseInt(pages);
        if (isNaN(parsedPages) || parsedPages < 1) {
          return res.status(400).json({ error: 'Número de páginas deve ser um número maior que zero.' }); 
        }
        
        // Adiciona os campos de LIVRO aos dados
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
        
        // Adiciona os campos de ARTIGO
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
        
        // Adiciona os campos de VIDEO
        dataToSave.url = url;
        dataToSave.durationMin = parsedDuration;
        break;

      default:
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
    // Tratamento de Erro de Unicidade 
    if (error.code === 'P2002') { // Erro do Prisma: "Unique constraint failed"
      if (error.meta?.target?.includes('isbn')) {
        return res.status(409).json({ error: 'Este ISBN já está cadastrado.' });
      }
      if (error.meta?.target?.includes('doi')) {
        return res.status(409).json({ error: 'Este DOI já está cadastrado.' });
      }
    }
    
    // Erro genérico
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

const existingExports = module.exports || {};
module.exports = {
  ...existingExports,
  createMaterialController,
};