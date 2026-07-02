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

exports.get__api_users = (req, res) => {
  const sql = `
    SELECT id, name, email, role, status, created_at
    FROM users
    ORDER BY id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi máy chủ' });
    res.json(results);
  });
};

exports.post__api_users = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: 'Thiếu thông tin' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [name, email, hashedPassword, role, 'active'],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ message: 'Email đã tồn tại!' });
          return res.status(500).json({ message: 'Lỗi khi thêm tài khoản.' });
        }

        const newUser = {
          id: result.insertId,
          name,
          email,
          role,
          status: 'active'
        };

        res.status(201).json({
          message: 'Tạo tài khoản thành công!',
          user: newUser
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
};

exports.delete__api_users_id = (req, res) => {
  const userIdToDelete = parseInt(req.params.id);
  const currentUserId = parseInt(req.query.currentUserId); // Lấy từ query params

  if (isNaN(userIdToDelete) || isNaN(currentUserId)) {
    return res.status(400).json({ message: 'ID không hợp lệ' });
  }

  if (userIdToDelete === currentUserId) {
    return res.status(403).json({ message: 'Không thể xoá tài khoản đang đăng nhập' });
  }

  const sql = 'DELETE FROM users WHERE id = ?';
  db.query(sql, [userIdToDelete], (err, result) => {
    if (err) {
      console.error('❌ Lỗi SQL:', err);

      // 🛑 Trường hợp khóa ngoại → tài khoản đang được dùng
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          message: '⚠️ Tài khoản đang hoạt động hoặc có dữ liệu liên quan, không thể xóa!'
        });
      }

      return res.status(500).json({ message: 'Lỗi khi xóa tài khoản' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    res.json({ message: '✅ Đã xóa thành công' });
  });
};

exports.get__api_users_id = (req, res) => {
  const userId = req.params.id;

  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Lỗi khi lấy người dùng:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json(results[0]);
  });
};

exports.put__api_users_id_status = (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }

  db.query('UPDATE users SET status = ? WHERE id = ?', [status, userId], (err, result) => {
    if (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
      return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
    res.json({ message: 'Cập nhật trạng thái thành công' });
  });
};

exports.get__api_user_info_id = (req, res) => {
  const sql = 'SELECT * FROM user_info WHERE user_id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn' });
    if (results.length === 0) return res.json(null);
    res.json(results[0]);
  });
};

exports.post__api_user_info = async (req, res) => {
  const { user_id, full_name, date_of_birth, gender, address, phone } = req.body;
  const image_url = req.file ? `http://localhost:3000/uploads/${req.file.filename}` : null;

  try {
    await UserProfileService.updateUserInfoWithSync({
      user_id, full_name, date_of_birth, gender, address, phone, image_url
    }, db);
    res.json({ message: '✅ Lưu thông tin thành công' });
  } catch (err) {
    console.error('Lỗi SQL:', err);
    res.status(500).json({ message: 'Lỗi khi lưu thông tin' });
  }
};

