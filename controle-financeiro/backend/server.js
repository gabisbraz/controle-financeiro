const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ================= UPLOAD =================
const upload = multer({ dest: 'uploads/' });

// ================= DATABASE =================
const db = new sqlite3.Database('./database.db');

// Criar tabelas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT,
      descricao TEXT,
      valor REAL,
      data TEXT
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
      data TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS cartao_fatura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_cartao TEXT NOT NULL,
      dia_vencimento INTEGER NOT NULL
    )
  `);

});

// ================= HELPERS =================
function formatarData(valor) {
  if (!valor) return null;

  // String já formatada
  if (typeof valor === 'string') return valor;

  // Data numérica do Excel
  const data = new Date((valor - 25569) * 86400 * 1000);
  return data.toISOString().split('T')[0];
}

// ================= ENTRADAS =================
app.get('/tables/entradas', (req, res) => {
  db.all('SELECT * FROM entradas ORDER BY data DESC', [], (err, rows) => {
    res.json({ data: rows });
  });
});

app.post('/tables/entradas', (req, res) => {
  const { categoria, descricao, valor, data } = req.body;

  db.run(
    `INSERT INTO entradas (categoria, descricao, valor, data)
     VALUES (?, ?, ?, ?)`,
    [categoria, descricao, valor, data],
    function () {
      res.status(201).json({ id: this.lastID });
    }
  );
});

app.put('/tables/entradas/:id', (req, res) => {
  const { categoria, descricao, valor, data } = req.body;
  const { id } = req.params;

  db.run(
    `
    UPDATE entradas
    SET categoria = ?, descricao = ?, valor = ?, data = ?
    WHERE id = ?
    `,
    [categoria, descricao, valor, data, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Erro ao atualizar entrada' });
      }
      res.json({ message: 'Entrada atualizada com sucesso' });
    }
  );
});

// ================= DELETE ENTRADA =================
app.delete('/tables/entradas/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM entradas WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erro ao excluir entrada' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Entrada não encontrada' });
      }

      res.status(204).send();
    }
  );
});


// ================= SAÍDAS =================
app.get('/tables/saidas', (req, res) => {
  db.all('SELECT * FROM saidas ORDER BY data DESC', [], (err, rows) => {
    res.json({ data: rows });
  });
});

app.post('/tables/saidas', (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data } = req.body;

  db.run(
    `INSERT INTO saidas
     (loja, categoria, descricao, tipo_pagamento, valor, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [loja, categoria, descricao, tipo_pagamento, valor, data],
    function () {
      res.status(201).json({ id: this.lastID });
    }
  );
});

app.put('/tables/saidas/:id', (req, res) => {
  const { loja, categoria, descricao, tipo_pagamento, valor, data } = req.body;
  const { id } = req.params;

  db.run(
    `
    UPDATE saidas
    SET
      loja = ?,
      categoria = ?,
      descricao = ?,
      tipo_pagamento = ?,
      valor = ?,
      data = ?
    WHERE id = ?
    `,
    [loja, categoria, descricao, tipo_pagamento, valor, data, id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erro ao atualizar saída' });
      }

      res.json({ message: 'Saída atualizada com sucesso' });
    }
  );
});

// ================= DELETE ENTRADA =================
app.delete('/tables/saidas/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM saidas WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erro ao excluir entrada' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Entrada não encontrada' });
      }

      res.status(204).send();
    }
  );
});



// ================= IMPORTAÇÃO EXCEL =================
app.post('/import/saidas', (req, res) => {
  const rows = req.body;
  let total = 0;

  const stmt = db.prepare(`
    INSERT INTO saidas
    (loja, descricao, categoria, data, tipo_pagamento, valor)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  rows.forEach(row => {
    stmt.run(
      row.loja,
      row.descricao,
      row.categoria,
      row.data,
      row.tipo_pagamento,
      row.valor
    );
    total++;
  });

  stmt.finalize();

  res.json({
    message: 'Importação realizada com sucesso',
    registros: total
  });
});

// ================= PREVIEW EXCEL (SAÍDAS) =================
app.post('/preview/saidas', upload.single('file'), (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
  const sheets = workbook.SheetNames;

  // Se o front ainda não mandou a sheet escolhida
  if (!req.body.sheet) {
    fs.unlinkSync(req.file.path);

    return res.json({
      sheets: sheets,
      data: []
    });
  }

  const sheetName = req.body.sheet;
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const dados = rows.map(row => ({
    loja: row['Loja'] ?? '-',
    descricao: row['Descrição'] ?? '-',
    categoria: row['Categoria'] ?? '-',
    data: formatarData(row['Data da compra']),
    tipo_pagamento: row['Tipo pagamento'] ?? '-',
    valor: row['Valor'] ?? '-'
  }));

  fs.unlinkSync(req.file.path);

  res.json({
    sheets: sheets,
    data: dados
  });
});

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send('API Controle Financeiro rodando 🚀');
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});


// ⚠️ APAGAR TODO O CONTEÚDO DO BANCO (SAÍDAS E ENTRADAS)
app.delete('/database/clear', (req, res) => {
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


// ================= EXPORTAR EXCEL =================
app.get('/export/excel', (req, res) => {
  db.serialize(() => {
    db.all('SELECT * FROM saidas ORDER BY data DESC', [], (err, saidas) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao buscar saídas' });
      }

      db.all('SELECT * FROM entradas ORDER BY data DESC', [], (err2, entradas) => {
        if (err2) {
          return res.status(500).json({ message: 'Erro ao buscar entradas' });
        }

        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Sheet Saídas
        const wsSaidas = XLSX.utils.json_to_sheet(saidas);
        XLSX.utils.book_append_sheet(wb, wsSaidas, 'Saídas');

        // Sheet Entradas
        const wsEntradas = XLSX.utils.json_to_sheet(entradas);
        XLSX.utils.book_append_sheet(wb, wsEntradas, 'Entradas');

        // Gerar arquivo em memória
        const buffer = XLSX.write(wb, {
          type: 'buffer',
          bookType: 'xlsx'
        });

        res.setHeader(
          'Content-Disposition',
          'attachment; filename="controle-financeiro.xlsx"'
        );
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.send(buffer);
      });
    });
  });
});

// ================= PREVIEW EXCEL (ENTRADAS) =================
app.post('/preview/entradas', upload.single('file'), (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
  const sheets = workbook.SheetNames;

  // Se ainda não escolheu a sheet
  if (!req.body.sheet) {
    fs.unlinkSync(req.file.path);

    return res.json({
      sheets,
      data: []
    });
  }

  const sheetName = req.body.sheet;
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const dados = rows.map(row => ({
    categoria: row['categoria'] ?? '-',
    descricao: row['descricao'] ?? '-',
    valor: row['valor'] ?? '-',
    data: formatarData(row['data'])
  }));

  fs.unlinkSync(req.file.path);

  res.json({
    sheets,
    data: dados
  });
});

// ================= IMPORTAÇÃO EXCEL (ENTRADAS) =================
app.post('/import/entradas', (req, res) => {
  const rows = req.body;
  let total = 0;

  const stmt = db.prepare(`
    INSERT INTO entradas
    (categoria, descricao, valor, data)
    VALUES (?, ?, ?, ?)
  `);

  rows.forEach(row => {
    stmt.run(
      row.categoria,
      row.descricao,
      row.valor,
      row.data
    );
    total++;
  });

  stmt.finalize();

  res.json({
    message: 'Importação realizada com sucesso',
    registros: total
  });
});

// ================= CARTÃO DE CRÉDITO =================

// Buscar vencimento
app.get('/cartao', (req, res) => {
  db.get(`SELECT * FROM cartao_fatura LIMIT 1`, [], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar cartão' });
    }
    res.json(row || null);
  });
});

// Salvar / Atualizar vencimento
app.post('/cartao', (req, res) => {
  const { nome_cartao, dia_vencimento } = req.body;

  db.get(`SELECT id FROM cartao_fatura LIMIT 1`, [], (err, row) => {
    if (row) {
      // Atualiza
      db.run(
        `UPDATE cartao_fatura SET nome_cartao = ?, dia_vencimento = ? WHERE id = ?`,
        [nome_cartao, dia_vencimento, row.id],
        () => res.json({ message: 'Cartão atualizado com sucesso' })
      );
    } else {
      // Insere
      db.run(
        `INSERT INTO cartao_fatura (nome_cartao, dia_vencimento) VALUES (?, ?)`,
        [nome_cartao, dia_vencimento],
        () => res.json({ message: 'Cartão salvo com sucesso' })
      );
    }
  });
});
