let dadosPreview = [];

function valorOuTraco(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '-';
  }
  return valor;
}

function preview() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert('Selecione um arquivo Excel');

    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:3000/preview/saidas', {
    method: 'POST',
    body: formData
    })
    .then(res => res.json())
    .then(json => {
        dadosPreview = json.data;
        renderTabela(dadosPreview);
        document.getElementById('confirmarBtn').disabled = false;
    });
}

function renderTabela(dados) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Loja</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Data</th>
          <th>Pagamento</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
  `;

  dados.forEach(linha => {
    html += `
      <tr>
        <td>${valorOuTraco(linha.loja)}</td>
        <td>${valorOuTraco(linha.descricao)}</td>
        <td>${valorOuTraco(linha.categoria)}</td>
        <td>${valorOuTraco(linha.data)}</td>
        <td>${valorOuTraco(linha.tipo_pagamento)}</td>
        <td>${valorOuTraco(linha.valor)}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  document.getElementById('resultado').innerHTML = html;
}

function confirmar() {
    fetch('http://localhost:3000/import/saidas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dadosPreview)
    })
    .then(res => res.json())
    .then(r => {
        alert(`Importação concluída! ${r.registros} registros salvos.`);
        window.location.reload();
    });
}