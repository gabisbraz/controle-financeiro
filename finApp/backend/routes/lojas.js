const express = require('express');
const db = require('../db');
const router = express.Router();

// GET todas as lojas ativas
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM lojas WHERE ativa = 1 ORDER BY nome ASC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar lojas' });
      res.json({ data: rows });
    }
  );
});

// GET loja por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM lojas WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar loja' });
    if (!row) return res.status(404).json({ message: 'Loja não encontrada' });
    res.json({ data: row });
  });
});

// POST nova loja
router.post('/', (req, res) => {
  const { nome } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome da loja é obrigatório' });
  }

  db.run(
    'INSERT INTO lojas (nome) VALUES (?)',
    [nome.trim()],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Já existe uma loja com este nome' });
        }
        return res.status(500).json({ message: 'Erro ao criar loja' });
      }
      
      // Retornar a loja criada
      db.get('SELECT * FROM lojas WHERE id = ?', [this.lastID], (err, row) => {
        res.status(201).json({ data: row, message: 'Loja criada com sucesso' });
      });
    }
  );
});

// PUT atualizar loja
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, ativa } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome da loja é obrigatório' });
  }

  db.run(
    'UPDATE lojas SET nome = ?, ativa = ? WHERE id = ?',
    [nome.trim(), ativa !== undefined ? ativa : 1, id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Já existe uma loja com este nome' });
        }
        return res.status(500).json({ message: 'Erro ao atualizar loja' });
      }
      if (this.changes === 0) return res.status(404).json({ message: 'Loja não encontrada' });
      
      // Retornar a loja atualizada
      db.get('SELECT * FROM lojas WHERE id = ?', [id], (err, row) => {
        res.json({ data: row, message: 'Loja atualizada com sucesso' });
      });
    }
  );
});

// DELETE loja (soft delete - apenas inativa)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Soft delete - apenas marca como inativa
  db.run('UPDATE lojas SET ativa = 0 WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir loja' });
    if (this.changes === 0) return res.status(404).json({ message: 'Loja não encontrada' });
    
    res.json({ message: 'Loja excluída com sucesso' });
  });
});

module.exports = router;

