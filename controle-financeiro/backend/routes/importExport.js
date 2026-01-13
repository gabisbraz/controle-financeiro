

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../db');
const { 
  formatarData,
  getOrCreateCategoriaSaida,
  getOrCreateTipoPagamento,
  getOrCreateLoja,
  getOrCreateCategoriaEntrada
} = require('../helpers');

const router = express.Router();

// Usar pasta temporária do sistema para uploads (funciona no macOS app)
const tempDir = os.tmpdir();
const uploadDir = path.join(tempDir, 'controle-financeiro-uploads');

// Criar diretório de uploads se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// Preview Excel saidas
router.post('/preview/saidas', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

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
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Erro ao processar arquivo' });
  }
});

// Import Excel saidas
router.post('/import/saidas', async (req, res) => {
  try {
    const rows = req.body;
    let total = 0;
    
    // Processar cada linha e obter/criar os IDs de referência
    for (const row of rows) {
      const categoriaId = await getOrCreateCategoriaSaida(row.categoria);
      const tipoPagamentoId = await getOrCreateTipoPagamento(row.tipo_pagamento);
      const lojaId = await getOrCreateLoja(row.loja);
      
      db.run(
        `INSERT INTO saidas (loja, loja_id, descricao, categoria, categoria_id, data, tipo_pagamento, tipo_pagamento_id, valor) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.loja, lojaId, row.descricao, row.categoria, categoriaId, row.data, row.tipo_pagamento, tipoPagamentoId, row.valor]
      );
      total++;
    }
    
    res.json({ message: 'Importação realizada com sucesso', registros: total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao importar dados' });
  }
});

// Preview Excel entradas
router.post('/preview/entradas', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

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
      descricao: row['Nome'] ?? '-',
      categoria: row['Categoria'] ?? '-',
      data: formatarData(row['Data da entrada']),
      valor: row['Valor'] ?? '-'
    }));

    fs.unlinkSync(req.file.path);
    res.json({ sheets, data: dados });
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Erro ao processar arquivo' });
  }
});

// Import Excel entradas
router.post('/import/entradas', async (req, res) => {
  try {
    const rows = req.body;
    let total = 0;
    
    // Processar cada linha e obter/criar os IDs de referência
    for (const row of rows) {
      const categoriaId = await getOrCreateCategoriaEntrada(row.categoria);
      
      db.run(
        `INSERT INTO entradas (categoria, categoria_id, descricao, valor, data) 
         VALUES (?, ?, ?, ?, ?)`,
        [row.categoria, categoriaId, row.descricao, row.valor, row.data]
      );
      total++;
    }
    
    res.json({ message: 'Importação realizada com sucesso', registros: total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao importar dados' });
  }
});

// Export Excel completo
router.get('/export/excel', (req, res) => {
  db.serialize(() => {
    db.all('SELECT * FROM saidas ORDER BY data DESC', [], (err, saidas) => {
      if (err) return res.status(500).json({ message: 'Erro ao buscar saídas' });

      db.all('SELECT * FROM entradas ORDER BY data DESC', [], (err2, entradas) => {
        if (err2) return res.status(500).json({ message: 'Erro ao buscar entradas' });

        // Formatar saídas com as mesmas colunas do import
        const saidasFormatadas = saidas.map(saida => ({
          'Loja': saida.loja,
          'Descrição': saida.descricao,
          'Categoria': saida.categoria,
          'Data da compra': saida.data,
          'Tipo pagamento': saida.tipo_pagamento,
          'Valor': saida.valor
        }));

        // Formatar entradas com as mesmas colunas do import
        const entradasFormatadas = entradas.map(entrada => ({
          'Nome': entrada.descricao,
          'Categoria': entrada.categoria,
          'Data da entrada': entrada.data,
          'Valor': entrada.valor
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saidasFormatadas), 'Saídas');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entradasFormatadas), 'Entradas');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="controle-financeiro.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
      });
    });
  });
});

module.exports = router;
