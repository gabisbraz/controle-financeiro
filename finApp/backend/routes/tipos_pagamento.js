const express = require('express');
const db = require('../db');
const router = express.Router();

// GET todos os tipos de pagamento ativos
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM tipos_pagamento WHERE ativo = 1 ORDER BY ordem ASC, id ASC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar tipos de pagamento' });
      res.json({ data: rows });
    }
  );
});

// GET tipo de pagamento por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM tipos_pagamento WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar tipo de pagamento' });
    if (!row) return res.status(404).json({ message: 'Tipo de pagamento não encontrado' });
    res.json({ data: row });
  });
});

// POST novo tipo de pagamento
router.post('/', (req, res) => {
  const { nome } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome do tipo de pagamento é obrigatório' });
  }

  // Buscar maior ordem para colocar no final
  db.get('SELECT MAX(ordem) as maxOrdem FROM tipos_pagamento', (err, row) => {
    const ordem = (row?.maxOrdem || 0) + 1;
    
    db.run(
      'INSERT INTO tipos_pagamento (nome, ordem) VALUES (?, ?)',
      [nome.trim(), ordem],
      function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao criar tipo de pagamento' });
        
        // Retornar o tipo de pagamento criado
        db.get('SELECT * FROM tipos_pagamento WHERE id = ?', [this.lastID], (err, row) => {
          res.status(201).json({ data: row, message: 'Tipo de pagamento criado com sucesso' });
        });
      }
    );
  });
});

// PUT atualizar tipo de pagamento
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, ordem, ativo } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ message: 'Nome do tipo de pagamento é obrigatório' });
  }

  db.run(
    'UPDATE tipos_pagamento SET nome = ?, ordem = ?, ativo = ? WHERE id = ?',
    [nome.trim(), ordem || 0, ativo !== undefined ? ativo : 1, id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar tipo de pagamento' });
      if (this.changes === 0) return res.status(404).json({ message: 'Tipo de pagamento não encontrado' });
      
      // Retornar o tipo de pagamento atualizado
      db.get('SELECT * FROM tipos_pagamento WHERE id = ?', [id], (err, row) => {
        res.json({ data: row, message: 'Tipo de pagamento atualizado com sucesso' });
      });
    }
  );
});

// DELETE tipo de pagamento (soft delete - apenas inativa)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Soft delete - apenas marca como inativo
  db.run('UPDATE tipos_pagamento SET ativo = 0 WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir tipo de pagamento' });
    if (this.changes === 0) return res.status(404).json({ message: 'Tipo de pagamento não encontrado' });
    
    res.json({ message: 'Tipo de pagamento excluído com sucesso' });
  });
});

module.exports = router;

