const express = require('express');
const db = require('../db');
const router = express.Router();

// GET saidas
router.get('/', (req, res) => {
  db.all('SELECT * FROM saidas ORDER BY data DESC', [], (err, rows) => {
    res.json({ data: rows });
  });
});

// POST saida
router.post('/', (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data } = req.body;
  db.run(
    `INSERT INTO saidas (loja, categoria, descricao, tipo_pagamento, valor, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [loja, categoria, descricao, tipo_pagamento, valor, data],
    function () {
      res.status(201).json({ id: this.lastID });
    }
  );
});

// PUT saida
router.put('/:id', (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE saidas SET loja=?, categoria=?, descricao=?, tipo_pagamento=?, valor=?, data=? WHERE id=?`,
    [loja, categoria, descricao, tipo_pagamento, valor, data, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar saída' });
      res.json({ message: 'Saída atualizada com sucesso' });
    }
  );
});

// DELETE saida
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM saidas WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir saída' });
    if (this.changes === 0) return res.status(404).json({ message: 'Saída não encontrada' });
    res.status(204).send();
  });
});

module.exports = router;
