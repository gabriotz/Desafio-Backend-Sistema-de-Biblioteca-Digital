// URL base da sua API backend
const API_URL = '/api/v1'; // Ajuste a porta se necessário

// --- Elementos do DOM ---
const filterForm = document.getElementById('filter-form');
const clearFilterButton = document.getElementById('clear-filter-button');
const editModal = document.getElementById('edit-modal');
const editMaterialForm = document.getElementById('edit-material-form');
const editErrorP = document.getElementById('edit-error');
const userIdSpan = document.getElementById('user-id');
const materialsListDiv = document.getElementById('materials-list');
const loginForm = document.getElementById('login-form');
const loginErrorP = document.getElementById('login-error');
const authSection = document.getElementById('auth-section');
const loginFormContainer = document.getElementById('login-form-container');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const createMaterialSection = document.getElementById('create-material-section');
const createMaterialForm = document.getElementById('create-material-form');
const createErrorP = document.getElementById('create-error');
const materialTypeSelect = document.getElementById('material-type');
const specificFieldsDiv = document.getElementById('specific-fields');
const registerForm = document.getElementById('register-form');
const registerMessageP = document.getElementById('register-message');
const registerFormContainer = document.getElementById('register-form-container');
const createAuthorSection = document.getElementById('create-author-section');
const createAuthorForm = document.getElementById('create-author-form');
const authorTypeSelect = document.getElementById('author-type');
const authorSpecificFieldsDiv = document.getElementById('author-specific-fields');
const authorCreateMessageP = document.getElementById('author-create-message');


// --- Estado da Aplicação ---
let loggedInUserId = null;
let currentFilters = {};

// --- Gerenciamento de Token ---
const TOKEN_KEY = 'biblioteca_token';
function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    loggedInUserId = null;
}

// --- Funções Auxiliares ---
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    return response;
}

// --- Atualização da Interface ---
async function updateUI() {
    const token = getToken();
    if (token) {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'none'; // Oculta registro se logado
        userInfoDiv.style.display = 'block';
        createMaterialSection.style.display = 'block';
        createAuthorSection.style.display = 'block'; // Mostra cadastro de autor se logado
        await fetchUserProfile(); // Busca perfil APENAS se tiver token
    } else {
        loginFormContainer.style.display = 'block';
        registerFormContainer.style.display = 'block'; // Mostra registro se deslogado
        userInfoDiv.style.display = 'none';
        createMaterialSection.style.display = 'none';
        createAuthorSection.style.display = 'none'; // Oculta cadastro de autor se deslogado
        userEmailSpan.textContent = '';
        userIdSpan.textContent = '';
        loggedInUserId = null;
    }
    fetchMaterials(); // Busca materiais independentemente do login
}

// --- Funções da API ---

async function fetchUserProfile() {
    try {
        const response = await fetchWithAuth(`${API_URL}/users/profile`); //
        if (!response.ok) throw new Error('Não foi possível buscar o perfil.');
        const user = await response.json();
        userEmailSpan.textContent = user.email;
        userIdSpan.textContent = user.id;
        loggedInUserId = user.id;
        fetchMaterials(); // Re-busca para atualizar botões
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        handleLogout(); // Desloga se houver erro (ex: token expirado)
    }
}

async function handleLogin(event) {
    event.preventDefault();
    loginErrorP.textContent = '';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const response = await fetch(`${API_URL}/users/login`, { //
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
        saveToken(data.token);
        updateUI();
    } catch (error) {
        console.error('Erro no login:', error);
        loginErrorP.textContent = `Falha no login: ${error.message}`;
    }
}

function handleLogout() {
    removeToken();
    updateUI();
}

async function handleRegister(event) {
    event.preventDefault();
    registerMessageP.textContent = '';
    registerMessageP.className = 'message'; // Reseta classe

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    if (password !== passwordConfirm) {
        registerMessageP.textContent = 'As senhas não coincidem.';
        registerMessageP.classList.add('error');
        return;
    }
     if (password.length < 6) {
         registerMessageP.textContent = 'A senha deve ter no mínimo 6 caracteres.';
         registerMessageP.classList.add('error');
         return;
     }

    try {
        const response = await fetch(`${API_URL}/users/register`, { //
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Erro ${response.status}`); // Usa erro da API
        }

        registerMessageP.textContent = 'Cadastro realizado com sucesso! Você já pode fazer login.';
        registerMessageP.classList.add('success');
        registerForm.reset();

    } catch (error) {
        console.error('Erro no cadastro:', error);
        registerMessageP.textContent = `Falha no cadastro: ${error.message}`;
        registerMessageP.classList.add('error');
    }
}

async function fetchMaterials() {
    materialsListDiv.innerHTML = 'Carregando materiais...';
    const params = new URLSearchParams(currentFilters);
    const queryString = params.toString();
    const url = `${API_URL}/materials${queryString ? `?${queryString}` : ''}`; //

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
        const data = await response.json();
        materialsListDiv.innerHTML = '';

        if (data.data && data.data.length > 0) {
            data.data.forEach(material => {
                const materialElement = document.createElement('div');
                materialElement.classList.add('material-item');
                materialElement.dataset.id = material.id;

                const isOwner = loggedInUserId && loggedInUserId === material.creatorId;
                // Escapa aspas simples (') nos dados que vão para o onclick
                const escapedTitle = material.title.replace(/'/g, "\\'");
                const escapedDescription = (material.description || '').replace(/'/g, "\\'");

                const actionButtons = isOwner ? `
                    <div class="material-actions" style="display: block;">
                         <button class="edit-button" onclick="openEditModal(${material.id}, '${escapedTitle}', '${material.status}', '${escapedDescription}')">Editar</button>
                         <button class="delete-button" onclick="handleDeleteMaterial(${material.id})">Excluir</button>
                    </div>
                ` : '<div class="material-actions"></div>';

                materialElement.innerHTML = `
                    ${actionButtons}
                    <h3>${material.title} (ID: ${material.id})</h3>
                    <p><strong>Tipo:</strong> ${material.type}</p>
                    <p><strong>Autor:</strong> ${material.author.name} (ID: ${material.authorId})</p>
                    <p><strong>Status:</strong> ${material.status}</p>
                    <p><strong>Cadastrado por:</strong> ${material.creator.email} (ID: ${material.creatorId})</p>
                    ${material.description ? `<p><strong>Descrição:</strong> ${material.description}</p>` : ''}
                    ${material.isbn ? `<p><strong>ISBN:</strong> ${material.isbn}</p>` : ''}
                    ${material.pages ? `<p><strong>Páginas:</strong> ${material.pages}</p>` : ''}
                    ${material.doi ? `<p><strong>DOI:</strong> ${material.doi}</p>` : ''}
                    ${material.url ? `<p><strong>URL:</strong> <a href="${material.url}" target="_blank">${material.url}</a></p>` : ''}
                    ${material.durationMin ? `<p><strong>Duração:</strong> ${material.durationMin} min</p>` : ''}
                `;
                materialsListDiv.appendChild(materialElement);
            });
        } else {
            materialsListDiv.innerHTML = '<p>Nenhum material encontrado com os filtros aplicados.</p>';
        }

    } catch (error) {
        console.error('Erro ao buscar materiais:', error);
        materialsListDiv.innerHTML = '<p style="color: red;">Falha ao carregar materiais.</p>';
    }
}

async function handleCreateMaterial(event) {
    event.preventDefault();
    createErrorP.textContent = '';
    const token = getToken();
    if (!token) return;

    const materialData = {
        title: document.getElementById('material-title').value || null, // Envia null se vazio
        type: document.getElementById('material-type').value,
        authorId: parseInt(document.getElementById('material-authorId').value),
        status: document.getElementById('material-status').value,
        description: document.getElementById('material-description').value || null
    };

    // Adiciona campos específicos apenas se tiverem valor
    switch (materialData.type) {
        case 'LIVRO':
            const isbnInput = document.getElementById('material-isbn')?.value;
            const pagesInput = document.getElementById('material-pages')?.value;
            if (isbnInput) materialData.isbn = isbnInput;
            if (pagesInput) materialData.pages = parseInt(pagesInput);
            break;
        case 'ARTIGO':
            const doiInput = document.getElementById('material-doi')?.value;
            if (doiInput) materialData.doi = doiInput;
            break;
        case 'VIDEO':
            const urlInput = document.getElementById('material-url')?.value;
            const durationInput = document.getElementById('material-durationMin')?.value;
            if (urlInput) materialData.url = urlInput;
            if (durationInput) materialData.durationMin = parseInt(durationInput);
            break;
    }

    // Validação básica frontend antes de enviar
    if (!materialData.type || isNaN(materialData.authorId)) {
         createErrorP.textContent = 'Tipo e ID do Autor são obrigatórios.';
         return;
     }

    try {
        const response = await fetchWithAuth(`${API_URL}/materials`, { //
            method: 'POST',
            body: JSON.stringify(materialData)
        });
        const data = await response.json();
        if (!response.ok) {
             let errorMessage = `Erro ${response.status}`;
             if (data && data.error) errorMessage = Array.isArray(data.error) ? data.error.join(', ') : data.error;
             else if (typeof data === 'string') errorMessage = data;
             throw new Error(errorMessage);
        }
        alert('Material criado com sucesso!');
        createMaterialForm.reset();
        updateSpecificFields();
        fetchMaterials();
    } catch (error) {
        console.error('Erro ao criar material:', error);
        createErrorP.textContent = `Falha ao criar: ${error.message}`;
    }
}

function updateSpecificFields() {
    const type = materialTypeSelect.value;
    specificFieldsDiv.innerHTML = '';

    switch (type) {
        case 'LIVRO':
            specificFieldsDiv.innerHTML = `
                <label for="material-isbn">ISBN (13 dígitos):</label>
                <input type="text" id="material-isbn" pattern="\\d{13}" title="ISBN deve ter 13 dígitos numéricos"><br>
                <label for="material-pages">Nº de Páginas (Opcional):</label>
                <input type="number" id="material-pages" min="1"><br>
                <small>Deixe Título ou Páginas em branco para buscar via ISBN.</small><br><br>
            `;
            break;
        case 'ARTIGO':
            specificFieldsDiv.innerHTML = `
                <label for="material-doi">DOI:</label>
                <input type="text" id="material-doi"><br> `;
            break;
        case 'VIDEO':
            specificFieldsDiv.innerHTML = `
                <label for="material-url">URL:</label>
                <input type="url" id="material-url"><br> <label for="material-durationMin">Duração (min):</label>
                <input type="number" id="material-durationMin" min="1"><br> `;
            break;
    }
}

function updateAuthorSpecificFields() {
    const type = authorTypeSelect.value;
    authorSpecificFieldsDiv.innerHTML = '';

    switch (type) {
        case 'PESSOA':
            authorSpecificFieldsDiv.innerHTML = `
                <label for="author-dob">Data de Nascimento:</label>
                <input type="date" id="author-dob" required><br>
            `;
             document.getElementById('author-name').maxLength = 80; //
            break;
        case 'INSTITUICAO':
            authorSpecificFieldsDiv.innerHTML = `
                <label for="author-city">Cidade:</label>
                <input type="text" id="author-city" required minlength="2" maxlength="80"><br>
            `;
             document.getElementById('author-name').maxLength = 120; //
            break;
         default:
             document.getElementById('author-name').maxLength = 120;
             break;
    }
}

async function handleCreateAuthor(event) {
    event.preventDefault();
    authorCreateMessageP.textContent = '';
    authorCreateMessageP.className = 'message';
    const token = getToken();
    if (!token) return;

    const authorData = {
        name: document.getElementById('author-name').value,
        type: document.getElementById('author-type').value,
    };

    switch (authorData.type) {
        case 'PESSOA':
            const dob = document.getElementById('author-dob')?.value;
            if (!dob) { /* ...erro... */ return; }
             if (new Date(dob) > new Date()) { /* ...erro... */ return; }
            authorData.data_nascimento = dob; //
            break;
        case 'INSTITUICAO':
            const city = document.getElementById('author-city')?.value;
             if (!city || city.length < 2) { /* ...erro... */ return; }
            authorData.cidade = city; //
            break;
        default: /* ...erro... */ return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/authors`, { //
            method: 'POST',
            body: JSON.stringify(authorData)
        });
        const data = await response.json();
        if (!response.ok) {
             let errorMessage = `Erro ${response.status}`;
             if (data && data.error) errorMessage = Array.isArray(data.error) ? data.error.join(', ') : data.error;
             else if (typeof data === 'string') errorMessage = data;
             throw new Error(errorMessage);
        }
        authorCreateMessageP.textContent = `Autor '${data.name}' (ID: ${data.id}) criado com sucesso!`;
        authorCreateMessageP.classList.add('success');
        createAuthorForm.reset();
        updateAuthorSpecificFields();
    } catch (error) {
        console.error('Erro ao criar autor:', error);
        authorCreateMessageP.textContent = `Falha ao criar autor: ${error.message}`;
        authorCreateMessageP.classList.add('error');
    }
}

function handleFilter(event) {
    event.preventDefault();
    currentFilters = {
        title: document.getElementById('filter-title').value.trim(),
        authorName: document.getElementById('filter-author').value.trim(), //
        description: document.getElementById('filter-description').value.trim(),
    };
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) delete currentFilters[key];
    });
    fetchMaterials();
}

function clearFilters() {
    filterForm.reset();
    currentFilters = {};
    fetchMaterials();
}

async function handleDeleteMaterial(materialId) {
    if (!confirm(`Tem certeza que deseja excluir o material ID ${materialId}?`)) return;
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/materials/${materialId}`, { //
            method: 'DELETE'
        });
        if (!response.ok) {
            let errorMsg = `Erro ${response.status}`;
            try { const errorData = await response.json(); if (errorData.error) errorMsg = errorData.error; } catch(e) {}
            throw new Error(errorMsg);
        }
         const itemToRemove = document.querySelector(`.material-item[data-id="${materialId}"]`);
         if(itemToRemove) itemToRemove.remove();
        alert('Material excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir material:', error);
        alert(`Falha ao excluir: ${error.message}`);
    }
}

function openEditModal(id, title, status, description) {
    document.getElementById('edit-material-id').value = id;
    document.getElementById('edit-material-title').value = title;
    document.getElementById('edit-material-status').value = status;
    document.getElementById('edit-material-description').value = description || '';
    editErrorP.textContent = '';
    editModal.style.display = 'flex';
}

function closeEditModal() {
    editModal.style.display = 'none';
}

async function handleUpdateMaterial(event) {
    event.preventDefault();
    editErrorP.textContent = '';
    const token = getToken();
    if (!token) return;

    const materialId = document.getElementById('edit-material-id').value;
    const dataToUpdate = {
        title: document.getElementById('edit-material-title').value,
        status: document.getElementById('edit-material-status').value,
        description: document.getElementById('edit-material-description').value || null
    };

    try {
        const response = await fetchWithAuth(`${API_URL}/materials/${materialId}`, { //
            method: 'PATCH',
            body: JSON.stringify(dataToUpdate)
        });
        const data = await response.json();
        if (!response.ok) {
             let errorMessage = `Erro ${response.status}`;
             if (data && data.error) errorMessage = Array.isArray(data.error) ? data.error.join(', ') : data.error;
             else if (typeof data === 'string') errorMessage = data;
             throw new Error(errorMessage);
        }
        alert('Material atualizado com sucesso!');
        closeEditModal();
        fetchMaterials();
    } catch (error) {
        console.error('Erro ao atualizar material:', error);
        editErrorP.textContent = `Falha ao atualizar: ${error.message}`;
    }
}


// --- Event Listeners ---
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
registerForm.addEventListener('submit', handleRegister); // Registro
createMaterialForm.addEventListener('submit', handleCreateMaterial);
materialTypeSelect.addEventListener('change', updateSpecificFields);
filterForm.addEventListener('submit', handleFilter);
clearFilterButton.addEventListener('click', clearFilters);
editMaterialForm.addEventListener('submit', handleUpdateMaterial);
createAuthorForm.addEventListener('submit', handleCreateAuthor); // Autor
authorTypeSelect.addEventListener('change', updateAuthorSpecificFields); // Autor


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    window.onclick = function(event) {
        if (event.target == editModal) {
            closeEditModal();
        }
    }
});