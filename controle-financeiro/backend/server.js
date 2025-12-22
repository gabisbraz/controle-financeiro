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
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não enviado' });
  }

  const workbook = XLSX.readFile(req.file.path);

  // 👉 Sheet específica
  const sheetName = 'SAÍDAS';

  if (!workbook.SheetNames.includes(sheetName)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: `A planilha "${sheetName}" não foi encontrada`
    });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const preview = rows.map(row => ({
    loja: row['Loja'],
    descricao: row['Descrição'],
    categoria: row['Categoria'],
    data: formatarData(row['Data da compra']),
    tipo_pagamento: row['Tipo pagamento'],
    valor: row['Valor']
  }));

  fs.unlinkSync(req.file.path);

  res.json({ data: preview });
});

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send('API Controle Financeiro rodando 🚀');
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
