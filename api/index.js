const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'viana123';
const JWT_SECRET = process.env.JWT_SECRET || 'sao-joao-viana-gomes-secret-key-2026';

app.use(cors());
app.use(express.json());
// Servir arquivos estáticos a partir da pasta public
app.use(express.static(path.join(__dirname, '../public')));

// Verifica a variável de banco de dados
if (!process.env.DATABASE_URL) {
  console.warn('AVISO: A variável de ambiente DATABASE_URL não está definida.');
}

// Configuração do pool de conexões com o Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))
    ? false
    : { rejectUnauthorized: false }
});

// Inicialização das Tabelas
async function initDb() {
  if (!process.env.DATABASE_URL) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS people (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      is_child BOOLEAN DEFAULT FALSE,
      status VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS food (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price NUMERIC(10,2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'pendente'
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price NUMERIC(10,2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'pendente'
    );
  `);
  console.log('Tabelas no Supabase verificadas/criadas com sucesso.');
}

// Chamar a inicialização de banco (Vercel executa ao carregar a função)
initDb().catch(err => console.error('Erro na inicialização de banco:', err));

// Helper para gerar ID único
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Middleware de Autenticação do Admin
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.admin = decoded;
    next();
  });
}

// --- ROTAS DA API ---

// 1. Login do Administrador
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } else {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
});

// 2. Obter todos os dados (Público)
app.get('/api/data', async (req, res) => {
  try {
    const peopleRes = await pool.query('SELECT * FROM people');
    const foodRes = await pool.query('SELECT * FROM food');
    const expensesRes = await pool.query('SELECT * FROM expenses');

    const formattedPeople = peopleRes.rows.map(p => ({
      id: p.id,
      name: p.name,
      isChild: !!p.is_child,
      status: p.status
    }));

    const formattedFood = foodRes.rows.map(f => ({
      id: f.id,
      name: f.name,
      price: parseFloat(f.price || 0),
      status: f.status
    }));

    const formattedExpenses = expensesRes.rows.map(e => ({
      id: e.id,
      name: e.name,
      price: parseFloat(e.price || 0),
      status: e.status
    }));

    res.json({
      people: formattedPeople,
      food: formattedFood,
      expenses: formattedExpenses
    });
  } catch (err) {
    console.error('Erro ao buscar dados no Postgres:', err);
    res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
  }
});

// 3. Cadastrar pessoa (Público)
app.post('/api/people', async (req, res) => {
  const { name, isChild } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'O nome é obrigatório' });
  }

  try {
    const id = generateId();
    const trimmedName = name.trim();
    const dbIsChild = !!isChild;
    const status = isChild ? null : 'pendente';

    await pool.query(
      'INSERT INTO people (id, name, is_child, status) VALUES ($1, $2, $3, $4)',
      [id, trimmedName, dbIsChild, status]
    );

    res.status(201).json({
      id,
      name: trimmedName,
      isChild: !!isChild,
      status
    });
  } catch (err) {
    console.error('Erro ao cadastrar pessoa no Postgres:', err);
    res.status(500).json({ error: 'Erro ao salvar participante.' });
  }
});

// 4. Alterar status de pagamento de uma pessoa (Admin)
app.put('/api/people/:id/status', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'pendente' && status !== 'confirmado') {
    return res.status(400).json({ error: 'Status inválido. Deve ser pendente ou confirmado.' });
  }

  try {
    const personRes = await pool.query('SELECT * FROM people WHERE id = $1', [id]);
    const person = personRes.rows[0];
    
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    if (person.is_child) {
      return res.status(400).json({ error: 'Crianças são isentas e não possuem status de pagamento' });
    }

    await pool.query('UPDATE people SET status = $1 WHERE id = $2', [status, id]);
    
    res.json({
      id: person.id,
      name: person.name,
      isChild: !!person.is_child,
      status
    });
  } catch (err) {
    console.error('Erro ao alterar status de pessoa no Postgres:', err);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

// 5. Excluir pessoa (Admin)
app.delete('/api/people/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const personRes = await pool.query('SELECT * FROM people WHERE id = $1', [id]);
    const person = personRes.rows[0];
    
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    await pool.query('DELETE FROM people WHERE id = $1', [id]);
    res.json({ success: true, message: `Pessoa ${person.name} removida com sucesso.` });
  } catch (err) {
    console.error('Erro ao deletar pessoa no Postgres:', err);
    res.status(500).json({ error: 'Erro ao remover participante.' });
  }
});

// 6. Cadastrar Comida (Admin)
app.post('/api/food', authenticateAdmin, async (req, res) => {
  const { name, price } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'O nome da comida é obrigatório' });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: 'O preço deve ser um número válido maior ou igual a zero' });
  }

  try {
    const id = generateId();
    const trimmedName = name.trim();
    const status = 'pendente';

    await pool.query(
      'INSERT INTO food (id, name, price, status) VALUES ($1, $2, $3, $4)',
      [id, trimmedName, parsedPrice, status]
    );

    res.status(201).json({
      id,
      name: trimmedName,
      price: parsedPrice,
      status
    });
  } catch (err) {
    console.error('Erro ao cadastrar comida no Postgres:', err);
    res.status(500).json({ error: 'Erro ao salvar comida.' });
  }
});

// 7. Alterar status da comida (Admin)
app.put('/api/food/:id/status', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'pendente' && status !== 'confirmado') {
    return res.status(400).json({ error: 'Status inválido. Deve ser pendente ou confirmado.' });
  }

  try {
    const foodRes = await pool.query('SELECT * FROM food WHERE id = $1', [id]);
    const foodItem = foodRes.rows[0];
    
    if (!foodItem) {
      return res.status(404).json({ error: 'Comida não encontrada' });
    }

    await pool.query('UPDATE food SET status = $1 WHERE id = $2', [status, id]);
    res.json({
      id: foodItem.id,
      name: foodItem.name,
      price: parseFloat(foodItem.price || 0),
      status
    });
  } catch (err) {
    console.error('Erro ao alterar status de comida no Postgres:', err);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

// 8. Excluir comida (Admin)
app.delete('/api/food/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const foodRes = await pool.query('SELECT * FROM food WHERE id = $1', [id]);
    const foodItem = foodRes.rows[0];
    
    if (!foodItem) {
      return res.status(404).json({ error: 'Comida não encontrada' });
    }

    await pool.query('DELETE FROM food WHERE id = $1', [id]);
    res.json({ success: true, message: `Item ${foodItem.name} removido com sucesso.` });
  } catch (err) {
    console.error('Erro ao deletar comida no Postgres:', err);
    res.status(500).json({ error: 'Erro ao remover comida.' });
  }
});

// 9. Cadastrar Despesa (Admin)
app.post('/api/expenses', authenticateAdmin, async (req, res) => {
  const { name, price } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'O nome da despesa é obrigatório' });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: 'O preço deve ser um número válido maior ou igual a zero' });
  }

  try {
    const id = generateId();
    const trimmedName = name.trim();
    const status = 'pendente';

    await pool.query(
      'INSERT INTO expenses (id, name, price, status) VALUES ($1, $2, $3, $4)',
      [id, trimmedName, parsedPrice, status]
    );

    res.status(201).json({
      id,
      name: trimmedName,
      price: parsedPrice,
      status
    });
  } catch (err) {
    console.error('Erro ao cadastrar despesa no Postgres:', err);
    res.status(500).json({ error: 'Erro ao salvar despesa.' });
  }
});

// 10. Alterar status da despesa (Admin)
app.put('/api/expenses/:id/status', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'pendente' && status !== 'confirmado') {
    return res.status(400).json({ error: 'Status inválido. Deve ser pendente ou confirmado.' });
  }

  try {
    const expRes = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    const expenseItem = expRes.rows[0];
    
    if (!expenseItem) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    await pool.query('UPDATE expenses SET status = $1 WHERE id = $2', [status, id]);
    res.json({
      id: expenseItem.id,
      name: expenseItem.name,
      price: parseFloat(expenseItem.price || 0),
      status
    });
  } catch (err) {
    console.error('Erro ao alterar status de despesa no Postgres:', err);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

// 11. Excluir despesa (Admin)
app.delete('/api/expenses/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const expRes = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    const expenseItem = expRes.rows[0];
    
    if (!expenseItem) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ success: true, message: `Despesa ${expenseItem.name} removida com sucesso.` });
  } catch (err) {
    console.error('Erro ao deletar despesa no Postgres:', err);
    res.status(500).json({ error: 'Erro ao remover despesa.' });
  }
});

module.exports = app;
