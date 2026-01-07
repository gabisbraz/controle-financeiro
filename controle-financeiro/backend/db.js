const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

// Criar tabelas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT,
      descricao TEXT,
      valor REAL,
      data TEXT,
      data_input TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loja TEXT,
      categoria TEXT,
      descricao TEXT,
      tipo_pagamento TEXT,
      valor REAL,
      data TEXT,
      data_input TEXT,
      parcelas INTEGER DEFAULT 1,
      parcela_atual INTEGER DEFAULT 1,
      parcela_id TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cartao_fatura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_cartao TEXT NOT NULL,
      dia_vencimento INTEGER NOT NULL
    )
  `);

  // Adicionar colunas de parcelamento se não existirem
  db.run(`ALTER TABLE entradas ADD COLUMN data_input TEXT`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE saidas ADD COLUMN data_input TEXT`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE saidas ADD COLUMN parcelas INTEGER DEFAULT 1`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE saidas ADD COLUMN parcela_atual INTEGER DEFAULT 1`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE saidas ADD COLUMN parcela_id TEXT`, (err) => {
    // Ignorar erro se a coluna já existir
  });
});

module.exports = db;
