const express = require('express');
const db = require('../db');
const router = express.Router();

// GET listar todos os cartões
router.get('/', (req, res) => {
  db.all('SELECT * FROM cartao_fatura ORDER BY id', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar cartões' });
    res.json({ data: rows || [] });
  });
});

// POST criar novo cartão
router.post('/', (req, res) => {
  const { nome_cartao, dia_vencimento } = req.body;
  
  if (!nome_cartao || !dia_vencimento) {
    return res.status(400).json({ message: 'Nome do cartão e dia de vencimento são obrigatórios' });
  }

  if (dia_vencimento < 1 || dia_vencimento > 31) {
    return res.status(400).json({ message: 'Dia de vencimento deve ser entre 1 e 31' });
  }

  db.run('INSERT INTO cartao_fatura (nome_cartao, dia_vencimento) VALUES (?, ?)', 
    [nome_cartao, dia_vencimento], 
    function(err) {
      if (err) return res.status(500).json({ message: 'Erro ao salvar cartão' });
      res.json({ 
        message: 'Cartão salvo com sucesso', 
        id: this.lastID 
      });
    }
  );
});

// PUT atualizar cartão específico
router.put('/:id', (req, res) => {
  const { nome_cartao, dia_vencimento } = req.body;
  const { id } = req.params;

  if (!nome_cartao || !dia_vencimento) {
    return res.status(400).json({ message: 'Nome do cartão e dia de vencimento são obrigatórios' });
  }

  if (dia_vencimento < 1 || dia_vencimento > 31) {
    return res.status(400).json({ message: 'Dia de vencimento deve ser entre 1 e 31' });
  }

  db.run('UPDATE cartao_fatura SET nome_cartao=?, dia_vencimento=? WHERE id=?', 
    [nome_cartao, dia_vencimento, id], 
    function(err) {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar cartão' });
      if (this.changes === 0) return res.status(404).json({ message: 'Cartão não encontrado' });
      res.json({ message: 'Cartão atualizado com sucesso' });
    }
  );
});

// DELETE excluir cartão
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM cartao_fatura WHERE id=?', [id], function(err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir cartão' });
    if (this.changes === 0) return res.status(404).json({ message: 'Cartão não encontrado' });
    res.json({ message: 'Cartão excluído com sucesso' });
  });
});

module.exports = router;

