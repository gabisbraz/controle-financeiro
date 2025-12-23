const express = require('express');
const db = require('../db');
const router = express.Router();

// GET entradas
router.get('/', (req, res) => {
  db.all('SELECT * FROM entradas ORDER BY data DESC', [], (err, rows) => {
    res.json({ data: rows });
  });
});

// POST entrada
router.post('/', (req, res) => {
  const { categoria, descricao, valor, data } = req.body;
  db.run(
    `INSERT INTO entradas (categoria, descricao, valor, data) VALUES (?, ?, ?, ?)`,
    [categoria, descricao, valor, data],
    function () {
      res.status(201).json({ id: this.lastID });
    }
  );
});

// PUT entrada
router.put('/:id', (req, res) => {
  const { categoria, descricao, valor, data } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE entradas SET categoria = ?, descricao = ?, valor = ?, data = ? WHERE id = ?`,
    [categoria, descricao, valor, data, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar entrada' });
      res.json({ message: 'Entrada atualizada com sucesso' });
    }
  );
});

// DELETE entrada
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM entradas WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir entrada' });
    if (this.changes === 0) return res.status(404).json({ message: 'Entrada não encontrada' });
    res.status(204).send();
  });
});

module.exports = router;
