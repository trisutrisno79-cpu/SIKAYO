const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// GANTI DENGAN DATA DARI EMAIL FREESQLDATABASE.COM ANDA
const db = mysql.createPool({
  host: 'sql12.freesqldatabase.com',     // Sesuaikan server host (misal sql12.freesqldatabase.com)
  user: 'sql12840757',                   // Sesuaikan Username
  password: 'cpLc9BDnaC',     // Sesuaikan Password
  database: 'sql12840757',               // Sesuaikan Database Name
  port: 3306,
  waitForConnections: true,
  connectionLimit: 5,                    // Batas maksimal koneksi gratis adalah 5
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Endpoint cek status koneksi database
app.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'OK', message: 'Backend SIKAYO terhubung ke FreeSQLDatabase!' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// 1. Ambil Data Profil & Saldo KayoPay
app.get('/api/user/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Top Up Saldo KayoPay
app.post('/api/topup', async (req, res) => {
  const { user_id, nominal } = req.body;
  try {
    await db.query('UPDATE users SET saldo = saldo + ? WHERE id = ?', [nominal, user_id]);
    const [rows] = await db.query('SELECT saldo FROM users WHERE id = ?', [user_id]);
    res.json({ success: true, saldo: rows[0].saldo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Buat Pesanan Baru
app.post('/api/orders', async (req, res) => {
  const { user_id, layanan, lokasi_jemput, tujuan_atau_detail, total_harga } = req.body;
  try {
    const [users] = await db.query('SELECT saldo FROM users WHERE id = ?', [user_id]);
    if (!users.length || users[0].saldo < total_harga) {
      return res.status(400).json({ success: false, message: 'Saldo KayoPay tidak mencukupi!' });
    }

    await db.query('UPDATE users SET saldo = saldo - ?, xp = xp + 15 WHERE id = ?', [total_harga, user_id]);
    await db.query(
      'INSERT INTO orders (user_id, layanan, lokasi_jemput, tujuan_atau_detail, total_harga) VALUES (?, ?, ?, ?, ?)',
      [user_id, layanan, lokasi_jemput, tujuan_atau_detail, total_harga]
    );

    const [updatedUser] = await db.query('SELECT saldo, xp FROM users WHERE id = ?', [user_id]);
    res.json({ success: true, saldo: updatedUser[0].saldo, xp: updatedUser[0].xp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Ambil Riwayat Pesanan
app.get('/api/orders/:user_id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.params.user_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Ambil Daftar Promo
app.get('/api/promos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM promos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Ambil & Kirim Chat
app.get('/api/chats/:user_id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM chats WHERE user_id = ? ORDER BY id ASC', [req.params.user_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', async (req, res) => {
  const { user_id, pesan } = req.body;
  try {
    await db.query('INSERT INTO chats (user_id, pengirim, pesan, is_user) VALUES (?, "Anda", ?, TRUE)', [user_id, pesan]);
    await db.query('INSERT INTO chats (user_id, pengirim, pesan, is_user) VALUES (?, "Bantuan SIKAYO 24/7", "Pesan Anda diterima. Tim kami segera memprosesnya.", FALSE)', [user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server SIKAYO berjalan di port ${PORT}`));
