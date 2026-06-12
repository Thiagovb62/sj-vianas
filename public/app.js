// Estado Global da Aplicação
const state = {
  people: [],
  food: [],
  expenses: [],
  isAdmin: false,
  token: null,
  searchQuery: ''
};

// Configurações e Seletores
const API_URL = window.location.port === '3000' ? '' : 'http://localhost:3000';
const DOM = {
  totalExpenses: document.getElementById('total-expenses'),
  payingAdultsCount: document.getElementById('paying-adults-count'),
  costPerAdult: document.getElementById('cost-per-adult'),
  totalCollected: document.getElementById('total-collected'),
  collectedRatio: document.getElementById('collected-ratio'),
  
  formAddPerson: document.getElementById('form-add-person'),
  personName: document.getElementById('person-name'),
  personIsChild: document.getElementById('person-is-child'),
  searchPeople: document.getElementById('search-people'),
  listPeople: document.getElementById('list-people'),
  peopleCounter: document.getElementById('people-counter'),
  
  formAddFood: document.getElementById('form-add-food'),
  foodName: document.getElementById('food-name'),
  foodPrice: document.getElementById('food-price'),
  listFood: document.getElementById('list-food'),
  foodCounter: document.getElementById('food-counter'),
  
  formAddExpense: document.getElementById('form-add-expense'),
  expenseName: document.getElementById('expense-name'),
  expensePrice: document.getElementById('expense-price'),
  listExpenses: document.getElementById('list-expenses'),
  expensesCounter: document.getElementById('expenses-counter'),
  
  btnLoginTrigger: document.getElementById('btn-login-trigger'),
  btnLogout: document.getElementById('btn-logout'),
  adminBadge: document.getElementById('admin-badge'),
  loginModal: document.getElementById('login-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  formLogin: document.getElementById('form-login'),
  adminPassword: document.getElementById('admin-password'),
  loginErrorMsg: document.getElementById('login-error-msg'),
  
  toastContainer: document.getElementById('toast-container'),
  adminOnlyElements: document.querySelectorAll('.admin-only')
};

// --- FUNÇÕES DE AUXÍLIO E NOTIFICAÇÃO ---

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  DOM.toastContainer.appendChild(toast);
  
  // Fechar no clique do X
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  // Auto-remover após 4 segundos
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'toastIn 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// Formatação de Dinheiro
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Obter Headers de Requisição (Inclui Token se Admin)
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

// --- COMUNICAÇÃO COM A API ---

// Carregar todos os dados da API
async function loadAllData() {
  try {
    const res = await fetch(`${API_URL}/api/data`);
    if (!res.ok) throw new Error('Não foi possível carregar os dados.');
    const data = await res.json();
    
    state.people = data.people || [];
    state.food = data.food || [];
    state.expenses = data.expenses || [];
    
    calculateFinance();
    renderUI();
  } catch (error) {
    console.error(error);
    showToast('Erro ao carregar dados do servidor.', 'danger');
  }
}

// Executar Cálculos Financeiros
function calculateFinance() {
  // 1. Somar comidas
  const totalFood = state.food.reduce((sum, item) => sum + item.price, 0);
  DOM.foodCounter.textContent = formatCurrency(totalFood);

  // 2. Somar despesas
  const totalOtherExpenses = state.expenses.reduce((sum, item) => sum + item.price, 0);
  DOM.expensesCounter.textContent = formatCurrency(totalOtherExpenses);

  // 3. Despesa Total (Comidas + Outras Despesas)
  const grandTotal = totalFood + totalOtherExpenses;
  DOM.totalExpenses.textContent = formatCurrency(grandTotal);

  // 4. Contar adultos pagantes
  const payingAdults = state.people.filter(p => !p.isChild);
  const payingCount = payingAdults.length;
  DOM.payingAdultsCount.textContent = payingCount;

  // 5. Custo por Adulto
  const costPerPerson = payingCount > 0 ? grandTotal / payingCount : 0;
  DOM.costPerAdult.textContent = formatCurrency(costPerPerson);

  // 6. Total arrecadado (Adultos confirmados * custo por adulto)
  const confirmedAdults = payingAdults.filter(p => p.status === 'confirmado');
  const confirmedCount = confirmedAdults.length;
  
  const amountCollected = confirmedCount * costPerPerson;
  DOM.totalCollected.textContent = formatCurrency(amountCollected);
  DOM.collectedRatio.textContent = `Confirmados: ${confirmedCount} de ${payingCount}`;
}

// --- AUTENTICAÇÃO ---

function checkLoginState() {
  const token = localStorage.getItem('admin_token');
  if (token) {
    state.token = token;
    state.isAdmin = true;
    
    DOM.adminBadge.classList.remove('hidden');
    DOM.btnLogout.classList.remove('hidden');
    DOM.btnLoginTrigger.classList.add('hidden');
    
    // Mostrar campos de formulários admin
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  } else {
    state.token = null;
    state.isAdmin = false;
    
    DOM.adminBadge.classList.add('hidden');
    DOM.btnLogout.classList.add('hidden');
    DOM.btnLoginTrigger.classList.remove('hidden');
    
    // Ocultar campos de formulários admin
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }
}

// --- RENDERIZAÇÃO DA UI ---

function renderUI() {
  renderPeopleList();
  renderFoodList();
  renderExpensesList();
}

// Renderizar Lista de Participantes
function renderPeopleList() {
  DOM.listPeople.innerHTML = '';
  
  // Filtrar por busca
  const filteredPeople = state.people.filter(p => 
    p.name.toLowerCase().includes(state.searchQuery.toLowerCase())
  );
  
  DOM.peopleCounter.textContent = state.people.length;

  if (filteredPeople.length === 0) {
    DOM.listPeople.innerHTML = `<li class="empty-state">Nenhum participante encontrado.</li>`;
    return;
  }

  filteredPeople.forEach(person => {
    const li = document.createElement('li');
    
    // Configura conteúdo esquerdo
    const itemLeft = document.createElement('div');
    itemLeft.className = 'item-left';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = person.name;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'item-desc';
    descSpan.textContent = person.isChild ? 'Menor de 15 anos (Isento)' : 'Adulto Pagante';
    
    itemLeft.appendChild(nameSpan);
    itemLeft.appendChild(descSpan);
    
    // Configura conteúdo direito
    const itemRight = document.createElement('div');
    itemRight.className = 'item-right';
    
    // Status de pagamento
    if (person.isChild) {
      const badge = document.createElement('span');
      badge.className = 'status-badge isento';
      badge.textContent = 'Isento';
      itemRight.appendChild(badge);
    } else {
      const badge = document.createElement('span');
      badge.className = `status-badge ${person.status} ${state.isAdmin ? 'admin-clickable' : ''}`;
      badge.textContent = person.status === 'confirmado' ? 'Confirmado' : 'Pendente';
      
      // Permitir trocar status apenas se for admin
      if (state.isAdmin) {
        badge.title = 'Clique para alterar status';
        badge.addEventListener('click', () => togglePersonStatus(person.id, person.status));
      }
      
      itemRight.appendChild(badge);
    }
    
    // Botão de deletar (apenas admin)
    if (state.isAdmin) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete-row';
      deleteBtn.title = 'Remover participante';
      deleteBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deletePerson(person.id));
      itemRight.appendChild(deleteBtn);
    }
    
    li.appendChild(itemLeft);
    li.appendChild(itemRight);
    DOM.listPeople.appendChild(li);
  });
}

// Renderizar Lista de Comidas
function renderFoodList() {
  DOM.listFood.innerHTML = '';
  
  if (state.food.length === 0) {
    DOM.listFood.innerHTML = `<li class="empty-state">Nenhuma comida cadastrada.</li>`;
    return;
  }

  state.food.forEach(item => {
    const li = document.createElement('li');
    
    const itemLeft = document.createElement('div');
    itemLeft.className = 'item-left';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = item.name;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'item-desc';
    descSpan.textContent = `Preço estimado`;
    
    itemLeft.appendChild(nameSpan);
    itemLeft.appendChild(descSpan);
    
    const itemRight = document.createElement('div');
    itemRight.className = 'item-right';
    
    const priceSpan = document.createElement('span');
    priceSpan.className = 'item-price';
    priceSpan.textContent = formatCurrency(item.price);
    itemRight.appendChild(priceSpan);
    
    // Badge de status da comida
    const badge = document.createElement('span');
    badge.className = `status-badge ${item.status || 'pendente'} ${state.isAdmin ? 'admin-clickable' : ''}`;
    badge.textContent = (item.status === 'confirmado' || item.status === 'comprado') ? 'Comprado' : 'Pendente';
    
    if (state.isAdmin) {
      badge.title = 'Clique para alterar status';
      badge.addEventListener('click', () => toggleFoodStatus(item.id, item.status));
    }
    itemRight.appendChild(badge);
    
    // Botão de deletar (apenas admin)
    if (state.isAdmin) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete-row';
      deleteBtn.title = 'Remover comida';
      deleteBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deleteFood(item.id));
      itemRight.appendChild(deleteBtn);
    }
    
    li.appendChild(itemLeft);
    li.appendChild(itemRight);
    DOM.listFood.appendChild(li);
  });
}

// Renderizar Lista de Despesas
function renderExpensesList() {
  DOM.listExpenses.innerHTML = '';
  
  if (state.expenses.length === 0) {
    DOM.listExpenses.innerHTML = `<li class="empty-state">Nenhuma despesa cadastrada.</li>`;
    return;
  }

  state.expenses.forEach(item => {
    const li = document.createElement('li');
    
    const itemLeft = document.createElement('div');
    itemLeft.className = 'item-left';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = item.name;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'item-desc';
    descSpan.textContent = `Preço estimado`;
    
    itemLeft.appendChild(nameSpan);
    itemLeft.appendChild(descSpan);
    
    const itemRight = document.createElement('div');
    itemRight.className = 'item-right';
    
    const priceSpan = document.createElement('span');
    priceSpan.className = 'item-price';
    priceSpan.textContent = formatCurrency(item.price);
    itemRight.appendChild(priceSpan);
    
    // Badge de status da despesa
    const badge = document.createElement('span');
    badge.className = `status-badge ${item.status || 'pendente'} ${state.isAdmin ? 'admin-clickable' : ''}`;
    badge.textContent = (item.status === 'confirmado' || item.status === 'pago') ? 'Pago' : 'Pendente';
    
    if (state.isAdmin) {
      badge.title = 'Clique para alterar status';
      badge.addEventListener('click', () => toggleExpenseStatus(item.id, item.status));
    }
    itemRight.appendChild(badge);
    
    // Botão de deletar (apenas admin)
    if (state.isAdmin) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete-row';
      deleteBtn.title = 'Remover despesa';
      deleteBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deleteExpense(item.id));
      itemRight.appendChild(deleteBtn);
    }
    
    li.appendChild(itemLeft);
    li.appendChild(itemRight);
    DOM.listExpenses.appendChild(li);
  });
}

// --- TRATADORES DE EVENTOS / AÇÕES ---

// 1. Cadastrar Pessoa (Público)
DOM.formAddPerson.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = DOM.personName.value;
  const isChild = DOM.personIsChild.checked;
  
  try {
    const res = await fetch(`${API_URL}/api/people`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, isChild })
    });
    
    if (!res.ok) throw new Error('Falha no cadastro');
    const newPerson = await res.json();
    
    showToast(`${newPerson.name} adicionado(a) com sucesso!`);
    DOM.personName.value = '';
    DOM.personIsChild.checked = false;
    
    loadAllData();
  } catch (error) {
    showToast('Erro ao cadastrar participante.', 'danger');
  }
});

// 2. Alternar status de pagamento da pessoa (Admin)
async function togglePersonStatus(id, currentStatus) {
  if (!state.isAdmin) return;
  const nextStatus = currentStatus === 'pendente' ? 'confirmado' : 'pendente';
  
  try {
    const res = await fetch(`${API_URL}/api/people/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: nextStatus })
    });
    
    if (!res.ok) throw new Error('Não foi possível alterar o status');
    showToast('Status de pagamento atualizado!');
    loadAllData();
  } catch (error) {
    showToast('Erro ao atualizar status de pagamento.', 'danger');
  }
}

// 3. Excluir pessoa (Admin)
async function deletePerson(id) {
  if (!state.isAdmin) return;
  if (!confirm('Deseja realmente remover esta pessoa da lista?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/people/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error('Erro ao deletar');
    showToast('Participante removido.');
    loadAllData();
  } catch (error) {
    showToast('Erro ao remover participante.', 'danger');
  }
}

// 4. Cadastrar Comida (Admin)
DOM.formAddFood.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.isAdmin) return;
  
  const name = DOM.foodName.value;
  const price = parseFloat(DOM.foodPrice.value);
  
  try {
    const res = await fetch(`${API_URL}/api/food`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, price })
    });
    
    if (!res.ok) throw new Error('Erro ao cadastrar');
    showToast(`Comida "${name}" adicionada com sucesso!`);
    DOM.foodName.value = '';
    DOM.foodPrice.value = '';
    
    loadAllData();
  } catch (error) {
    showToast('Erro ao adicionar comida.', 'danger');
  }
});

// 5. Alternar status da comida (Admin)
async function toggleFoodStatus(id, currentStatus) {
  if (!state.isAdmin) return;
  const nextStatus = currentStatus === 'confirmado' ? 'pendente' : 'confirmado';
  
  try {
    const res = await fetch(`${API_URL}/api/food/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: nextStatus })
    });
    
    if (!res.ok) throw new Error('Erro ao alterar status');
    showToast('Status da comida alterado!');
    loadAllData();
  } catch (error) {
    showToast('Erro ao alterar status da comida.', 'danger');
  }
}

// 6. Excluir comida (Admin)
async function deleteFood(id) {
  if (!state.isAdmin) return;
  if (!confirm('Deseja realmente excluir esta comida?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/food/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error('Erro ao excluir');
    showToast('Comida excluída.');
    loadAllData();
  } catch (error) {
    showToast('Erro ao excluir comida.', 'danger');
  }
}

// 7. Cadastrar Despesa (Admin)
DOM.formAddExpense.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.isAdmin) return;
  
  const name = DOM.expenseName.value;
  const price = parseFloat(DOM.expensePrice.value);
  
  try {
    const res = await fetch(`${API_URL}/api/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, price })
    });
    
    if (!res.ok) throw new Error('Erro ao cadastrar');
    showToast(`Despesa "${name}" adicionada com sucesso!`);
    DOM.expenseName.value = '';
    DOM.expensePrice.value = '';
    
    loadAllData();
  } catch (error) {
    showToast('Erro ao adicionar despesa.', 'danger');
  }
});

// 8. Alternar status da despesa (Admin)
async function toggleExpenseStatus(id, currentStatus) {
  if (!state.isAdmin) return;
  const nextStatus = currentStatus === 'confirmado' ? 'pendente' : 'confirmado';
  
  try {
    const res = await fetch(`${API_URL}/api/expenses/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: nextStatus })
    });
    
    if (!res.ok) throw new Error('Erro ao alterar status');
    showToast('Status da despesa alterado!');
    loadAllData();
  } catch (error) {
    showToast('Erro ao alterar status da despesa.', 'danger');
  }
}

// 9. Excluir despesa (Admin)
async function deleteExpense(id) {
  if (!state.isAdmin) return;
  if (!confirm('Deseja realmente excluir esta despesa?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error('Erro ao excluir');
    showToast('Despesa excluída.');
    loadAllData();
  } catch (error) {
    showToast('Erro ao excluir despesa.', 'danger');
  }
}

// --- EVENTOS DE MODAL E FILTROS ---

// Busca em Tempo Real
DOM.searchPeople.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderPeopleList();
});

// Abrir Modal de Login
DOM.btnLoginTrigger.addEventListener('click', () => {
  DOM.loginModal.classList.remove('hidden');
  DOM.adminPassword.focus();
});

// Fechar Modal
DOM.btnCloseModal.addEventListener('click', () => {
  DOM.loginModal.classList.add('hidden');
  DOM.adminPassword.value = '';
  DOM.loginErrorMsg.classList.add('hidden');
});

// Fechar modal ao clicar fora
DOM.loginModal.addEventListener('click', (e) => {
  if (e.target === DOM.loginModal) {
    DOM.loginModal.classList.add('hidden');
    DOM.adminPassword.value = '';
    DOM.loginErrorMsg.classList.add('hidden');
  }
});

// Formulário de Login do Admin
DOM.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = DOM.adminPassword.value;
  
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    if (!res.ok) {
      DOM.loginErrorMsg.classList.remove('hidden');
      DOM.adminPassword.select();
      throw new Error('Senha incorreta');
    }
    
    const data = await res.json();
    localStorage.setItem('admin_token', data.token);
    
    DOM.loginModal.classList.add('hidden');
    DOM.adminPassword.value = '';
    DOM.loginErrorMsg.classList.add('hidden');
    
    showToast('Login efetuado como Administrador!', 'success');
    checkLoginState();
    loadAllData();
  } catch (error) {
    console.error(error);
  }
});

// Logout do Admin
DOM.btnLogout.addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  showToast('Sessão de Administrador encerrada.', 'success');
  checkLoginState();
  loadAllData();
});

// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
  checkLoginState();
  loadAllData();
});
