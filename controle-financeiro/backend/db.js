
const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

// Usar pasta de dados do usuário para o banco de dados
const appDataDir = process.env.HOME || process.env.USERPROFILE;
const dataDir = path.join(appDataDir, 'Library', 'Application Support', 'ControleFinanceiro');

// Criar diretório se não existir
const fs = require('fs');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT,
      categoria_id INTEGER,
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
      loja_id INTEGER,
      categoria TEXT,
      categoria_id INTEGER,
      descricao TEXT,
      tipo_pagamento TEXT,
      tipo_pagamento_id INTEGER,
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

  db.run(`
    CREATE TABLE IF NOT EXISTS categorias_saidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ordem INTEGER DEFAULT 0,
      ativa INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Adicionar colunas de parcelamento e referências se não existirem
  db.run(`ALTER TABLE entradas ADD COLUMN data_input TEXT`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE entradas ADD COLUMN categoria_id INTEGER`, (err) => {
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
  db.run(`ALTER TABLE saidas ADD COLUMN loja_id INTEGER`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE saidas ADD COLUMN categoria_id INTEGER`, (err) => {
    // Ignorar erro se a coluna já existir
  });
  db.run(`ALTER TABLE saidas ADD COLUMN tipo_pagamento_id INTEGER`, (err) => {
    // Ignorar erro se a coluna já existir
  });

  // Tabela de tipos de pagamento
  db.run(`
    CREATE TABLE IF NOT EXISTS tipos_pagamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ordem INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de categorias de entradas
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias_entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ordem INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de lojas
  db.run(`
    CREATE TABLE IF NOT EXISTS lojas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ativa INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

});

module.exports = db;
