const prisma = require('../config/prisma');

const createAuthorController = async (req, res) => {
  const { name, type, data_nascimento, cidade } = req.body;

  // 1. Validação Geral (Tipo)
  if (!type) {
    return res.status(400).json({ error: 'O campo "type" (PESSOA ou INSTITUICAO) é obrigatório.' });
  }

  const dataToSave = { type: type.toUpperCase() };

  // 2. Validações Específicas por Tipo 
  try {
    switch (type.toUpperCase()) {
      case 'PESSOA':
        // Validação do Nome 
        if (!name || name.length < 3 || name.length > 80) {
          return res.status(400).json({ error: 'Nome é obrigatório e deve ter entre 3 e 80 caracteres.' }); 
        }
        
        // Validação da Data de Nascimento 
        if (!data_nascimento) {
          return res.status(400).json({ error: 'Para o tipo "PESSOA", "data_nascimento" é obrigatória.' }); 
        }
        const birthDate = new Date(data_nascimento);
        if (isNaN(birthDate.getTime())) {
          return res.status(400).json({ error: 'Formato de "data_nascimento" inválido. Use ISO (YYYY-MM-DD).' }); 
        }
        if (birthDate > new Date()) {
          return res.status(400).json({ error: '"data_nascimento" não pode ser uma data futura.' }); 
        }
        
        // Adiciona os campos de PESSOA
        dataToSave.name = name;
        dataToSave.data_nascimento = birthDate;
        break;

      case 'INSTITUICAO':
        // Validação do Nome 
        if (!name || name.length < 3 || name.length > 120) {
          return res.status(400).json({ error: 'Nome é obrigatório e deve ter entre 3 e 120 caracteres.' }); 
        }

        // Validação da Cidade 
        if (!cidade || cidade.length < 2 || cidade.length > 80) {
          return res.status(400).json({ error: 'Cidade é obrigatória e deve ter entre 2 e 80 caracteres.' }); 
        }

        // Adiciona os campos de INSTITUICAO
        dataToSave.name = name;
        dataToSave.cidade = cidade;
        break;

      default:
        return res.status(400).json({ error: "O campo 'type' deve ser 'PESSOA' ou 'INSTITUICAO'." });
    }

    // 3. Salvar no Banco
    const newAuthor = await prisma.autor.create({
      data: dataToSave,
    });
    
    res.status(201).json(newAuthor);

  } catch (error) {
    console.error('Erro ao criar autor:', error);
    res.status(500).json({ error: 'Não foi possível processar sua solicitação.' });
  }
};

module.exports = {
  createAuthorController,
};