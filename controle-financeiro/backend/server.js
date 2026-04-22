const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'controle_financeiro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Validation middleware
const validateExpense = [
  body('data').isISO8601().toDate().isLength({ min: 1 }),
  body('loja').isLength({ min: 1, max: 255 }).trim().escape(),
  body('descricao').isLength({ min: 1 }).trim().escape(),
  body('categoria').isLength({ min: 1, max: 100 }).trim().escape(),
  body('preco').isFloat({ min: 0 }),
  body('pagamento').isLength({ min: 1, max: 100 }).trim().escape()
];

// Routes
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.promise().execute('SELECT * FROM expenses ORDER BY data DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/expenses/:id', async (req, res) => {
  try {
    const [rows] = await pool.promise().execute('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', validateExpense, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { data, loja, descricao, categoria, preco, pagamento } = req.body;
    const [result] = await pool.promise().execute(
      'INSERT INTO expenses (data, loja, descricao, categoria, preco, pagamento) VALUES (?, ?, ?, ?, ?, ?)',
      [data, loja, descricao, categoria, preco, pagamento]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', validateExpense, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { data, loja, descricao, categoria, preco, pagamento } = req.body;
    const [result] = await pool.promise().execute(
      'UPDATE expenses SET data = ?, loja = ?, descricao = ?, categoria = ?, preco = ?, pagamento = ? WHERE id = ?',
      [data, loja, descricao, categoria, preco, pagamento, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const [result] = await pool.promise().execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
