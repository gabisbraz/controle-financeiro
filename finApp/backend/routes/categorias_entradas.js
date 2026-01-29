const express = require('express');
const db = require('../db');
const router = express.Router();

// GET todas as categorias de entradas ativas
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM categorias_entradas WHERE ativo = 1 ORDER BY ordem ASC, id ASC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar categorias de entradas' });
      res.json({ data: rows });
    }
  );
});

// GET categoria de entrada por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM categorias_entradas WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar categoria de entrada' });
    if (!row) return res.status(404).json({ message: 'Categoria de entrada não encontrada' });
    res.json({ data: row });
  });
});

// POST nova categoria de entrada
router.post('/', (req, res) => {
  const { nome } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
  }

  // Buscar maior ordem para colocar no final
  db.get('SELECT MAX(ordem) as maxOrdem FROM categorias_entradas', (err, row) => {
    const ordem = (row?.maxOrdem || 0) + 1;
    
    db.run(
      'INSERT INTO categorias_entradas (nome, ordem) VALUES (?, ?)',
      [nome.trim(), ordem],
      function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao criar categoria de entrada' });
        
        // Retornar a categoria criada
        db.get('SELECT * FROM categorias_entradas WHERE id = ?', [this.lastID], (err, row) => {
          res.status(201).json({ data: row, message: 'Categoria de entrada criada com sucesso' });
        });
      }
    );
  });
});

// PUT atualizar categoria de entrada
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, ordem, ativo } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
  }

  db.run(
    'UPDATE categorias_entradas SET nome = ?, ordem = ?, ativo = ? WHERE id = ?',
    [nome.trim(), ordem || 0, ativo !== undefined ? ativo : 1, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar categoria de entrada' });
      if (this.changes === 0) return res.status(404).json({ message: 'Categoria de entrada não encontrada' });
      
      // Retornar a categoria atualizada
      db.get('SELECT * FROM categorias_entradas WHERE id = ?', [id], (err, row) => {
        res.json({ data: row, message: 'Categoria de entrada atualizada com sucesso' });
      });
    }
  );
});

// DELETE categoria de entrada (soft delete - apenas inativa)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Soft delete - apenas marca como inativa
  db.run('UPDATE categorias_entradas SET ativo = 0 WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir categoria de entrada' });
    if (this.changes === 0) return res.status(404).json({ message: 'Categoria de entrada não encontrada' });
    
    res.json({ message: 'Categoria de entrada excluída com sucesso' });
  });
});

module.exports = router;

