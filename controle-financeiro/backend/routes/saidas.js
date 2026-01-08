const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Helper function to get ID by name from a table
function getIdByName(table, name) {
  return new Promise((resolve, reject) => {
    if (!name) {
      resolve(null);
      return;
    }
    const query = `SELECT id FROM ${table} WHERE nome = ? LIMIT 1`;
    db.get(query, [name], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.id : null);
    });
  });
}

// Helper function to get all data needed for insertion
async function getIdsFromNames(data) {
  const [loja_id, categoria_id, tipo_pagamento_id] = await Promise.all([
    getIdByName('lojas', data.loja),
    getIdByName('categorias_saidas', data.categoria),
    getIdByName('tipos_pagamento', data.tipo_pagamento)
  ]);
  return { loja_id, categoria_id, tipo_pagamento_id };
}

// GET saidas
router.get('/', (req, res) => {
  const query = `
    SELECT 
      s.id,
      s.loja_id,
      l.nome as loja,
      s.categoria_id,
      cs.nome as categoria,
      s.tipo_pagamento_id,
      tp.nome as tipo_pagamento,
      s.descricao,
      s.valor,
      s.data,
      s.data_input,
      s.parcelas,
      s.parcela_atual,
      s.parcela_id
    FROM saidas s
    LEFT JOIN lojas l ON s.loja_id = l.id
    LEFT JOIN categorias_saidas cs ON s.categoria_id = cs.id
    LEFT JOIN tipos_pagamento tp ON s.tipo_pagamento_id = tp.id
    ORDER BY s.data DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar saídas', error: err.message });
    res.json({ data: rows });
  });
});

// POST saida
router.post('/', async (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data, parcelas, parcela_id } = req.body;
  const data_input = new Date().toISOString();
  
  console.log('Recebido POST saidas (com nomes):', { loja, categoria, descricao, tipo_pagamento, valor, data, parcelas, parcela_id });
  
  // Look up IDs from names
  const { loja_id, categoria_id, tipo_pagamento_id } = await getIdsFromNames({ loja, categoria, tipo_pagamento });
  
  console.log('IDs resolvidos:', { loja_id, categoria_id, tipo_pagamento_id });
  
  // Se parcelas for maior que 1, criar registros para cada parcela
  if (parcelas && parseInt(parcelas) > 1) {
    console.log('Criando', parcelas, 'parcelas...');
    const valorParcela = valor / parcelas;
    const idParcela = parcela_id || uuidv4();
    const promises = [];
    
    for (let i = 0; i < parcelas; i++) {
      const dataParcela = new Date(data);
      dataParcela.setMonth(dataParcela.getMonth() + i);
      const dataParcelaStr = dataParcela.toISOString().split('T')[0];
      console.log(`Parcela ${i+1}: ${dataParcelaStr} = R$ ${valorParcela}`);
      
      const promise = new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO saidas (loja_id, categoria_id, descricao, tipo_pagamento_id, valor, data, data_input, parcelas, parcela_atual, parcela_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [loja_id, categoria_id, descricao, tipo_pagamento_id, valorParcela, dataParcelaStr, data_input, parcelas, i + 1, idParcela],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      promises.push(promise);
    }
    
    Promise.all(promises)
      .then((ids) => {
        console.log('Parcelas criadas com IDs:', ids);
        res.status(201).json({ id: ids[0], parcela_id: idParcela, message: `${parcelas} parcelas criadas com sucesso` });
      })
      .catch((err) => {
        console.error('Erro ao criar parcelas:', err);
        res.status(500).json({ message: 'Erro ao criar parcelas' });
      });
  } else {
    // Parcela única
    console.log('Criando parcela única');
    db.run(
      `INSERT INTO saidas (loja_id, categoria_id, descricao, tipo_pagamento_id, valor, data, data_input, parcelas, parcela_atual, parcela_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loja_id, categoria_id, descricao, tipo_pagamento_id, valor, data, data_input, 1, 1, parcela_id || uuidv4()],
      function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao criar saída', error: err.message });
        res.status(201).json({ id: this.lastID });
      }
    );
  }
});

// PUT saida
router.put('/:id', async (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data, parcelas, parcela_atual, parcela_id } = req.body;
  const { id } = req.params;

  // Look up IDs from names if provided
  const { loja_id, categoria_id, tipo_pagamento_id } = await getIdsFromNames({ loja, categoria, tipo_pagamento });

  db.run(
    `UPDATE saidas SET loja_id=?, categoria_id=?, descricao=?, tipo_pagamento_id=?, valor=?, data=?, parcelas=?, parcela_atual=?, parcela_id=? WHERE id=?`,
    [loja_id, categoria_id, descricao, tipo_pagamento_id, valor, data, parcelas || 1, parcela_atual || 1, parcela_id, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar saída', error: err.message });
      res.json({ message: 'Saída atualizada com sucesso' });
    }
  );
});

// DELETE saida
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { excluir_todas } = req.query;
  
  // Primeiro, buscar se a saída tem parcelas
  db.get('SELECT parcela_id FROM saidas WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao verificar saída' });
    
    if (row && row.parcela_id && excluir_todas === 'true') {
      // Excluir todas as parcelas do mesmo grupo
      db.run('DELETE FROM saidas WHERE parcela_id = ?', [row.parcela_id], function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao excluir parcelas' });
        res.status(204).send();
      });
    } else {
      // Excluir apenas uma saída
      db.run('DELETE FROM saidas WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao excluir saída' });
        if (this.changes === 0) return res.status(404).json({ message: 'Saída não encontrada' });
        res.status(204).send();
      });
    }
  });
});

module.exports = router;
