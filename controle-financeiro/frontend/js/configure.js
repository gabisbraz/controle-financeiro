let dadosPreview = [];
let arquivoAtual = null;

function valorOuTraco(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "-";
  }
  return valor;
}

/* ========= PREVIEW ========= */
function preview() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Selecione um arquivo Excel");

  arquivoAtual = file;

  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:3000/preview/saidas", {
    method: "POST",
    body: formData
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao carregar arquivo");
      return res.json();
    })
    .then(json => {
      // Se tiver mais de uma sheet → mostrar select
      if (json.sheets && json.sheets.length > 1) {
        mostrarSelectSheets(json.sheets);
      } else if (json.sheets && json.sheets.length === 1) {
        // Se só tiver uma → carrega direto
        carregarSheet(json.sheets[0]);
      } else {
        alert("Nenhuma aba encontrada no arquivo.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao visualizar arquivo. Verifique se é um Excel válido.");
    });
}

/* ========= SELECT DE SHEETS ========= */
function mostrarSelectSheets(sheets) {
  const container = document.getElementById("sheetContainer");
  const select = document.getElementById("sheetSelect");

  select.innerHTML = `<option value="">Selecione a aba</option>`;
  sheets.forEach(sheet => {
    select.innerHTML += `<option value="${sheet}">${sheet}</option>`;
  });

  container.classList.remove("hidden");

  select.onchange = () => {
    if (select.value) {
      carregarSheet(select.value);
    }
  };
}

/* ========= CARREGAR SHEET ========= */
function carregarSheet(sheetName) {
  const formData = new FormData();
  formData.append("file", arquivoAtual);
  formData.append("sheet", sheetName);

  fetch("http://localhost:3000/preview/saidas", {
    method: "POST",
    body: formData
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao carregar aba");
      return res.json();
    })
    .then(json => {
      dadosPreview = json.data;
      renderTabela(dadosPreview);
      document.getElementById("confirmarBtn").disabled = false;
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao carregar dados da aba.");
    });
}

/* ========= TABELA ========= */
function renderTabela(dados) {
  let html = `
    <table class="w-full">
      <thead class="bg-gray-100 sticky top-0 z-10">
        <tr>
          <th class="px-4 py-2">Loja</th>
          <th class="px-4 py-2">Descrição</th>
          <th class="px-4 py-2">Categoria</th>
          <th class="px-4 py-2">Data</th>
          <th class="px-4 py-2">Pagamento</th>
          <th class="px-4 py-2">Valor</th>
        </tr>
      </thead>
      <tbody>
  `;

  dados.forEach(linha => {
    html += `
      <tr class="border-t">
        <td class="px-4 py-2">${valorOuTraco(linha.loja)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.descricao)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.categoria)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.data)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.tipo_pagamento)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.valor)}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("resultado").innerHTML = html;
}

/* ========= CONFIRMAR ========= */
function confirmar() {
  fetch("http://localhost:3000/import/saidas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosPreview)
  })
    .then(res => res.json())
    .then(r => {
      alert(`Importação concluída! ${r.registros} registros salvos.`);
      window.location.reload();
    });
}


function abrirModalDeleteDb() {
  const modal = document.getElementById("modalDeleteDb");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function fecharModalDeleteDb() {
  const modal = document.getElementById("modalDeleteDb");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function confirmarDeleteDb() {
  fetch("http://localhost:3000/database/clear", {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then((r) => {
      alert("Banco de dados limpo com sucesso!");
      fecharModalDeleteDb();
      document.getElementById("resultado").innerHTML = "";
      document.getElementById("confirmarBtn").disabled = true;
    })
    .catch((err) => {
      console.error(err);
      alert("Erro ao limpar banco");
    });
}

// ================= MODAL DE EDIÇÃO GENÉRICO =================

function abrirModalEditar(id, nome, tipo) {
  const modal = document.getElementById('modalEditar');
  const inputId = document.getElementById('editarId');
  const inputTipo = document.getElementById('editarTipo');
  const inputNome = document.getElementById('editarNome');
  const titulo = document.getElementById('modalEditarTitulo');
  const msg = document.getElementById('editarMsg');

  // Definir título baseado no tipo
  const titulos = {
    'categoria': 'Editar Categoria de Saída',
    'categoria-entrada': 'Editar Categoria de Entrada',
    'tipo-pagamento': 'Editar Tipo de Pagamento',
    'loja': 'Editar Loja'
  };

  inputId.value = id;
  inputTipo.value = tipo;
  inputNome.value = nome;
  titulo.textContent = titulos[tipo] || 'Editar Item';
  msg.textContent = '';
  msg.className = 'text-sm mb-4 font-semibold';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  inputNome.focus();
}

function fecharModalEditar() {
  const modal = document.getElementById('modalEditar');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function salvarEdicao() {
  const id = document.getElementById('editarId').value;
  const tipo = document.getElementById('editarTipo').value;
  const nome = document.getElementById('editarNome').value.trim();
  const msg = document.getElementById('editarMsg');

  if (!nome) {
    msg.textContent = 'Digite o nome do item';
    msg.className = 'text-sm mb-4 font-semibold text-red-600';
    return;
  }

  // Mapear tipos para endpoints
  const endpoints = {
    'categoria': 'categorias/saidas',
    'categoria-entrada': 'categorias/entradas',
    'tipo-pagamento': 'tipos-pagamento',
    'loja': 'lojas'
  };

  const endpoint = endpoints[tipo];

  fetch(`http://localhost:3000/${endpoint}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao salvar edição');
      return res.json();
    })
    .then(() => {
      fecharModalEditar();
      
      // Recarregar a tabela apropriada
      switch (tipo) {
        case 'categoria':
          carregarCategorias();
          break;
        case 'categoria-entrada':
          carregarCategoriasEntrada();
          break;
        case 'tipo-pagamento':
          carregarTiposPagamento();
          break;
        case 'loja':
          carregarLojas();
          break;
      }
    })
    .catch(err => {
      console.error(err);
      msg.textContent = 'Erro ao salvar edição';
      msg.className = 'text-sm mb-4 font-semibold text-red-600';
    });
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modalEditar');
  if (e.target === modal) {
    fecharModalEditar();
  }
});

// Permitir salvar com Enter no input de edição
document.addEventListener('DOMContentLoaded', () => {
  const inputEditar = document.getElementById('editarNome');
  if (inputEditar) {
    inputEditar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarEdicao();
      }
    });
  }
});

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function exportarExcel() {
  window.location.href = "http://localhost:3000/export/excel";
}

let dadosPreviewEntrada = [];
let arquivoAtualEntrada = null;

/* ========= PREVIEW ENTRADAS ========= */
function previewEntrada() {
  const file = document.getElementById("fileInputEntrada").files[0];
  if (!file) return alert("Selecione um arquivo Excel");

  arquivoAtualEntrada = file;

  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:3000/preview/entradas", {
    method: "POST",
    body: formData
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao carregar arquivo");
      return res.json();
    })
    .then(json => {
      if (json.sheets && json.sheets.length > 1) {
        mostrarSelectSheetsEntrada(json.sheets);
      } else if (json.sheets && json.sheets.length === 1) {
        carregarSheetEntrada(json.sheets[0]);
      } else {
        alert("Nenhuma aba encontrada no arquivo.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao visualizar arquivo. Verifique se é um Excel válido.");
    });
}

/* ========= SELECT SHEETS ENTRADAS ========= */
function mostrarSelectSheetsEntrada(sheets) {
  const container = document.getElementById("sheetContainerEntrada");
  const select = document.getElementById("sheetSelectEntrada");

  select.innerHTML = `<option value="">Selecione a aba</option>`;
  sheets.forEach(sheet => {
    select.innerHTML += `<option value="${sheet}">${sheet}</option>`;
  });

  container.classList.remove("hidden");

  select.onchange = () => {
    if (select.value) {
      carregarSheetEntrada(select.value);
    }
  };
}

/* ========= CARREGAR SHEET ENTRADAS ========= */
function carregarSheetEntrada(sheetName) {
  const formData = new FormData();
  formData.append("file", arquivoAtualEntrada);
  formData.append("sheet", sheetName);

  fetch("http://localhost:3000/preview/entradas", {
    method: "POST",
    body: formData
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao carregar aba");
      return res.json();
    })
    .then(json => {
      console.log(json);
      dadosPreviewEntrada = json.data;
      renderTabelaEntrada(dadosPreviewEntrada);
      document.getElementById("confirmarEntradaBtn").disabled = false;
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao carregar dados da aba.");
    });
}

/* ========= TABELA ENTRADAS ========= */
function renderTabelaEntrada(dados) {
  let html = `
    <table class="w-full">
      <thead class="bg-gray-100 sticky top-0 z-10">
        <tr>
          <th class="px-4 py-2">Categoria</th>
          <th class="px-4 py-2">Descrição</th>
          <th class="px-4 py-2">Valor</th>
          <th class="px-4 py-2">Data</th>
        </tr>
      </thead>
      <tbody>
  `;

  dados.forEach(linha => {
    html += `
      <tr class="border-t">
        <td class="px-4 py-2">${valorOuTraco(linha.categoria)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.descricao)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.valor)}</td>
        <td class="px-4 py-2">${valorOuTraco(linha.data)}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("resultadoEntrada").innerHTML = html;
}

/* ========= CONFIRMAR ENTRADAS ========= */
function confirmarEntrada() {
  fetch("http://localhost:3000/import/entradas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosPreviewEntrada)
  })
    .then(res => res.json())
    .then(r => {
      alert(`Importação concluída! ${r.registros} registros salvos.`);
      window.location.reload();
    });
}

// ================= CARTÕES DE CRÉDITO =================

function carregarCartoes() {
  const tabela = document.getElementById('tabelaCartoes');
  if (!tabela) return;

  fetch('http://localhost:3000/cartao')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar cartões');
      return res.json();
    })
    .then(json => {
      const cartoes = json.data || [];
      renderizarTabelaCartoes(cartoes);
    })
    .catch(err => {
      console.error(err);
      tabela.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-red-500">
            <i class="fas fa-exclamation-circle text-2xl"></i>
            <p class="mt-2">Erro ao carregar cartões. Tente novamente.</p>
          </td>
        </tr>
      `;
    });
}

function renderizarTabelaCartoes(cartoes) {
  const tabela = document.getElementById('tabelaCartoes');

  if (!tabela) return;

  if (cartoes.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-credit-card text-4xl mb-2"></i>
          <p>Nenhum cartão cadastrado</p>
        </td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = cartoes
    .map(cartao => `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-4 py-3 text-sm text-gray-600">${cartao.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(cartao.nome_cartao)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">Dia ${cartao.dia_vencimento}</td>
        <td class="px-4 py-3 text-center">
          <button
            onclick="abrirModalEditarCartao(${cartao.id}, '${escapeHtml(cartao.nome_cartao)}', ${cartao.dia_vencimento})"
            class="text-blue-500 hover:text-blue-700 transition mr-2"
            title="Editar cartão"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="excluirCartao(${cartao.id})"
            class="text-red-500 hover:text-red-700 transition"
            title="Excluir cartão"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function salvarCartao() {
  const inputNome = document.getElementById('novoNomeCartao');
  const inputDia = document.getElementById('novoDiaVencimento');
  const msg = document.getElementById('cartaoMsg');
  const nome_cartao = inputNome.value.trim();
  const dia_vencimento = inputDia.value;

  if (!nome_cartao || !dia_vencimento) {
    msg.textContent = 'Preencha todos os campos';
    msg.className = 'text-sm mt-2 font-semibold text-red-600';
    return;
  }

  if (dia_vencimento < 1 || dia_vencimento > 31) {
    msg.textContent = 'Dia de vencimento deve ser entre 1 e 31';
    msg.className = 'text-sm mt-2 font-semibold text-red-600';
    return;
  }

  fetch('http://localhost:3000/cartao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome_cartao, dia_vencimento })
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao salvar cartão');
      return res.json();
    })
    .then(() => {
      msg.textContent = 'Cartão salvo com sucesso!';
      msg.className = 'text-sm mt-2 font-semibold text-green-600';
      inputNome.value = '';
      inputDia.value = '';
      carregarCartoes();
    })
    .catch(err => {
      console.error(err);
      msg.textContent = 'Erro ao salvar cartão';
      msg.className = 'text-sm mt-2 font-semibold text-red-600';
    });
}

function abrirModalEditarCartao(id, nome, dia) {
  const modal = document.getElementById('modalEditar');
  const inputId = document.getElementById('editarId');
  const inputTipo = document.getElementById('editarTipo');
  const inputNome = document.getElementById('editarNome');
  const titulo = document.getElementById('modalEditarTitulo');
  const msg = document.getElementById('editarMsg');

  inputId.value = id;
  inputTipo.value = 'cartao';
  inputNome.value = nome;
  titulo.textContent = 'Editar Cartão de Crédito';
  msg.textContent = '';

  // Adicionar campo de dia de vencimento ao modal
  let diaInput = document.getElementById('editarDiaVencimento');
  if (!diaInput) {
    diaInput = document.createElement('div');
    diaInput.id = 'editarDiaVencimento';
    diaInput.className = 'mb-4';
    diaInput.innerHTML = `
      <label class="block text-sm font-semibold text-gray-700 mb-1 text-left">
        Dia de vencimento
      </label>
      <input type="number" id="editarDiaVencimentoInput" min="1" max="31"
        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        placeholder="1-31">
    `;
    inputNome.parentNode.parentNode.insertBefore(diaInput, inputNome.parentNode.nextSibling);
  }
  
  document.getElementById('editarDiaVencimentoInput').value = dia;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  inputNome.focus();
}

function salvarEdicaoCartao() {
  const id = document.getElementById('editarId').value;
  const nome = document.getElementById('editarNome').value.trim();
  const dia = document.getElementById('editarDiaVencimentoInput').value;
  const msg = document.getElementById('editarMsg');

  if (!nome || !dia) {
    msg.textContent = 'Preencha todos os campos';
    msg.className = 'text-sm mb-4 font-semibold text-red-600';
    return;
  }

  if (dia < 1 || dia > 31) {
    msg.textContent = 'Dia de vencimento deve ser entre 1 e 31';
    msg.className = 'text-sm mb-4 font-semibold text-red-600';
    return;
  }

  fetch(`http://localhost:3000/cartao/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome_cartao: nome, dia_vencimento: dia })
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao atualizar cartão');
      return res.json();
    })
    .then(() => {
      fecharModalEditar();
      carregarCartoes();
    })
    .catch(err => {
      console.error(err);
      msg.textContent = 'Erro ao atualizar cartão';
      msg.className = 'text-sm mb-4 font-semibold text-red-600';
    });
}

function excluirCartao(id) {
  if (!confirm('Tem certeza que deseja excluir este cartão?')) {
    return;
  }

  fetch(`http://localhost:3000/cartao/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao excluir cartão');
      return res.json();
    })
    .then(() => {
      carregarCartoes();
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao excluir cartão');
    });
}

// Modificar a função salvarEdicao para tratar cartão
const salvarEdicaoOriginal = salvarEdicao;
salvarEdicao = function() {
  const tipo = document.getElementById('editarTipo').value;
  if (tipo === 'cartao') {
    salvarEdicaoCartao();
  } else {
    salvarEdicaoOriginal();
  }
};

// Atualizar o evento DOMContentLoaded para carregar cartões
document.addEventListener('DOMContentLoaded', () => {
  carregarCartoes();
  carregarCategorias();
  
  // Adicionar event listeners para inputs de cartão
  const inputNomeCartao = document.getElementById('novoNomeCartao');
  if (inputNomeCartao) {
    inputNomeCartao.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('novoDiaVencimento').focus();
      }
    });
  }
  
  const inputDiaCartao = document.getElementById('novoDiaVencimento');
  if (inputDiaCartao) {
    inputDiaCartao.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarCartao();
      }
    });
  }
});

// ================= CATEGORIAS DE SAÍDA =================

function carregarCategorias() {
  const tabela = document.getElementById('tabelaCategorias');
  if (!tabela) return;

  fetch('http://localhost:3000/categorias/saidas')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar categorias');
      return res.json();
    })
    .then(json => {
      const categorias = json.data || [];
      renderizarTabelaCategorias(categorias);
    })
    .catch(err => {
      console.error(err);
      tabela.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-red-500">
            <i class="fas fa-exclamation-circle text-2xl"></i>
            <p class="mt-2">Erro ao carregar categorias. Tente novamente.</p>
          </td>
        </tr>
      `;
    });
}

function renderizarTabelaCategorias(categorias) {
  const tabela = document.getElementById('tabelaCategorias');

  if (categorias.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-tags text-4xl mb-2"></i>
          <p>Nenhuma categoria cadastrada</p>
        </td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = categorias
    .map(cat => `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-4 py-3 text-sm text-gray-600">${cat.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(cat.nome)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${cat.ordem}</td>
        <td class="px-4 py-3 text-center">
          <button
            onclick="abrirModalEditar(${cat.id}, '${escapeHtml(cat.nome)}', 'categoria')"
            class="text-blue-500 hover:text-blue-700 transition mr-2"
            title="Editar categoria"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="excluirCategoria(${cat.id})"
            class="text-red-500 hover:text-red-700 transition"
            title="Excluir categoria"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function salvarCategoria() {
  const input = document.getElementById('novaCategoria');
  const msg = document.getElementById('categoriaMsg');
  const nome = input.value.trim();

  if (!nome) {
    msg.textContent = 'Digite o nome da categoria';
    msg.className = 'text-sm mt-2 font-semibold text-red-600';
    input.focus();
    return;
  }

  fetch('http://localhost:3000/categorias/saidas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao salvar categoria');
      return res.json();
    })
    .then(() => {
      msg.textContent = 'Categoria salva com sucesso!';
      msg.className = 'text-sm mt-2 font-semibold text-green-600';
      input.value = '';
      carregarCategorias();
    })
    .catch(err => {
      console.error(err);
      msg.textContent = 'Erro ao salvar categoria';
      msg.className = 'text-sm mt-2 font-semibold text-red-600';
    });
}

function excluirCategoria(id) {
  if (!confirm('Tem certeza que deseja excluir esta categoria?')) {
    return;
  }

  fetch(`http://localhost:3000/categorias/saidas/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao excluir categoria');
      return res.json();
    })
    .then(() => {
      carregarCategorias();
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao excluir categoria');
    });
}

// Função helper para escapar HTML e prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Permitir salvar com Enter no input de categoria
document.addEventListener('DOMContentLoaded', () => {
  const inputCategoria = document.getElementById('novaCategoria');
  if (inputCategoria) {
    inputCategoria.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarCategoria();
      }
    });
  }

  // Carregar tipos de pagamento
  carregarTiposPagamento();
  
  // Adicionar event listener para o input de tipo de pagamento
  const inputTipoPagamento = document.getElementById('novoTipoPagamento');
  if (inputTipoPagamento) {
    inputTipoPagamento.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarTipoPagamento();
      }
    });
  }

  // Carregar categorias de entrada
  carregarCategoriasEntrada();
  
  // Adicionar event listener para o input de categoria de entrada
  const inputCategoriaEntrada = document.getElementById('novaCategoriaEntrada');
  if (inputCategoriaEntrada) {
    inputCategoriaEntrada.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarCategoriaEntrada();
      }
    });
  }

  // Carregar lojas
  carregarLojas();
  
  // Adicionar event listener para o input de loja
  const inputLoja = document.getElementById('novaLoja');
  if (inputLoja) {
    inputLoja.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarLoja();
      }
    });
  }
});

// ================= CATEGORIAS DE ENTRADA =================

function carregarCategoriasEntrada() {
  const tabela = document.getElementById('tabelaCategoriasEntrada');
  if (!tabela) return;

  fetch('http://localhost:3000/categorias/entradas')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar categorias de entrada');
      return res.json();
    })
    .then(json => {
      const categorias = json.data || [];
      renderizarTabelaCategoriasEntrada(categorias);
    })
    .catch(err => {
      console.error(err);
      tabela.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-red-500">
            <i class="fas fa-exclamation-circle text-2xl"></i>
            <p class="mt-2">Erro ao carregar categorias de entrada. Tente novamente.</p>
          </td>
        </tr>
      `;
    });
}

function renderizarTabelaCategoriasEntrada(categorias) {
  const tabela = document.getElementById('tabelaCategoriasEntrada');

  if (!tabela) return;

  if (categorias.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-arrow-up text-4xl mb-2"></i>
          <p>Nenhuma categoria de entrada cadastrada</p>
        </td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = categorias
    .map(cat => `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-4 py-3 text-sm text-gray-600">${cat.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(cat.nome)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${cat.ordem}</td>
        <td class="px-4 py-3 text-center">
          <button
            onclick="abrirModalEditar(${cat.id}, '${escapeHtml(cat.nome)}', 'categoria-entrada')"
            class="text-blue-500 hover:text-blue-700 transition mr-2"
            title="Editar categoria de entrada"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="excluirCategoriaEntrada(${cat.id})"
            class="text-red-500 hover:text-red-700 transition"
            title="Excluir categoria de entrada"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function salvarCategoriaEntrada() {
  const input = document.getElementById('novaCategoriaEntrada');
  const msg = document.getElementById('categoriaEntradaMsg');
  const nome = input.value.trim();

  if (!nome) {
    msg.textContent = 'Digite o nome da categoria de entrada';
    msg.className = 'text-sm mt-2 font-semibold text-red-600';
    input.focus();
    return;
  }

  fetch('http://localhost:3000/categorias/entradas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao salvar categoria de entrada');
      return res.json();
    })
    .then(() => {
      msg.textContent = 'Categoria de entrada salva com sucesso!';
      msg.className = 'text-sm mt-2 font-semibold text-green-600';
      input.value = '';
      carregarCategoriasEntrada();
    })
    .catch(err => {
      console.error(err);
      msg.textContent = 'Erro ao salvar categoria de entrada';
      msg.className = 'text-sm mt-2 font-semibold text-red-600';
    });
}

function excluirCategoriaEntrada(id) {
  if (!confirm('Tem certeza que deseja excluir esta categoria de entrada?')) {
    return;
  }

  fetch(`http://localhost:3000/categorias/entradas/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao excluir categoria de entrada');
      return res.json();
    })
    .then(() => {
      carregarCategoriasEntrada();
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao excluir categoria de entrada');
    });
}

// ================= TIPOS DE PAGAMENTO =================

function carregarTiposPagamento() {
  const tabela = document.getElementById('tabelaTiposPagamento');
  if (!tabela) return;

  fetch('http://localhost:3000/tipos-pagamento')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar tipos de pagamento');
      return res.json();
    })
    .then(json => {
      const tipos = json.data || [];
      renderizarTabelaTiposPagamento(tipos);
    })
    .catch(err => {
      console.error(err);
      tabela.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-red-500">
            <i class="fas fa-exclamation-circle text-2xl"></i>
            <p class="mt-2">Erro ao carregar tipos de pagamento. Tente novamente.</p>
          </td>
        </tr>
      `;
    });
}

function renderizarTabelaTiposPagamento(tipos) {
  const tabela = document.getElementById('tabelaTiposPagamento');

  if (!tabela) return;

  if (tipos.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-credit-card text-4xl mb-2"></i>
          <p>Nenhum tipo de pagamento cadastrado</p>
        </td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = tipos
    .map(tipo => `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-4 py-3 text-sm text-gray-600">${tipo.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(tipo.nome)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${tipo.ordem}</td>
        <td class="px-4 py-3 text-center">
          <button
            onclick="abrirModalEditar(${tipo.id}, '${escapeHtml(tipo.nome)}', 'tipo-pagamento')"
            class="text-blue-500 hover:text-blue-700 transition mr-2"
            title="Editar tipo de pagamento"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="excluirTipoPagamento(${tipo.id})"
            class="text-red-500 hover:text-red-700 transition"
            title="Excluir tipo de pagamento"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function salvarTipoPagamento() {
  const input = document.getElementById('novoTipoPagamento');
  const msg = document.getElementById('tipoPagamentoMsg');
  const nome = input.value.trim();

  if (!nome) {
    msg.textContent = 'Digite o nome do tipo de pagamento';
    msg.className = 'text-sm mt-2 font-semibold text-red-600';
    input.focus();
    return;
  }

  fetch('http://localhost:3000/tipos-pagamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao salvar tipo de pagamento');
      return res.json();
    })
    .then(() => {
      msg.textContent = 'Tipo de pagamento salvo com sucesso!';
      msg.className = 'text-sm mt-2 font-semibold text-green-600';
      input.value = '';
      carregarTiposPagamento();
    })
    .catch(err => {
      console.error(err);
      msg.textContent = 'Erro ao salvar tipo de pagamento';
      msg.className = 'text-sm mt-2 font-semibold text-red-600';
    });
}

function excluirTipoPagamento(id) {
  if (!confirm('Tem certeza que deseja excluir este tipo de pagamento?')) {
    return;
  }

  fetch(`http://localhost:3000/tipos-pagamento/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao excluir tipo de pagamento');
      return res.json();
    })
    .then(() => {
      carregarTiposPagamento();
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao excluir tipo de pagamento');
    });
}

// ================= LOJAS =================

function carregarLojas() {
  const tabela = document.getElementById('tabelaLojas');
  if (!tabela) return;

  fetch('http://localhost:3000/lojas')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar lojas');
      return res.json();
    })
    .then(json => {
      const lojas = json.data || [];
      renderizarTabelaLojas(lojas);
    })
    .catch(err => {
      console.error(err);
      tabela.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-red-500">
            <i class="fas fa-exclamation-circle text-2xl"></i>
            <p class="mt-2">Erro ao carregar lojas. Tente novamente.</p>
          </td>
        </tr>
      `;
    });
}

function renderizarTabelaLojas(lojas) {
  const tabela = document.getElementById('tabelaLojas');

  if (!tabela) return;

  if (lojas.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-store text-4xl mb-2"></i>
          <p>Nenhuma loja cadastrada</p>
        </td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = lojas
    .map(loja => `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-4 py-3 text-sm text-gray-600">${loja.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(loja.nome)}</td>
        <td class="px-4 py-3 text-center">
          <button
            onclick="abrirModalEditar(${loja.id}, '${escapeHtml(loja.nome)}', 'loja')"
            class="text-blue-500 hover:text-blue-700 transition mr-2"
            title="Editar loja"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="excluirLoja(${loja.id})"
            class="text-red-500 hover:text-red-700 transition"
            title="Excluir loja"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function salvarLoja() {
  const input = document.getElementById('novaLoja');
  const msg = document.getElementById('lojaMsg');
  const nome = input.value.trim();

  if (!nome) {
    msg.textContent = 'Digite o nome da loja';
    msg.className = 'text-sm mt-2 font-semibold text-red-600';
    input.focus();
    return;
  }

  fetch('http://localhost:3000/lojas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.message || 'Erro ao salvar loja');
        });
      }
      return res.json();
    })
    .then(() => {
      msg.textContent = 'Loja salva com sucesso!';
      msg.className = 'text-sm mt-2 font-semibold text-green-600';
      input.value = '';
      carregarLojas();
    })
    .catch(err => {
      console.error(err);
      msg.textContent = err.message || 'Erro ao salvar loja';
      msg.className = 'text-sm mt-2 font-semibold text-red-600';
    });
}

function excluirLoja(id) {
  if (!confirm('Tem certeza que deseja excluir esta loja?')) {
    return;
  }

  fetch(`http://localhost:3000/lojas/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao excluir loja');
      return res.json();
    })
    .then(() => {
      carregarLojas();
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao excluir loja');
    });
}
