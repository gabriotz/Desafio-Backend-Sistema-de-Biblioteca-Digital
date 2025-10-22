// URL base da sua API backend
const API_URL = 'http://localhost:3000/api/v1'; // Ajuste a porta se necessário

// Elemento onde a lista de materiais será exibida
const materialsListDiv = document.getElementById('materials-list');

// Função para buscar os materiais públicos da API
async function fetchMaterials() {
    try {
        // Faz a requisição GET para a rota de materiais
        const response = await fetch(`${API_URL}/materials`); // Rota pública

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        // Converte a resposta para JSON
        const data = await response.json();

        // Limpa a mensagem "Carregando..."
        materialsListDiv.innerHTML = '';

        // Verifica se há materiais para exibir
        if (data.data && data.data.length > 0) {
            // Itera sobre cada material e cria um elemento HTML para ele
            data.data.forEach(material => {
                const materialElement = document.createElement('div');
                materialElement.classList.add('material-item'); // Adiciona a classe CSS

                // Cria o conteúdo HTML para o item do material
                materialElement.innerHTML = `
                    <h3>${material.title}</h3>
                    <p><strong>Tipo:</strong> ${material.type}</p>
                    <p><strong>Autor:</strong> ${material.author.name}</p>
                    ${material.description ? `<p><strong>Descrição:</strong> ${material.description}</p>` : ''}
                    ${material.isbn ? `<p><strong>ISBN:</strong> ${material.isbn}</p>` : ''}
                    ${material.pages ? `<p><strong>Páginas:</strong> ${material.pages}</p>` : ''}
                    ${material.doi ? `<p><strong>DOI:</strong> ${material.doi}</p>` : ''}
                    ${material.url ? `<p><strong>URL:</strong> <a href="${material.url}" target="_blank">${material.url}</a></p>` : ''}
                    ${material.durationMin ? `<p><strong>Duração:</strong> ${material.durationMin} min</p>` : ''}
                `;

                // Adiciona o elemento criado à div principal
                materialsListDiv.appendChild(materialElement);
            });
        } else {
            materialsListDiv.innerHTML = '<p>Nenhum material público encontrado.</p>';
        }

    } catch (error) {
        console.error('Erro ao buscar materiais:', error);
        materialsListDiv.innerHTML = '<p style="color: red;">Falha ao carregar materiais.</p>';
    }
}

// Chama a função para buscar os materiais assim que a página carregar
document.addEventListener('DOMContentLoaded', fetchMaterials);

// --- Futuras Funções ---
// Você adicionaria aqui funções para:
// - Fazer login (POST /users/login), guardar o token (localStorage)
// - Fazer registro (POST /users/register)
// - Criar material (POST /materials), enviando o token no header Authorization
// - Lidar com formulários e interações do usuário