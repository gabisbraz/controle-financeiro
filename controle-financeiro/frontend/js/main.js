// Finance Control - Main JavaScript

// API Base URL
const API_BASE = "http://localhost:3000/tables";

// Adicione esta função no início do arquivo, após API_BASE
console.log("API_BASE URL:", API_BASE);
console.log("Current location:", window.location.href);
console.log("Full API endpoint would be:", `${API_BASE}/saidas`);

let editMode = {
  type: null, // 'entrada' | 'saida'
  id: null,
};

// Global state
let entradas = [];
let saidas = [];
let deleteTarget = { type: null, id: null };
let saidaEditandoId = null;

// DOM Elements
const formEntrada = document.getElementById("formEntrada");
const formSaida = document.getElementById("formSaida");
const tabelaEntradas = document.getElementById("tabelaEntradas");
const tabelaSaidas = document.getElementById("tabelaSaidas");
const modalDelete = document.getElementById("modalDelete");
const toast = document.getElementById("toast");

// Remover import/export para uso em ambiente browser
// Categorias de entrada serão carregadas da API
let categoriasEntrada = [];

// Categorias de saída serão carregadas da API
let categoriasSaida = [];

// Tipos de pagamento serão carregados da API
let tiposPagamento = [];

// Lojas serão carregadas da API
let lojas = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Set default date to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("entradaData").value = today;
  document.getElementById("saidaData").value = today;

  // Load data
  loadEntradas();
  loadSaidas();

  // Form submissions
  formEntrada.addEventListener("submit", handleEntradaSubmit);
  formSaida.addEventListener("submit", handleSaidaSubmit);

  // Modal buttons
  document
    .getElementById("btnCancelDelete")
    .addEventListener("click", closeDeleteModal);
  document
    .getElementById("btnConfirmDelete")
    .addEventListener("click", confirmDelete);

  // Close modal on backdrop click
  modalDelete.addEventListener("click", (e) => {
    if (e.target === modalDelete) closeDeleteModal();
  });

  preencherCategorias();
});

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Filter items by data_input (today to today - 15 days)
function filtrarPorDataRecente(items) {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() - 15);

  const hojeISO = hoje.toISOString();
  const limiteISO = limite.toISOString();

  return items.filter((item) => {
    const dataInput = item.data_input || item.created_at || item.data_insercao;
    if (!dataInput) return true; // Se não tiver data_input, incluir por segurança
    return dataInput >= limiteISO && dataInput <= hojeISO;
  });
}

// Calculate installment value
function calcularValorParcela(valorTotal, numeroParcelas) {
  if (!valorTotal || !numeroParcelas || numeroParcelas <= 1) {
    return valorTotal;
  }
  const valorParcela = valorTotal / numeroParcelas;
  return formatCurrency(valorParcela);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("pt-BR");
}

// Show toast notification
function showToast(message, type = "success") {
  const toastIcon = document.getElementById("toastIcon");
  const toastMessage = document.getElementById("toastMessage");

  toastMessage.textContent = message;

  if (type === "success") {
    toast.className =
      "fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300";
    toastIcon.className = "fas fa-check-circle";
  } else if (type === "error") {
    toast.className =
      "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300";
    toastIcon.className = "fas fa-exclamation-circle";
  }

  toast.classList.remove("hidden", "translate-y-full", "opacity-0");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.add("translate-y-full", "opacity-0");
    setTimeout(() => {
      toast.classList.add("hidden");
      toast.classList.remove("show");
    }, 300);
  }, 3000);
}

// Update summary cards
function updateSummary() {
  // Filtrar para o mês atual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const entradasMes = entradas.filter(e => {
    const date = new Date(e.data + 'T00:00:00');
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const saidasMes = saidas.filter(s => {
    const date = new Date(s.data + 'T00:00:00');
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalEntradas = entradasMes.reduce(
    (sum, e) => sum + (parseFloat(e.valor) || 0),
    0
  );
  const totalSaidas = saidasMes.reduce(
    (sum, s) => sum + (parseFloat(s.valor) || 0),
    0
  );
  const saldo = totalEntradas - totalSaidas;

  document.getElementById("totalEntradas").textContent =
    formatCurrency(totalEntradas);
  document.getElementById("totalSaidas").textContent =
    formatCurrency(totalSaidas);

  const saldoEl = document.getElementById("saldo");
  saldoEl.textContent = formatCurrency(saldo);
  saldoEl.className = `text-2xl font-bold ${
    saldo >= 0 ? "text-blue-600" : "text-red-600"
  }`;

  // Opcional: Manter a contagem de registros como total ou filtrada?
  // Mantendo a contagem total de registros conforme comportamento original,
  // mas也可以 apenas mostrar os registros do mês se preferir.
  // Mantendo a contagem total de registros no banco de dados.
  document.getElementById("countEntradas").textContent = `${
    entradasMes.length
  } registro${entradasMes.length !== 1 ? "s" : ""} este mês`;
  document.getElementById("countSaidas").textContent = `${
    saidasMes.length
  } registro${saidasMes.length !== 1 ? "s" : ""} este mês`;

  // Pulse animation
  document
    .querySelectorAll(".bg-white.rounded-xl.shadow-md")
    .forEach((card) => {
      card.classList.add("pulse-once");
      setTimeout(() => card.classList.remove("pulse-once"), 500);
    });
}

// Load Entradas
async function loadEntradas() {
  try {
    const response = await fetch(`${API_BASE}/entradas?limit=1000&sort=-data`);
    const result = await response.json();
    entradas = result.data || [];
    renderEntradas();
    updateSummary();
  } catch (error) {
    console.error("Erro ao carregar entradas:", error);
    showToast("Erro ao carregar entradas", "error");
  }
}

// Load Saídas
async function loadSaidas() {
  try {
    const response = await fetch(`${API_BASE}/saidas?limit=1000&sort=-data`);
    const result = await response.json();
    saidas = result.data || [];
    renderSaidas();
    updateSummary();
  } catch (error) {
    console.error("Erro ao carregar saídas:", error);
    showToast("Erro ao carregar saídas", "error");
  }
}

// Render Entradas table
function renderEntradas() {
  // Filter by data_input (last 15 days)
  const entradasRecentes = filtrarPorDataRecente(entradas);

  if (entradasRecentes.length === 0) {
    tabelaEntradas.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma entrada registrada nos últimos 15 dias</p>
                </td>
            </tr>
        `;
    document.getElementById("countEntradas").textContent = `0 registros`;
    return;
  }

  tabelaEntradas.innerHTML = entradasRecentes
    .map(
      (entrada) => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600">${formatDate(
              entrada.data
            )}</td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag text-emerald-500"></i>
                    ${entrada.categoria}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${
              entrada.descricao || "-"
            }</td>
            <td class="px-4 py-3 text-right valor-positivo">${formatCurrency(
              entrada.valor
            )}</td>
            <td class="px-4 py-3 text-center">
            <button 
            onclick="editEntrada(${JSON.stringify(entrada).replace(
              /"/g,
              "&quot;"
            )})"
            class="text-blue-500 hover:text-blue-700 mr-3"
            title="Editar">
            <i class="fas fa-edit"></i>
            </button>
            <button 
                type="button"
                onclick="openDeleteModal('entrada', ${entrada.id})"
                class="btn-delete"
                title="Excluir"
            >
                <i class="fas fa-trash-alt"></i>
            </button>
            </td>
        </tr>
    `
    )
    .join("");
  
  document.getElementById("countEntradas").textContent = `${
    entradasRecentes.length
  } registro${entradasRecentes.length !== 1 ? "s" : ""}`;
}

// Render Saídas table
function renderSaidas() {
  // Filter by data_input (last 15 days)
  const saidasRecentes = filtrarPorDataRecente(saidas);

  if (saidasRecentes.length === 0) {
    tabelaSaidas.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma saída registrada nos últimos 15 dias</p>
                </td>
            </tr>
        `;
    document.getElementById("countSaidas").textContent = `0 registros`;
    return;
  }

  tabelaSaidas.innerHTML = saidasRecentes
    .map(
      (saida) => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600">${formatDate(
              saida.data
            )}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${
              saida.loja
            }</td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag text-red-500"></i>
                    ${saida.categoria}
                </span>
            </td>
            <td class="px-4 py-3">
                <span class="badge badge-${saida.tipo_pagamento
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")}">
                    ${saida.tipo_pagamento}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">
                ${saida.parcelas > 1 ? `${saida.parcela_atual}/${saida.parcelas}` : '-'}
            </td>
            <td class="px-4 py-3 text-right valor-negativo">${formatCurrency(
              saida.valor
            )}</td>
            <td class="px-4 py-3 text-center">
                <button 
                    onclick="editSaida(${JSON.stringify(saida).replace(
                      /"/g,
                      "&quot;"
                    )})"
                    class="text-blue-500 hover:text-blue-700 mr-3"
                    title="Editar"
                >
                    <i class="fas fa-edit"></i>
                </button>

                <button 
                    onclick="openDeleteModal('saida', '${saida.id}')"
                    class="btn-delete"
                    title="Excluir"
                >
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>        
        </tr>
    `
    )
    .join("");
  
  document.getElementById("countSaidas").textContent = `${
    saidasRecentes.length
  } registro${saidasRecentes.length !== 1 ? "s" : ""}`;
}

// Handle Entrada form submit
async function handleEntradaSubmit(e) {
  e.preventDefault();

  const data = {
    categoria: document.getElementById("entradaCategoria").value,
    valor: parseFloat(document.getElementById("entradaValor").value),
    data: document.getElementById("entradaData").value,
    descricao: document.getElementById("entradaDescricao").value || "",
  };

  const isEdit = editMode.type === "entrada";
  const url = isEdit
    ? `${API_BASE}/entradas/${editMode.id}`
    : `${API_BASE}/entradas`;

  const method = isEdit ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      showToast(
        isEdit
          ? "Entrada atualizada com sucesso!"
          : "Entrada registrada com sucesso!"
      );
      formEntrada.reset();
      document.getElementById("entradaData").value = new Date()
        .toISOString()
        .split("T")[0];
      editMode = { type: null, id: null };
      loadEntradas();
    } else {
      throw new Error("Erro ao salvar");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao salvar entrada", "error");
  }
}

// Handle Saída form submit
async function handleSaidaSubmit(e) {
  e.preventDefault();

  const loja = document.getElementById("saidaLoja").value?.trim();
  const categoria = document.getElementById("saidaCategoria").value?.trim();
  const descricao = document.getElementById("saidaDescricao").value?.trim();
  const valor = parseFloat(document.getElementById("saidaValor").value);
  const tipo_pagamento = document
    .getElementById("saidaTipoPagamento")
    .value?.trim();
  const data = document.getElementById("saidaData").value;
  const parcelas = parseInt(document.getElementById("saidaParcelas").value) || 1;

  if (!loja || !categoria || !descricao || !valor || !tipo_pagamento || !data) {
    showToast("Por favor, preencha todos os campos obrigatórios", "error");
    return;
  }

  if (isNaN(valor) || valor <= 0) {
    showToast("Valor deve ser um número maior que zero", "error");
    return;
  }

  const data_obj = {
    loja,
    categoria,
    descricao,
    valor,
    tipo_pagamento,
    data,
    parcelas,
  };

  const isEdit = editMode.type === "saida";
  const url = saidaEditandoId
    ? `${API_BASE}/saidas/${saidaEditandoId}`
    : `${API_BASE}/saidas`;

  const method = saidaEditandoId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data_obj),
    });

    let responseData = {};
    if (response.headers.get("content-type")?.includes("application/json")) {
      responseData = await response.json();
    }

    if (!response.ok) {
      const text = await response.text();
      console.error(text);
      throw new Error("Erro da API");
    }

    if (response.ok) {
      showToast(
        isEdit
          ? "Saída atualizada com sucesso!"
          : "Saída registrada com sucesso!"
      );
      formSaida.reset();
      document.getElementById("saidaData").value = new Date()
        .toISOString()
        .split("T")[0];
      // Resetar valor por parcela
      document.getElementById("saidaValorParcela").value = "";
      editMode = { type: null, id: null };
      loadSaidas();
    } else {
      throw new Error(responseData.message || "Erro ao salvar saída");
    }
    saidaEditandoId = null;
    formSaida.reset();
  } catch (error) {
    console.error("Erro ao registrar saída:", error);
    showToast(error.message || "Erro ao registrar saída", "error");
  }
}

// Open delete confirmation modal
function openDeleteModal(type, id) {
  deleteTarget = { type, id };
  modalDelete.classList.remove("hidden");
  modalDelete.classList.add("flex");
}

// Close delete modal
function closeDeleteModal() {
  modalDelete.classList.add("hidden");
  modalDelete.classList.remove("show");
  deleteTarget = { type: null, id: null };
}

// Confirm delete
async function confirmDelete() {
  if (!deleteTarget.type || !deleteTarget.id) return;

  const tableName = deleteTarget.type === "entrada" ? "entradas" : "saidas";

  try {
    const response = await fetch(
      `${API_BASE}/${tableName}/${deleteTarget.id}`,
      {
        method: "DELETE",
      }
    );

    if (response.ok || response.status === 204) {
      showToast(
        `${
          deleteTarget.type === "entrada" ? "Entrada" : "Saída"
        } excluída com sucesso!`
      );
      closeDeleteModal();

      if (deleteTarget.type === "entrada") {
        loadEntradas();
      } else {
        loadSaidas();
      }
    } else {
      throw new Error("Erro ao excluir");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao excluir registro", "error");
  }
}

function editEntrada(entrada) {
  document.getElementById("editEntradaId").value = entrada.id;
  document.getElementById("editEntradaCategoria").value = entrada.categoria;
  document.getElementById("editEntradaValor").value = entrada.valor;
  document.getElementById("editEntradaData").value = entrada.data;
  document.getElementById("editEntradaDescricao").value =
    entrada.descricao || "";

  const modal = document.getElementById("modalEditarEntrada");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function fecharModalEditarEntrada() {
  const modal = document.getElementById("modalEditarEntrada");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function editSaida(saida) {
  document.getElementById("editSaidaId").value = saida.id;
  document.getElementById("editSaidaLoja").value = saida.loja;
  document.getElementById("editSaidaCategoria").value = saida.categoria;
  document.getElementById("editSaidaDescricao").value = saida.descricao;
  document.getElementById("editSaidaValor").value = saida.valor;
  document.getElementById("editSaidaPagamento").value = saida.tipo_pagamento;
  document.getElementById("editSaidaData").value = saida.data;
  document.getElementById("editSaidaParcelas").value = saida.parcelas || 1;
  document.getElementById("editSaidaParcelaAtual").value = saida.parcela_atual || 1;

  const modal = document.getElementById("modalEditarSaida");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function fecharModalEditarSaida() {
  const modal = document.getElementById("modalEditarSaida");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

document
  .getElementById("formEditarSaida")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editSaidaId").value;

    const data = {
      loja: document.getElementById("editSaidaLoja").value,
      categoria: document.getElementById("editSaidaCategoria").value,
      descricao: document.getElementById("editSaidaDescricao").value,
      valor: parseFloat(document.getElementById("editSaidaValor").value),
      tipo_pagamento: document.getElementById("editSaidaPagamento").value,
      data: document.getElementById("editSaidaData").value,
      parcelas: parseInt(document.getElementById("editSaidaParcelas").value) || 1,
      parcela_atual: parseInt(document.getElementById("editSaidaParcelaAtual").value) || 1,
    };

    try {
      const response = await fetch(`${API_BASE}/saidas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Erro ao atualizar");

      showToast("Saída atualizada com sucesso!");
      fecharModalEditarSaida();
      loadSaidas();
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar saída", "error");
    }
  });

document
  .getElementById("formEditarEntrada")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editEntradaId").value;

    const data = {
      categoria: document.getElementById("editEntradaCategoria").value,
      valor: parseFloat(document.getElementById("editEntradaValor").value),
      data: document.getElementById("editEntradaData").value,
      descricao: document.getElementById("editEntradaDescricao").value,
    };

    try {
      const response = await fetch(`${API_BASE}/entradas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Erro ao atualizar");

      showToast("Entrada atualizada com sucesso!");
      fecharModalEditarEntrada();
      loadEntradas();
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar entrada", "error");
    }
  });

function preencherCategorias() {
  // Carregar categorias de saída da API
  fetch('http://localhost:3000/categorias/saidas')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar categorias');
      return res.json();
    })
    .then(json => {
      categoriasSaida = (json.data || []).map(cat => cat.nome);
      atualizarSelectsCategorias();
    })
    .catch(err => {
      console.error('Erro ao carregar categorias de saída:', err);
      // Usar categorias padrão em caso de erro
      categoriasSaida = [
        "Transporte",
        "Alimentação",
        "Autocuidado",
        "Moradia",
        "Saúde",
        "Educação",
        "Lazer",
        "Vestuário",
        "MG",
        "Outros",
      ];
      atualizarSelectsCategorias();
    });
}

function carregarTiposPagamentoAPI() {
  // Carregar tipos de pagamento da API
  fetch('http://localhost:3000/tipos-pagamento')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar tipos de pagamento');
      return res.json();
    })
    .then(json => {
      tiposPagamento = (json.data || []).map(tipo => tipo.nome);
      atualizarSelectTipoPagamento();
    })
    .catch(err => {
      console.error('Erro ao carregar tipos de pagamento:', err);
      // Usar tipos padrão em caso de erro
      tiposPagamento = ['Débito', 'Crédito', 'Pix', 'Dinheiro', 'Transferência'];
      atualizarSelectTipoPagamento();
    });
}

function carregarLojasAPI() {
  // Carregar lojas da API
  fetch('http://localhost:3000/lojas')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar lojas');
      return res.json();
    })
    .then(json => {
      lojas = (json.data || []).map(loja => ({ id: loja.id, nome: loja.nome }));
      atualizarSelectLoja();
    })
    .catch(err => {
      console.error('Erro ao carregar lojas:', err);
      // Manter array vazio em caso de erro
      lojas = [];
      atualizarSelectLoja();
    });
}

function carregarCategoriasEntradaAPI() {
  // Carregar categorias de entrada da API
  fetch('http://localhost:3000/categorias/entradas')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar categorias de entrada');
      return res.json();
    })
    .then(json => {
      categoriasEntrada = (json.data || []).map(cat => cat.nome);
      atualizarSelectsCategorias();
    })
    .catch(err => {
      console.error('Erro ao carregar categorias de entrada:', err);
      // Usar categorias padrão em caso de erro
      categoriasEntrada = [
        "Salário",
        "13º Salário",
        "Bônus",
        "Pagamento",
        "Freelance",
        "Investimentos",
        "Outros"
      ];
      atualizarSelectsCategorias();
    });
}

function atualizarSelectTipoPagamento() {
  const saidaTipoPagamento = document.getElementById("saidaTipoPagamento");
  if (saidaTipoPagamento) {
    saidaTipoPagamento.innerHTML =
      '<option value="">Selecione...</option>' +
      tiposPagamento
        .map((tipo) => `<option value="${tipo}">${tipo}</option>`)
        .join("");
  }
}

function atualizarSelectsCategorias() {
  // Saída principal
  const saidaCategoria = document.getElementById("saidaCategoria");
  if (saidaCategoria) {
    saidaCategoria.innerHTML =
      '<option value="">Selecione...</option>' +
      categoriasSaida
        .map((cat) => `<option value="${cat}">${cat}</option>`)
        .join("");
  }
  // Modal editar entrada
  const editEntradaCategoria = document.getElementById("editEntradaCategoria");
  if (editEntradaCategoria) {
    editEntradaCategoria.innerHTML = categoriasEntrada
      .map((cat) => `<option value="${cat}">${cat}</option>`)
      .join("");
  }
  // Modal editar saída
  const editSaidaCategoria = document.getElementById("editSaidaCategoria");
  if (editSaidaCategoria) {
    editSaidaCategoria.innerHTML = categoriasSaida
      .map((cat) => `<option value="${cat}">${cat}</option>`)
      .join("");
  }
}

function atualizarSelectLoja() {
  const saidaLoja = document.getElementById("saidaLoja");
  const editSaidaLoja = document.getElementById("editSaidaLoja");
  
  // Atualizar select principal
  if (saidaLoja) {
    const currentValue = saidaLoja.value;
    saidaLoja.innerHTML =
      '<option value="">Selecione...</option>' +
      '<option value="__nova__">+ Cadastrar nova loja...</option>' +
      lojas
        .map((loja) => `<option value="${loja.nome}">${loja.nome}</option>`)
        .join("");
    // Manter o valor selecionado se ainda existir
    if (currentValue && lojas.some(l => l.nome === currentValue)) {
      saidaLoja.value = currentValue;
    }
  }
  
  // Atualizar select do modal de edição
  if (editSaidaLoja) {
    const currentEditValue = editSaidaLoja.value;
    editSaidaLoja.innerHTML =
      '<option value="">Selecione...</option>' +
      lojas
        .map((loja) => `<option value="${loja.nome}">${loja.nome}</option>`)
        .join("");
    // Manter o valor selecionado se ainda existir
    if (currentEditValue && lojas.some(l => l.nome === currentEditValue)) {
      editSaidaLoja.value = currentEditValue;
    }
  }
}

// Modal Nova Loja functions
function abrirModalNovaLoja() {
  const modal = document.getElementById("modalNovaLoja");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("inputNovaLoja").value = "";
  document.getElementById("inputNovaLoja").focus();
  const msg = document.getElementById("msgNovaLoja");
  msg.className = "text-sm font-semibold hidden";
  msg.textContent = "";
}

function fecharModalNovaLoja() {
  const modal = document.getElementById("modalNovaLoja");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function salvarNovaLoja() {
  const nome = document.getElementById("inputNovaLoja").value.trim();
  const msg = document.getElementById("msgNovaLoja");

  if (!nome) {
    msg.textContent = "Digite o nome da loja";
    msg.className = "text-sm font-semibold text-red-600";
    return;
  }

  fetch("http://localhost:3000/lojas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((err) => {
          throw new Error(err.message || "Erro ao salvar loja");
        });
      }
      return res.json();
    })
    .then((json) => {
      showToast("Loja criada com sucesso!");
      fecharModalNovaLoja();
      // Recarregar lojas e atualizar select
      carregarLojasAPI();
    })
    .catch((err) => {
      console.error(err);
      msg.textContent = err.message || "Erro ao salvar loja";
      msg.className = "text-sm font-semibold text-red-600";
    });
}

// Handle change no select de loja para abrir modal de nova loja
function handleLojaChange() {
  const saidaLoja = document.getElementById("saidaLoja");
  if (saidaLoja && saidaLoja.value === "__nova__") {
    abrirModalNovaLoja();
    // Resetar para primeira opção
    saidaLoja.value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  preencherCategorias();
  carregarCategoriasEntradaAPI();
  carregarTiposPagamentoAPI();
  carregarLojasAPI();
  
  // Event listener para o select de loja
  const saidaLoja = document.getElementById("saidaLoja");
  if (saidaLoja) {
    saidaLoja.addEventListener("change", handleLojaChange);
  }
  
  // Event listener para o formulário de nova loja
  const formNovaLoja = document.getElementById("formNovaLoja");
  if (formNovaLoja) {
    formNovaLoja.addEventListener("submit", (e) => {
      e.preventDefault();
      salvarNovaLoja();
    });
  }
  
  // Adicionar event listeners para cálculo automático de parcelas
  const saidaValor = document.getElementById("saidaValor");
  const saidaParcelas = document.getElementById("saidaParcelas");
  const saidaValorParcela = document.getElementById("saidaValorParcela");
  const saidaTipoPagamento = document.getElementById("saidaTipoPagamento");
  const camposParcelamento = document.getElementById("camposParcelamento");
  
  if (saidaValor && saidaParcelas && saidaValorParcela) {
    function calcularParcela() {
      const valor = parseFloat(saidaValor.value) || 0;
      const parcelas = parseInt(saidaParcelas.value) || 1;
      if (parcelas > 1) {
        const valorParcela = valor / parcelas;
        saidaValorParcela.value = formatCurrency(valorParcela);
      } else {
        saidaValorParcela.value = "";
      }
    }
    
    saidaValor.addEventListener("input", calcularParcela);
    saidaParcelas.addEventListener("change", calcularParcela);
  }
  
  // Mostrar/ocultar campos de parcelamento baseado no tipo de pagamento
  if (saidaTipoPagamento && camposParcelamento) {
    function toggleParcelamento() {
      if (saidaTipoPagamento.value === "Crédito") {
        camposParcelamento.classList.remove("hidden");
      } else {
        camposParcelamento.classList.add("hidden");
        // Resetar parcelas para 1x quando não for crédito
        if (saidaParcelas) {
          saidaParcelas.value = "1";
        }
        if (saidaValorParcela) {
          saidaValorParcela.value = "";
        }
      }
    }
    
    saidaTipoPagamento.addEventListener("change", toggleParcelamento);
  }
});
