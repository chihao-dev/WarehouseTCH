const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ExcelJS = require('exceljs');
const ProductService = require('../services/product.service');
const UserProfileService = require('../services/user.service');

exports.post__api_register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ message: 'Email đã tồn tại!' });
        return res.status(500).json({ message: 'Lỗi máy chủ khi thêm người dùng.' });
      }
      res.json({ message: 'Đăng ký thành công!' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
};

exports.post__api_login = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0)
      return res.status(401).json({ message: 'Email không tồn tại' });

    const user = results[0];

    // 🚫 Kiểm tra trạng thái tài khoản
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Tài khoản đã bị ngưng hoạt động, vui lòng liên hệ quản trị viên' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Sai mật khẩu' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    });
  });
};

