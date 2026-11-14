const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Koneksi MySQL (Sesuaikan dengan server hosting/VPS Anda)
const db = mysql.createPool({
  host: 'sql12.freesqldatabase.com',
  user: 'sql12840757',
  password: 'cpLc9BDnaC', // Isi password MySQL Anda
  database: 'sql12840757',
  waitForConnections: true,
  connectionLimit: 10
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

// 3. Buat Pesanan Baru (Semua 8 Layanan SIKAYO)
app.post('/api/orders', async (req, res) => {
  const { user_id, layanan, lokasi_jemput, tujuan_atau_detail, total_harga } = req.body;
  try {
    const [users] = await db.query('SELECT saldo FROM users WHERE id = ?', [user_id]);
    if (users[0].saldo < total_harga) {
      return res.status(400).json({ success: false, message: 'Saldo KayoPay tidak mencukupi!' });
    }

    // Potong saldo & tambah XP
    await db.query('UPDATE users SET saldo = saldo - ?, xp = xp + 15 WHERE id = ?', [total_harga, user_id]);
    
    // Simpan pesanan ke MySQL
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
    // Balasan otomatis CS SIKAYO
    await db.query('INSERT INTO chats (user_id, pengirim, pesan, is_user) VALUES (?, "Bantuan SIKAYO 24/7", "Pesan Anda diterima. Tim kami segera memprosesnya.", FALSE)', [user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server SIKAYO API berjalan di port ${PORT}`));
