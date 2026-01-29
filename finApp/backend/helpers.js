const db = require('./db');

function formatarData(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor;
  const data = new Date((valor - 25569) * 86400 * 1000);
  return data.toISOString().split('T')[0];
}

/**
 * Obtém ou cria uma categoria de saída, retornando seu ID
 * @param {string} nome - Nome da categoria
 * @returns {Promise<number>} - ID da categoria
 */
async function getOrCreateCategoriaSaida(nome) {
  if (!nome || nome.trim() === '') return null;
  
  return new Promise((resolve, reject) => {
    // Primeiro, tenta encontrar a categoria existente
    db.get('SELECT id FROM categorias_saidas WHERE nome = ?', [nome.trim()], (err, row) => {
      if (err) {
        console.error('Erro ao buscar categoria de saída:', err);
        return resolve(null);
      }
      
      if (row) {
        return resolve(row.id);
      }
      
      // Se não existir, cria uma nova
      db.run(
        'INSERT INTO categorias_saidas (nome, ordem) VALUES (?, (SELECT COALESCE(MAX(ordem), -1) + 1 FROM categorias_saidas WHERE nome = ?))',
        [nome.trim(), nome.trim()],
        function(err) {
          if (err) {
            console.error('Erro ao criar categoria de saída:', err);
            return resolve(null);
          }
          resolve(this.lastID);
        }
      );
    });
  });
}

/**
 * Obtém ou cria um tipo de pagamento, retornando seu ID
 * @param {string} nome - Nome do tipo de pagamento
 * @returns {Promise<number>} - ID do tipo de pagamento
 */
async function getOrCreateTipoPagamento(nome) {
  if (!nome || nome.trim() === '') return null;
  
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM tipos_pagamento WHERE nome = ?', [nome.trim()], (err, row) => {
      if (err) {
        console.error('Erro ao buscar tipo de pagamento:', err);
        return resolve(null);
      }
      
      if (row) {
        return resolve(row.id);
      }
      
      db.run(
        'INSERT INTO tipos_pagamento (nome, ordem) VALUES (?, (SELECT COALESCE(MAX(ordem), -1) + 1 FROM tipos_pagamento WHERE nome = ?))',
        [nome.trim(), nome.trim()],
        function(err) {
          if (err) {
            console.error('Erro ao criar tipo de pagamento:', err);
            return resolve(null);
          }
          resolve(this.lastID);
        }
      );
    });
  });
}

/**
 * Obtém ou cria uma loja, retornando seu ID
 * @param {string} nome - Nome da loja
 * @returns {Promise<number>} - ID da loja
 */
async function getOrCreateLoja(nome) {
  if (!nome || nome.trim() === '') return null;
  
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM lojas WHERE nome = ?', [nome.trim()], (err, row) => {
      if (err) {
        console.error('Erro ao buscar loja:', err);
        return resolve(null);
      }
      
      if (row) {
        return resolve(row.id);
      }
      
      db.run(
        'INSERT INTO lojas (nome) VALUES (?)',
        [nome.trim()],
        function(err) {
          if (err) {
            console.error('Erro ao criar loja:', err);
            return resolve(null);
          }
          resolve(this.lastID);
        }
      );
    });
  });
}

/**
 * Obtém ou cria uma categoria de entrada, retornando seu ID
 * @param {string} nome - Nome da categoria
 * @returns {Promise<number>} - ID da categoria
 */
async function getOrCreateCategoriaEntrada(nome) {
  if (!nome || nome.trim() === '') return null;
  
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM categorias_entradas WHERE nome = ?', [nome.trim()], (err, row) => {
      if (err) {
        console.error('Erro ao buscar categoria de entrada:', err);
        return resolve(null);
      }
      
      if (row) {
        return resolve(row.id);
      }
      
      db.run(
        'INSERT INTO categorias_entradas (nome, ordem) VALUES (?, (SELECT COALESCE(MAX(ordem), -1) + 1 FROM categorias_entradas WHERE nome = ?))',
        [nome.trim(), nome.trim()],
        function(err) {
          if (err) {
            console.error('Erro ao criar categoria de entrada:', err);
            return resolve(null);
          }
          resolve(this.lastID);
        }
      );
    });
  });
}

module.exports = { 
  formatarData,
  getOrCreateCategoriaSaida,
  getOrCreateTipoPagamento,
  getOrCreateLoja,
  getOrCreateCategoriaEntrada
};
