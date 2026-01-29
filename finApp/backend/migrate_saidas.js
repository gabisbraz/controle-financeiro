/**
 * Script de migração para popular os IDs de referência na tabela saidas
 * 
 * Este script:
 * 1. Para cada registro na tabela saidas que tem loja_id NULL, busca o ID da loja pelo nome
 * 2. Para cada registro que tem categoria_id NULL, busca o ID da categoria pelo nome
 * 3. Para cada registro que tem tipo_pagamento_id NULL, busca o ID do tipo de pagamento pelo nome
 * 4. Atualiza o registro com os IDs encontrados
 */

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

console.log('=== Início da Migração de Saídas ===\n');

async function migrate() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Buscar todas as saídas que têm IDs nulos
        const saidas = await new Promise((resolve, reject) => {
          db.all('SELECT * FROM saidas', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        console.log(`Encontradas ${saidas.length} saídas para migrar\n`);

        let updatedCount = 0;

        for (const saida of saidas) {
          let needsUpdate = false;
          const updates = {};

          // Migração de loja
          if ((saida.loja_id === null || saida.loja_id === undefined) && saida.loja) {
            const loja = await new Promise((resolve, reject) => {
              db.get('SELECT id FROM lojas WHERE nome = ?', [saida.loja], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });
            
            if (loja) {
              updates.loja_id = loja.id;
              needsUpdate = true;
              console.log(`  [LOJA] ID ${saida.id}: "${saida.loja}" -> ID ${loja.id}`);
            } else {
              console.log(`  [LOJA] ID ${saida.id}: "${saida.loja}" -> NÃO ENCONTRADA (criando...)`);
              // Criar a loja se não existir
              const result = await new Promise((resolve, reject) => {
                db.run('INSERT INTO lojas (nome) VALUES (?)', [saida.loja], function (err) {
                  if (err) reject(err);
                  else resolve(this);
                });
              });
              updates.loja_id = result.lastID;
              needsUpdate = true;
            }
          }

          // Migração de categoria
          if ((saida.categoria_id === null || saida.categoria_id === undefined) && saida.categoria) {
            const categoria = await new Promise((resolve, reject) => {
              db.get('SELECT id FROM categorias_saidas WHERE nome = ?', [saida.categoria], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });
            
            if (categoria) {
              updates.categoria_id = categoria.id;
              needsUpdate = true;
              console.log(`  [CATEGORIA] ID ${saida.id}: "${saida.categoria}" -> ID ${categoria.id}`);
            } else {
              console.log(`  [CATEGORIA] ID ${saida.id}: "${saida.categoria}" -> NÃO ENCONTRADA (criando...)`);
              // Criar a categoria se não existir
              const result = await new Promise((resolve, reject) => {
                db.run('INSERT INTO categorias_saidas (nome) VALUES (?)', [saida.categoria], function (err) {
                  if (err) reject(err);
                  else resolve(this);
                });
              });
              updates.categoria_id = result.lastID;
              needsUpdate = true;
            }
          }

          // Migração de tipo_pagamento
          if ((saida.tipo_pagamento_id === null || saida.tipo_pagamento_id === undefined) && saida.tipo_pagamento) {
            const tipoPagamento = await new Promise((resolve, reject) => {
              db.get('SELECT id FROM tipos_pagamento WHERE nome = ?', [saida.tipo_pagamento], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });
            
            if (tipoPagamento) {
              updates.tipo_pagamento_id = tipoPagamento.id;
              needsUpdate = true;
              console.log(`  [TIPO PGTO] ID ${saida.id}: "${saida.tipo_pagamento}" -> ID ${tipoPagamento.id}`);
            } else {
              console.log(`  [TIPO PGTO] ID ${saida.id}: "${saida.tipo_pagamento}" -> NÃO ENCONTRADO (criando...)`);
              // Criar o tipo de pagamento se não existir
              const result = await new Promise((resolve, reject) => {
                db.run('INSERT INTO tipos_pagamento (nome) VALUES (?)', [saida.tipo_pagamento], function (err) {
                  if (err) reject(err);
                  else resolve(this);
                });
              });
              updates.tipo_pagamento_id = result.lastID;
              needsUpdate = true;
            }
          }

          // Atualizar o registro se houver mudanças
          if (needsUpdate) {
            const setClauses = [];
            const values = [];
            
            if (updates.loja_id !== undefined) {
              setClauses.push('loja_id = ?');
              values.push(updates.loja_id);
            }
            if (updates.categoria_id !== undefined) {
              setClauses.push('categoria_id = ?');
              values.push(updates.categoria_id);
            }
            if (updates.tipo_pagamento_id !== undefined) {
              setClauses.push('tipo_pagamento_id = ?');
              values.push(updates.tipo_pagamento_id);
            }
            
            if (setClauses.length > 0) {
              values.push(saida.id);
              const query = `UPDATE saidas SET ${setClauses.join(', ')} WHERE id = ?`;
              
              await new Promise((resolve, reject) => {
                db.run(query, values, function (err) {
                  if (err) reject(err);
                  else resolve(this);
                });
              });
              
              updatedCount++;
            }
          }
        }

        console.log(`\n=== Migração Concluída ===`);
        console.log(`Total de registros atualizados: ${updatedCount}`);
        console.log(`============================\n`);

        // Mostrar estatísticas finais
        const stats = await new Promise((resolve, reject) => {
          db.all(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN loja_id IS NOT NULL THEN 1 ELSE 0 END) as com_loja,
              SUM(CASE WHEN categoria_id IS NOT NULL THEN 1 ELSE 0 END) as com_categoria,
              SUM(CASE WHEN tipo_pagamento_id IS NOT NULL THEN 1 ELSE 0 END) as com_tipo_pgto
            FROM saidas
          `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows[0]);
          });
        });

        console.log('Estatísticas finais:');
        console.log(`  Total de saídas: ${stats.total}`);
        console.log(`  Com loja_id: ${stats.com_loja}`);
        console.log(`  Com categoria_id: ${stats.com_categoria}`);
        console.log(`  Com tipo_pagamento_id: ${stats.com_tipo_pgto}`);

        resolve();
      } catch (err) {
        console.error('Erro durante a migração:', err);
        reject(err);
      }
    });
  });
}

// Executar a migração
migrate()
  .then(() => {
    console.log('\nMigração executada com sucesso!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nErro na migração:', err);
    process.exit(1);
  });

