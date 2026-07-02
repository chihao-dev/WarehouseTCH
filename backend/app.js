
require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productRoutes = require('./routes/product.routes');
const receiptRoutes = require('./routes/receipt.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const indexRoutes = require('./routes/index.routes');

app.use('/', authRoutes);
app.use('/', usersRoutes);
app.use('/', productRoutes);
app.use('/', receiptRoutes);
app.use('/', warehouseRoutes);
app.use('/', indexRoutes);

// Admin account creation logic
const bcrypt = require('bcryptjs');
const db = require('./config/db');
const createAdminAccount = async () => {
  const adminEmail = 'admin@gmail.com';
  db.query('SELECT * FROM users WHERE email = ?', [adminEmail], async (err, results) => {
    if (results && results.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.query('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)', ['Administrator', adminEmail, hashedPassword, 'admin', 'active']);
    }
  });
};
createAdminAccount();

module.exports = app;
