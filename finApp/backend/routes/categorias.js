const express = require('express');
const db = require('../db');
const router = express.Router();

// GET todas as categorias de saídas
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM categorias_saidas WHERE ativa = 1 ORDER BY ordem ASC, id ASC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar categorias' });
      res.json({ data: rows });
    }
  );
});

// GET categoria por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM categorias_saidas WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar categoria' });
    if (!row) return res.status(404).json({ message: 'Categoria não encontrada' });
    res.json({ data: row });
  });
});

// POST nova categoria
router.post('/', (req, res) => {
  const { nome } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
  }

  // Buscar maior ordem para colocar no final
  db.get('SELECT MAX(ordem) as maxOrdem FROM categorias_saidas', (err, row) => {
    const ordem = (row?.maxOrdem || 0) + 1;
    
    db.run(
      'INSERT INTO categorias_saidas (nome, ordem) VALUES (?, ?)',
      [nome.trim(), ordem],
      function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao criar categoria' });
        
        // Retornar a categoria criada
        db.get('SELECT * FROM categorias_saidas WHERE id = ?', [this.lastID], (err, row) => {
          res.status(201).json({ data: row, message: 'Categoria criada com sucesso' });
        });
      }
    );
  });
});

// PUT atualizar categoria
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, ordem, ativa } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
  }

  db.run(
    'UPDATE categorias_saidas SET nome = ?, ordem = ?, ativa = ? WHERE id = ?',
    [nome.trim(), ordem || 0, ativa !== undefined ? ativa : 1, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar categoria' });
      if (this.changes === 0) return res.status(404).json({ message: 'Categoria não encontrada' });
      
      // Retornar a categoria atualizada
      db.get('SELECT * FROM categorias_saidas WHERE id = ?', [id], (err, row) => {
        res.json({ data: row, message: 'Categoria atualizada com sucesso' });
      });
    }
  );
});

// DELETE categoria (soft delete - apenas inativa)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Soft delete - apenas marca como inativa
  db.run('UPDATE categorias_saidas SET ativa = 0 WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir categoria' });
    if (this.changes === 0) return res.status(404).json({ message: 'Categoria não encontrada' });
    
    res.json({ message: 'Categoria excluída com sucesso' });
  });
});

module.exports = router;

