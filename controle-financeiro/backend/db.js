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

  db.run(`
    CREATE TABLE IF NOT EXISTS categorias_saidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ordem INTEGER DEFAULT 0,
      ativa INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserir categorias padrão se a tabela estiver vazia
  db.get('SELECT COUNT(*) as count FROM categorias_saidas', (err, row) => {
    if (row.count === 0) {
      const categoriasDefault = [
        'Transporte',
        'Alimentação',
        'Autocuidado',
        'Moradia',
        'Saúde',
        'Educação',
        'Lazer',
        'Vestuário',
        'MG',
        'Outros'
      ];
      const stmt = db.prepare('INSERT INTO categorias_saidas (nome, ordem) VALUES (?, ?)');
      categoriasDefault.forEach((cat, index) => {
        stmt.run(cat, index);
      });
      stmt.finalize();
    }
  });

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

  // Tabela de tipos de pagamento
  db.run(`
    CREATE TABLE IF NOT EXISTS tipos_pagamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ordem INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserir tipos de pagamento padrão se a tabela estiver vazia
  db.get('SELECT COUNT(*) as count FROM tipos_pagamento', (err, row) => {
    if (row.count === 0) {
      const tiposDefault = [
        'Débito',
        'Crédito',
        'Pix',
        'Dinheiro',
        'Transferência'
      ];
      const stmt = db.prepare('INSERT INTO tipos_pagamento (nome, ordem) VALUES (?, ?)');
      tiposDefault.forEach((tipo, index) => {
        stmt.run(tipo, index);
      });
      stmt.finalize();
    }
  });

  // Tabela de categorias de entradas
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias_entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ordem INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserir categorias de entrada padrão se a tabela estiver vazia
  db.get('SELECT COUNT(*) as count FROM categorias_entradas', (err, row) => {
    if (row.count === 0) {
      const categoriasDefault = [
        'Salário',
        '13º Salário',
        'Bônus',
        'Pagamento',
        'Freelance',
        'Investimentos',
        'Outros'
      ];
      const stmt = db.prepare('INSERT INTO categorias_entradas (nome, ordem) VALUES (?, ?)');
      categoriasDefault.forEach((cat, index) => {
        stmt.run(cat, index);
      });
      stmt.finalize();
    }
  });

  // Tabela de lojas
  db.run(`
    CREATE TABLE IF NOT EXISTS lojas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ativa INTEGER DEFAULT 1,
      data_criacao TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserir lojas padrão se a tabela estiver vazia
  db.get('SELECT COUNT(*) as count FROM lojas', (err, row) => {
    if (row.count === 0) {
      const lojasDefault = [
        'Mercado',
        'Restaurante',
        'Posto de Gasolina',
        'Farmácia',
        'Loja de Roupas',
        'Uber',
        'Netflix',
        'Amazon',
        'Outros'
      ];
      const stmt = db.prepare('INSERT INTO lojas (nome) VALUES (?)');
      lojasDefault.forEach((loja) => {
        stmt.run(loja);
      });
      stmt.finalize();
    }
  });
});

module.exports = db;
