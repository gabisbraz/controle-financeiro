const express = require('express');
const db = require('../db');
const router = express.Router();

// GET todas as tabelas do banco de dados
router.get('/tables', (req, res) => {
  db.all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao listar tabelas' });
      res.json({ data: rows });
    }
  );
});

// GET dados de uma tabela específica
router.get('/tables/:tableName', (req, res) => {
  const { tableName } = req.params;
  const { limit, offset, orderBy, order, search, searchField } = req.query;

  // Validar nome da tabela para evitar SQL injection
  const validTables = ['entradas', 'saidas', 'cartao_fatura', 'categorias_saidas', 'tipos_pagamento', 'categorias_entradas', 'lojas'];
  
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ message: 'Tabela inválida' });
  }

  // Obter informações da tabela (colunas)
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) return res.status(500).json({ message: 'Erro ao obter informações da tabela' });

    // Caso especial para a tabela saidas - usar JOINs para obter nomes das referências
    if (tableName === 'saidas') {
      const query = `
        SELECT 
          s.id,
          s.loja_id,
          l.nome as loja,
          s.categoria_id,
          cs.nome as categoria,
          s.tipo_pagamento_id,
          tp.nome as tipo_pagamento,
          s.descricao,
          s.valor,
          s.data,
          s.data_input,
          s.parcelas,
          s.parcela_atual,
          s.parcela_id
        FROM saidas s
        LEFT JOIN lojas l ON s.loja_id = l.id
        LEFT JOIN categorias_saidas cs ON s.categoria_id = cs.id
        LEFT JOIN tipos_pagamento tp ON s.tipo_pagamento_id = tp.id
        ORDER BY s.data DESC
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar dados', error: err.message });

        // Definir as colunas que devem ser exibidas
        const saidasColumns = [
          { name: 'id', type: 'INTEGER' },
          { name: 'loja_id', type: 'INTEGER' },
          { name: 'loja', type: 'TEXT' },
          { name: 'categoria_id', type: 'INTEGER' },
          { name: 'categoria', type: 'TEXT' },
          { name: 'tipo_pagamento_id', type: 'INTEGER' },
          { name: 'tipo_pagamento', type: 'TEXT' },
          { name: 'descricao', type: 'TEXT' },
          { name: 'valor', type: 'REAL' },
          { name: 'data', type: 'TEXT' },
          { name: 'data_input', type: 'TEXT' },
          { name: 'parcelas', type: 'INTEGER' },
          { name: 'parcela_atual', type: 'INTEGER' },
          { name: 'parcela_id', type: 'TEXT' }
        ];

        res.json({
          data: rows,
          columns: saidasColumns,
          total: rows.length,
          tableName
        });
      });
      return;
    }

    // Construir query base para outras tabelas
    let query = `SELECT * FROM ${tableName}`;
    const params = [];

    // Adicionar busca se informada
    if (search && searchField && columns.find(c => c.name === searchField)) {
      query += ` WHERE ${searchField} LIKE ?`;
      params.push(`%${search}%`);
    }

    // Adicionar ordenação
    const orderColumn = orderBy && columns.find(c => c.name === orderBy) ? orderBy : 'id';
    const orderDir = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${orderColumn} ${orderDir}`;

    // Adicionar limit e offset
    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
      if (offset) {
        query += ` OFFSET ?`;
        params.push(parseInt(offset));
      }
    }

    // Executar query
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar dados', error: err.message });

      // Contar total de registros
      let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
      if (search && searchField && columns.find(c => c.name === searchField)) {
        countQuery += ` WHERE ${searchField} LIKE ?`;
      }
      
      db.get(countQuery, search && searchField ? [`%${search}%`] : [], (err, countResult) => {
        if (err) return res.status(500).json({ message: 'Erro ao contar registros' });
        
        res.json({
          data: rows,
          columns: columns,
          total: countResult?.total || rows.length,
          tableName
        });
      });
    });
  });
});

// GET contar registros de uma tabela
router.get('/tables/:tableName/count', (req, res) => {
  const { tableName } = req.params;

  const validTables = ['entradas', 'saidas', 'cartao_fatura', 'categorias_saidas', 'tipos_pagamento', 'categorias_entradas', 'lojas'];
  
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ message: 'Tabela inválida' });
  }

  db.get(`SELECT COUNT(*) as total FROM ${tableName}`, (err, row) => {
    if (err) return res.status(500).json({ message: 'Erro ao contar registros' });
    res.json({ total: row?.total || 0 });
  });
});

// DELETE registro de uma tabela
router.delete('/tables/:tableName/:id', (req, res) => {
  const { tableName, id } = req.params;

  const validTables = ['entradas', 'saidas', 'categorias_saidas', 'tipos_pagamento', 'categorias_entradas', 'lojas'];
  
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ message: 'Tabela inválida' });
  }

  db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ message: 'Erro ao excluir registro' });
    if (this.changes === 0) return res.status(404).json({ message: 'Registro não encontrado' });
    res.status(204).send();
  });
});

module.exports = router;

