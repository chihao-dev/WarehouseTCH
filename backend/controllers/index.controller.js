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

exports.get_ = (req, res) => {
  res.json({
    message: 'WarehouseTCH API is running 🚀',
    status: 'OK'
  });
};

exports.post__api_upload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file nào được tải lên.' });
  }

  // Trả về URL đầy đủ với domain backend (localhost:3000)
  const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  res.json({ imageUrl });
};

exports.get__api_kiem_ke_lich_su = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(`
      SELECT 
        b.id,
        b.batch_code,
        b.batch_name,
        b.created_at,
        b.status,
        COUNT(DISTINCT i.product_detail_id) AS so_san_pham,
        COALESCE(SUM(i.actual_quantity), 0) AS tong_so_luong
      FROM inventory_audit_batches b
      LEFT JOIN inventory_audit_items i ON b.id = i.audit_batch_id
      LEFT JOIN product_details pd ON i.product_detail_id = pd.id
      GROUP BY b.id, b.batch_code, b.batch_name, b.created_at, b.status
      ORDER BY b.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Lỗi lấy lịch sử kiểm kê:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.post__api_ai_summary = async (req, res) => {
  const data = req.body;

  try {
    const prompt = `
    Đây là dữ liệu thống kê kho hàng:\n${JSON.stringify(data, null, 2)}\n
    Hãy viết một đoạn tóm tắt dài hơn khoảng 100 chữ, chi tiết, rõ ràng và dễ hiểu, nêu bật các điểm quan trọng, xu hướng và cảnh báo nếu có.
    Sử dụng ngôn ngữ trang trọng, chuyên nghiệp và mạch lạc.
    `;

    const response = await axios.post(GEMINI_API_URL, {
      "contents": [
        {
          "parts": [
            {
              "text": prompt
            }
          ]
        }
      ]
    });

    const summary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể tạo tóm tắt.';

    res.json({ summary });

  } catch (error) {
    console.error('Lỗi khi gọi AI Gemini:', error.response?.data || error.message);
    res.status(500).json({ error: 'Lỗi khi gọi AI Gemini' });
  }
};

