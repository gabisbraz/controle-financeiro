const express = require('express');
const db = require('../db');
const router = express.Router();

// GET vencimento cartão
router.get('/', (req, res) => {
  db.get('SELECT * FROM cartao_fatura LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao buscar cartão' });
    res.json(row || null);
  });
});

// POST atualizar/insert cartão
router.post('/', (req, res) => {
  const { nome_cartao, dia_vencimento } = req.body;
  db.get('SELECT id FROM cartao_fatura LIMIT 1', [], (err, row) => {
    if (row) {
      db.run('UPDATE cartao_fatura SET nome_cartao=?, dia_vencimento=? WHERE id=?', [nome_cartao, dia_vencimento, row.id], () => {
        res.json({ message: 'Cartão atualizado com sucesso' });
      });
    } else {
      db.run('INSERT INTO cartao_fatura (nome_cartao, dia_vencimento) VALUES (?, ?)', [nome_cartao, dia_vencimento], () => {
        res.json({ message: 'Cartão salvo com sucesso' });
      });
    }
  });
});

module.exports = router;
