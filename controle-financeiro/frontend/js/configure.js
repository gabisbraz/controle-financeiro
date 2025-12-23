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
    .then(res => res.json())
    .then(json => {
      // Se tiver mais de uma sheet → mostrar select
      if (json.sheets.length > 1) {
        mostrarSelectSheets(json.sheets);
      } else {
        // Se só tiver uma → carrega direto
        carregarSheet(json.sheets[0]);
      }
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
    .then(res => res.json())
    .then(json => {
      dadosPreview = json.data;
      renderTabela(dadosPreview);
      document.getElementById("confirmarBtn").disabled = false;
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
    .then(res => res.json())
    .then(json => {
      if (json.sheets.length > 1) {
        mostrarSelectSheetsEntrada(json.sheets);
      } else {
        console.log("ERROOOO");
        carregarSheetEntrada(json.sheets[0]);
      }
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
    .then(res => res.json())
    .then(json => {
      console.log(json);
      dadosPreviewEntrada = json.data;
      renderTabelaEntrada(dadosPreviewEntrada);
      document.getElementById("confirmarEntradaBtn").disabled = false;
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

// ================= CARTÃO DE CRÉDITO =================

function carregarCartao() {
  fetch('http://localhost:3000/cartao')
    .then(res => res.json())
    .then(dados => {
      if (dados) {
        document.getElementById('nomeCartao').value = dados.nome_cartao;
        document.getElementById('diaVencimento').value = dados.dia_vencimento;
      }
    });
}

function salvarCartao() {
  const nome_cartao = document.getElementById('nomeCartao').value.trim();
  const dia_vencimento = document.getElementById('diaVencimento').value;

  if (!nome_cartao || !dia_vencimento) {
    alert('Preencha todos os campos');
    return;
  }

  if (dia_vencimento < 1 || dia_vencimento > 31) {
    alert('Dia de vencimento inválido');
    return;
  }

  fetch('http://localhost:3000/cartao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome_cartao, dia_vencimento })
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById('cartaoMsg').innerText =
        'Dados do cartão salvos com sucesso!';
      document.getElementById('cartaoMsg').className =
        'text-green-600 text-sm font-semibold';
    });
}

document.addEventListener('DOMContentLoaded', carregarCartao);
