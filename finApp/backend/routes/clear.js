const express = require('express');
const db = require('../db');
const router = express.Router();

// DELETE dados das tabelas
router.delete('/database/clear', (req, res) => {
  db.serialize(() => {
    // Limpar todas as tabelas
    db.run('DELETE FROM entradas');
    db.run('DELETE FROM lojas');
    db.run('DELETE FROM categorias_saidas');
    db.run('DELETE FROM categorias_entradas');
    db.run('DELETE FROM tipos_pagamento');
    db.run('DELETE FROM cartao_fatura');
    db.run('DELETE FROM saidas');

    // Popular categorias de entradas
    const categoriasEntradas = [
      'Salário',
      'Bônus',
      'Pagamento externo'
    ];
    categoriasEntradas.forEach((nome, index) => {
      db.run(`INSERT OR IGNORE INTO categorias_entradas (nome, ordem) VALUES (?, ?)`, [nome, index + 1]);
    });

    // Popular categorias de saídas
    const categoriasSaidas = [
      'Vestuário',
      'Eletrônicos',
      'Beleza',
      'Alimentação',
      'Transporte'
    ];
    categoriasSaidas.forEach((nome, index) => {
      db.run(`INSERT OR IGNORE INTO categorias_saidas (nome, ordem) VALUES (?, ?)`, [nome, index + 1]);
    });

    // Popular lojas
    const lojas = [
      'Amazon',
      'Zara',
      'Renner',
      'C&A'
    ];
    lojas.forEach((nome) => {
      db.run(`INSERT OR IGNORE INTO lojas (nome) VALUES (?)`, [nome]);
    });

    // Popular tipos de pagamento
    const tiposPagamento = [
      'PIX',
      'Débito',
      'Crédito',
      'Recarga',
      'Saque'
    ];
    tiposPagamento.forEach((nome, index) => {
      db.run(`INSERT OR IGNORE INTO tipos_pagamento (nome, ordem) VALUES (?, ?)`, [nome, index + 1]);
    });

    // Finalizar após todas as operações
    db.run('', err => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao limpar banco' });
      }
      res.json({ message: 'Banco de dados limpo e dados padrão inseridos com sucesso' });
    });
  });
});

module.exports = router;

