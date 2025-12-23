const express = require('express');
const db = require('../db');
const router = express.Router();

// DELETE dados das tabelas
router.delete('/database/clear', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM entradas');
    db.run('DELETE FROM saidas', err => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao limpar banco' });
      }
      res.json({ message: 'Banco de dados limpo com sucesso' });
    });
  });
});

module.exports = router;

