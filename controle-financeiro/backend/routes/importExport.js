const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('../db');
const { formatarData } = require('../helpers');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Preview Excel saidas
router.post('/preview/saidas', upload.single('file'), (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
  const sheets = workbook.SheetNames;

  if (!req.body.sheet) {
    fs.unlinkSync(req.file.path);
    return res.json({ sheets, data: [] });
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
  res.json({ sheets, data: dados });
});

// Import Excel saidas
router.post('/import/saidas', (req, res) => {
  const rows = req.body;
  let total = 0;
  const stmt = db.prepare(`INSERT INTO saidas (loja, descricao, categoria, data, tipo_pagamento, valor) VALUES (?, ?, ?, ?, ?, ?)`);
  rows.forEach(row => {
    stmt.run(row.loja, row.descricao, row.categoria, row.data, row.tipo_pagamento, row.valor);
    total++;
  });
  stmt.finalize();
  res.json({ message: 'Importação realizada com sucesso', registros: total });
});

// Export Excel completo
router.get('/export/excel', (req, res) => {
  db.serialize(() => {
    db.all('SELECT * FROM saidas ORDER BY data DESC', [], (err, saidas) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar saídas' });

      db.all('SELECT * FROM entradas ORDER BY data DESC', [], (err2, entradas) => {
        if (err2) return res.status(500).json({ message: 'Erro ao buscar entradas' });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saidas), 'Saídas');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entradas), 'Entradas');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="controle-financeiro.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
      });
    });
  });
});

module.exports = router;
