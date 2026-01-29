const express = require('express');
const db = require('../db');
const { getOrCreateCategoriaEntrada } = require('../helpers');

router = express.Router();

// GET entradas
router.get('/', (req, res) => {
  db.all('SELECT * FROM entradas ORDER BY data DESC', [], (err, rows) => {
    res.json({ data: rows });
  });
});

// POST entrada
router.post('/', async (req, res) => {
  const { categoria, descricao, valor, data } = req.body;
  const data_input = new Date().toISOString();
  
  // Obter ou criar o ID da categoria
  const categoriaId = await getOrCreateCategoriaEntrada(categoria);
  
  db.run(
    `INSERT INTO entradas (categoria, categoria_id, descricao, valor, data, data_input) VALUES (?, ?, ?, ?, ?, ?)`,
    [categoria, categoriaId, descricao, valor, data, data_input],
    function () {
      res.status(201).json({ id: this.lastID });
    }
  );
});

// PUT entrada
router.put('/:id', async (req, res) => {
  const { categoria, descricao, valor, data } = req.body;
  const { id } = req.params;
  
  // Obter ou criar o ID da categoria
  const categoriaId = await getOrCreateCategoriaEntrada(categoria);

  db.run(
    `UPDATE entradas SET categoria = ?, categoria_id = ?, descricao = ?, valor = ?, data = ? WHERE id = ?`,
    [categoria, categoriaId, descricao, valor, data, id],
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

