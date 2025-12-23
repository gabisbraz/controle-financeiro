const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Rotas
const entradasRoutes = require('./routes/entradas');
const saidasRoutes = require('./routes/saidas');
const importExportRoutes = require('./routes/importExport');
const cartaoRoutes = require('./routes/cartao');
const clearRoutes = require('./routes/clear');

app.use('/tables/entradas', entradasRoutes);
app.use('/tables/saidas', saidasRoutes);
app.use('/', importExportRoutes);
app.use('/cartao', cartaoRoutes);
app.use('/', clearRoutes);

// Root
app.get('/', (req, res) => res.send('API Controle Financeiro rodando 🚀'));

// Start
app.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));
