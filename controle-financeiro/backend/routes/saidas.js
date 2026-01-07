const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET saidas
router.get('/', (req, res) => {
  db.all('SELECT * FROM saidas WHERE data_input >= datetime("now", "-15 days") ORDER BY data DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar saídas' });
    res.json({ data: rows });
  });
});

// POST saida
router.post('/', (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data, parcelas, parcela_id } = req.body;
  const data_input = new Date().toISOString();
  
  console.log('Recebido POST saidas:', { loja, categoria, descricao, tipo_pagamento, valor, data, parcelas, parcela_id });
  
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
          `INSERT INTO saidas (loja, categoria, descricao, tipo_pagamento, valor, data, data_input, parcelas, parcela_atual, parcela_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [loja, categoria, descricao, tipo_pagamento, valorParcela, dataParcelaStr, data_input, parcelas, i + 1, idParcela],
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
      `INSERT INTO saidas (loja, categoria, descricao, tipo_pagamento, valor, data, data_input, parcelas, parcela_atual, parcela_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loja, categoria, descricao, tipo_pagamento, valor, data, data_input, 1, 1, parcela_id || uuidv4()],
      function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao criar saída' });
        res.status(201).json({ id: this.lastID });
      }
    );
  }
});

// PUT saida
router.put('/:id', (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data, parcelas, parcela_atual, parcela_id } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE saidas SET loja=?, categoria=?, descricao=?, tipo_pagamento=?, valor=?, data=?, parcelas=?, parcela_atual=?, parcela_id=? WHERE id=?`,
    [loja, categoria, descricao, tipo_pagamento, valor, data, parcelas || 1, parcela_atual || 1, parcela_id, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar saída' });
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
