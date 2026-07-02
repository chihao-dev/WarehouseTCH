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

exports.get__api_khu_vuc = (req, res) => {
  db.query('SELECT * FROM warehouse_areas ORDER BY id ASC', (err, rows) => {
    if (err) {
      console.error('Lỗi khi lấy khu vực:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }
    res.json(rows);
  });
};

exports.get__api_khu_vuc = (req, res) => {
  const sql = 'SELECT id, area_name FROM warehouse_areas ORDER BY id ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn khu vực' });
    res.json(results);
  });
};

exports.get__api_log_tru_hang_productCode = async (req, res) => {
  const code = req.params.productCode;

  try {
    const [rows] = await db.promise().query(
      `SELECT 
         lth.pallet_name, 
         lth.quantity_deducted, 
         lth.timestamp, 
         kv.area_name,
         kv.description,
         px.receipt_code
       FROM inventory_deduction_logs lth
       LEFT JOIN product_details pd 
         ON pd.product_code = lth.product_code 
         AND pd.location = SUBSTRING_INDEX(lth.pallet_name, '__', -1)
       LEFT JOIN warehouse_areas kv ON kv.id = pd.warehouse_area_id
       LEFT JOIN goods_issue_receipts px ON px.id = lth.goods_issue_receipt_id
       WHERE lth.product_code = ?
       ORDER BY lth.timestamp DESC`,
      [code]
    );

    const data = rows.map(row => ({
      // 👉 chỉ lấy phần sau dấu `__`
      pallet_name: row.pallet_name.includes('__')
        ? row.pallet_name.split('__')[1]
        : row.pallet_name,

      quantity_deducted: row.quantity_deducted,
      timestamp: row.timestamp,
      area_name: row.area_name || 'Không rõ',
      khu_vuc_mo_ta: row.description || 'Không rõ',
      receipt_code: row.receipt_code || 'Chưa có mã'
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Lỗi khi lấy log trừ hàng' });
  }
};

exports.get__api_khu_vuc = (req, res) => {
  db.query('SELECT id, area_name FROM warehouse_areas', (err, result) => {
    if (err) return res.status(500).json({ error: 'Lỗi server' });
    res.json(result);
  });
};

exports.get__api_suppliers_by_product_product_code = (req, res) => {
  const code = req.params.product_code;
  const khuVucId = req.query.warehouse_area_id;

  let sql = `
    SELECT 
      goods_receipts.supplier_name, 
      goods_receipts.logo_url, 
      goods_receipts.representative_name, 
      goods_receipts.representative_email, 
      goods_receipts.representative_phone,
      product_details.product_name,
      product_details.product_code
    FROM product_details
    LEFT JOIN goods_receipts 
      ON product_details.receipt_code = goods_receipts.receipt_code
    WHERE product_details.product_code = ?
  `;
  const params = [code];

  if (khuVucId) {
    sql += ' AND product_details.warehouse_area_id = ?';
    params.push(khuVucId);
  }

  sql += ' ORDER BY product_details.id DESC LIMIT 1';

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn by-product:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (result.length === 0) {
      return res.json({ exists: false });
    }

    res.json({ exists: true, supplier: result[0] });
  });
};

exports.get__api_suppliers_by_khu_vuc_khuvuc_id = (req, res) => {
  const khuVucId = req.params.khuvuc_id;

  const sql = `
    SELECT 
      pnk.supplier_name,
      pnk.logo_url,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone,
      MAX(pd.import_date) AS newest_import
    FROM product_details pd
    JOIN goods_receipts pnk ON pd.receipt_code = pnk.receipt_code
    WHERE pd.warehouse_area_id = ?
      AND pnk.supplier_name IS NOT NULL
    GROUP BY 
      pnk.supplier_name,
      pnk.logo_url,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone
    ORDER BY newest_import DESC
  `;

  db.query(sql, [khuVucId], (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn khu vực:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(result);
  });
};

exports.get__api_suppliers_recent = (req, res) => {
  const sql = `
    SELECT 
      goods_receipts.supplier_name,
      goods_receipts.logo_url,
      goods_receipts.representative_name,
      goods_receipts.representative_email,
      goods_receipts.representative_phone,
      MAX(product_details.import_date) AS newest_import
    FROM product_details
    JOIN goods_receipts 
      ON product_details.receipt_code = goods_receipts.receipt_code
    GROUP BY 
      goods_receipts.supplier_name, 
      goods_receipts.logo_url, 
      goods_receipts.representative_name, 
      goods_receipts.representative_email, 
      goods_receipts.representative_phone
    ORDER BY newest_import DESC
    LIMIT 10
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn recent suppliers:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(result);
  });
};

exports.get__api_suppliers_detail_by_name_supplier_name = (req, res) => {
  const name = req.params.supplier_name;

  const sql = `
    SELECT 
      pnk.logo_url,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone,
      pd.product_code,
      pd.product_name,
      pd.image_url,               -- ✅ thêm dòng này để lấy ảnh sản phẩm
      pd.import_date
    FROM product_details pd
    JOIN goods_receipts pnk ON pd.receipt_code = pnk.receipt_code
    WHERE pnk.supplier_name = ?
    ORDER BY pd.import_date ASC
  `;

  db.query(sql, [name], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn chi tiết NCC:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (rows.length === 0) return res.json({ exists: false });

    const grouped = new Map();

    for (const row of rows) {
      const key = `${row.logo_url}_${row.import_date}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          logo_url: row.logo_url,
          import_date: row.import_date,
          dai_dien: [],
          san_pham: [],
          rep_set: new Set(),
          sp_set: new Set()
        });
      }

      const g = grouped.get(key);
      const repKey = `${row.representative_email}_${row.representative_phone}`;
      if (!g.rep_set.has(repKey)) {
        g.rep_set.add(repKey);
        g.dai_dien.push({
          name: row.representative_name,
          email: row.representative_email,
          phone: row.representative_phone
        });
      }

      const spKey = row.product_code;
      if (!g.sp_set.has(spKey)) {
        g.sp_set.add(spKey);
        g.san_pham.push({
          code: row.product_code,
          name: row.product_name,
          image_url: row.image_url  // ✅ thêm dòng này để trả ảnh về frontend
        });
      }
    }

    const danhSachNhap = Array.from(grouped.values()).map(g => ({
      logo_url: g.logo_url,
      import_date: g.import_date,
      dai_dien: g.dai_dien,
      san_pham: g.san_pham
    }));

    res.json({
      exists: true,
      supplier_name: name,
      lich_su_nhap: danhSachNhap
    });
  });
};

exports.get__api_suppliers_by_product_name_product_name = (req, res) => {
  const name = decodeURIComponent(req.params.product_name);
  const khuVucId = req.query.warehouse_area_id;

  let sql = `
    SELECT DISTINCT 
      pnk.supplier_name,
      pnk.logo_url
    FROM product_details pd
    LEFT JOIN goods_receipts pnk ON pd.receipt_code = pnk.receipt_code
    WHERE pd.product_name LIKE ?
  `;
  const params = [`%${name}%`];

  if (khuVucId) {
    sql += ` AND pd.warehouse_area_id = ?`;
    params.push(khuVucId);
  }

  sql += ` ORDER BY pd.id DESC`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn by-product-name:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    res.json(result); // Trả về danh sách logo NCC
  });
};

exports.post__api_kiem_ke_create = (req, res) => {
  const { email, sanPhamIds } = req.body;

  if (!Array.isArray(sanPhamIds)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  }

  // ✅ Nếu gửi mảng rỗng → huỷ toàn bộ kiểm kê
  if (sanPhamIds.length === 0) {
    db.query('UPDATE product_details SET is_checking = 0', (err) => {
      if (err) {
        console.error('❌ Lỗi huỷ kiểm kê:', err);
        return res.status(500).json({ success: false, message: 'Lỗi huỷ kiểm kê' });
      }
      return res.json({ success: true, message: 'Đã huỷ toàn bộ kiểm kê.' });
    });
    return;
  }

  // ✅ Nếu có danh sách → tạo đợt kiểm kê
  db.query('INSERT INTO inventory_audit_batches (created_by_email) VALUES (?)', [email], (err, result) => {
    if (err) {
      console.error('❌ Lỗi tạo đợt kiểm kê:', err);
      return res.status(500).json({ success: false });
    }

    const dotId = result.insertId;
    const values = sanPhamIds.map(id => [dotId, id]);

    db.query('INSERT INTO inventory_audit_items (audit_batch_id, product_detail_id) VALUES ?', [values], (err2) => {
      if (err2) {
        console.error('❌ Lỗi tạo chi tiết kiểm kê:', err2);
        return res.status(500).json({ success: false });
      }

      const placeholders = sanPhamIds.map(() => '?').join(',');
      const updateSql = `UPDATE product_details SET is_checking = 1 WHERE id IN (${placeholders})`;

      db.query(updateSql, sanPhamIds, (err3) => {
        if (err3) {
          console.error('❌ Lỗi cập nhật is_checking:', err3);
          return res.status(500).json({ success: false });
        }

        res.json({ success: true, dotId });
      });
    });
  });
};

exports.get__api_kiem_ke_dot_dotId = (req, res) => {
  const { dotId } = req.params;

  const sql = `
    SELECT 
    sp.product_code,
    MIN(sp.product_name) AS product_name,
    SUM(sp.quantity) AS total_quantity,
    MIN(sp.image_url) AS image_url,
    GROUP_CONCAT(DISTINCT kv.area_name SEPARATOR ', ') AS area_name,
    MIN(kkct.actual_quantity) AS actual_quantity,
    MIN(kkct.note) AS note,
    MIN(kkct.checked_by_email) AS checked_by_email, -- thêm dòng này
    GROUP_CONCAT(kkct.product_detail_id) AS product_detail_ids
  FROM inventory_audit_items kkct
  JOIN product_details sp ON kkct.product_detail_id = sp.id
  JOIN warehouse_areas kv ON sp.warehouse_area_id = kv.id
  WHERE kkct.audit_batch_id = ?
    AND sp.is_checking = 1
  GROUP BY sp.product_code
  `;

  db.query(sql, [dotId], async (err, rows) => {
    if (err) {
      console.error('❌ Lỗi lấy danh sách kiểm kê:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    try {
      for (const row of rows) {
        // 🔍 Lấy toàn bộ các pallet chứa mã sản phẩm
        const [pallets] = await db.promise().query(`
          SELECT location, quantity
          FROM product_details
          WHERE product_code = ?
        `, [row.product_code]);

        // Gán vào object
        row.pallets = pallets;

        // ✅ Tính tổng lại từ tất cả các pallet
        row.total_quantity = pallets.reduce((sum, p) => sum + (p.quantity || 0), 0);
      }

      res.json(rows);
    } catch (e) {
      console.error('❌ Lỗi khi xử lý pallets:', e);
      res.status(500).json({ error: 'Lỗi khi xử lý dữ liệu pallet' });
    }
  });
};

exports.post__api_kiem_ke_unmark = async (req, res) => {
  const { productIds } = req.body;
  try {
    await db.query('UPDATE product_details SET is_checking = 0 WHERE id IN (?)', [productIds]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server khi unmark sản phẩm.' });
  }
};

exports.post__api_kiem_ke_submit = (req, res) => {
  const { audit_batch_id, email, data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }

  let completed = 0;
  let hasError = false;

  if (data.length === 0) return res.json({ success: true });

  data.forEach(item => {
    const sql = `
      UPDATE inventory_audit_items
      SET actual_quantity = ?, note = ?, checked_by_email = ?, checked_at = NOW()
      WHERE audit_batch_id = ? AND product_detail_id = ?
    `;
    const params = [item.actual_quantity, item.note, email, audit_batch_id, item.product_detail_id];

    db.query(sql, params, (err) => {
      if (err && !hasError) {
        hasError = true;
        console.error('❌ Lỗi cập nhật kiểm kê:', err);
        return res.status(500).json({ error: 'Lỗi server' });
      }

      completed++;
      if (completed === data.length && !hasError) {
        res.json({ success: true });
      }
    });
  });
};

exports.post__api_kiem_ke_tao_dot = (req, res) => {
  const { batch_name, created_by_email } = req.body;
  if (!batch_name || !created_by_email) {
    return res.status(400).json({ success: false, message: 'Thiếu tên đợt hoặc email.' });
  }

  const today = new Date();
  const dateForCode = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;

  const findSql = `
    SELECT batch_code FROM inventory_audit_batches 
    WHERE DATE(created_at) = CURDATE()
    ORDER BY id DESC LIMIT 1
  `;

  db.query(findSql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error.' });

    let next = 1;
    if (rows.length > 0) {
      const current = rows[0].batch_code;
      const numberPart = parseInt(current.split('_')[0].replace('KK', ''));
      if (!isNaN(numberPart)) next = numberPart + 1;
    }

    const batch_code = `KK${String(next).padStart(3, '0')}_${dateForCode}`;
    const insertSql = `
      INSERT INTO inventory_audit_batches (batch_code, batch_name, created_by_email)
      VALUES (?, ?, ?)
    `;

    db.query(insertSql, [batch_code, batch_name, created_by_email], (err2, insertResult) => {
      if (err2) return res.status(500).json({ success: false, message: 'Không thể tạo đợt.' });

      db.query(`SELECT * FROM inventory_audit_batches WHERE id = ?`, [insertResult.insertId], (err3, rows2) => {
        if (err3 || !rows2.length) return res.status(500).json({ success: false, message: 'Lỗi sau khi tạo đợt.' });

        const dot = rows2[0];
        res.json({
          success: true,
          dotId: dot.id,
          batch_code: dot.batch_code,
          batch_name: dot.batch_name,
          created_at: dot.created_at
        });
      });
    });
  });
};

exports.post__api_kiem_ke_gan_san_pham_vao_dot = (req, res) => {
  const { audit_batch_id, product_detail_ids = [], product_codes = [] } = req.body;

  if (!audit_batch_id || (!Array.isArray(product_detail_ids) && !Array.isArray(product_codes))) {
    return res.status(400).json({ success: false, message: 'Thiếu audit_batch_id hoặc danh sách sản phẩm.' });
  }

  // Hàm thực hiện insert
  const insertChiTiet = (ids) => {
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có sản phẩm nào để gán.' });
    }

    const values = ids.map(id => [audit_batch_id, id]);
    const sql = `INSERT INTO inventory_audit_items (audit_batch_id, product_detail_id)
                 VALUES ? ON DUPLICATE KEY UPDATE audit_batch_id = VALUES(audit_batch_id)`;

    db.query(sql, [values], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi khi gán sản phẩm.' });
      res.json({
        success: true,
        message: `✅ Đã gán thành công ${ids.length} pallet vào đợt kiểm kê.`,
        total_gan: ids.length
      });
    });
  };

  // Trường hợp gán theo ID trực tiếp
  if (product_detail_ids.length > 0) {
    insertChiTiet(product_detail_ids);
  }
  // Trường hợp gán theo mã sản phẩm → lấy toàn bộ pallet có product_code tương ứng
  else if (product_codes.length > 0) {
    const placeholders = product_codes.map(() => '?').join(',');
    const sqlGet = `SELECT id FROM product_details WHERE product_code IN (${placeholders})`;

    db.query(sqlGet, product_codes, (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi truy vấn sản phẩm.' });
      const ids = rows.map(r => r.id);
      insertChiTiet(ids);
    });
  } else {
    res.status(400).json({ success: false, message: 'Không có dữ liệu hợp lệ để xử lý.' });
  }
};

exports.get__api_kiem_ke_dot_dotId_san_pham = (req, res) => {
  const { dotId } = req.params;

  const sql = `
    SELECT 
      pd.product_code,
      MAX(pd.product_name) AS product_name,
      MAX(pd.image_url) AS image_url,
      MAX(kv.area_name) AS area_name,
      SUM(pd.quantity) AS system_quantity,
      SUM(IFNULL(kkct.actual_quantity, 0)) AS actual_quantity,
      GROUP_CONCAT(kkct.checked_by_email SEPARATOR ', ') AS checked_by_email_list,
      GROUP_CONCAT(kkct.note SEPARATOR '; ') AS note,
      GROUP_CONCAT(kkct.id) AS kiem_ke_chi_tiet_ids,
      MAX(pd.unit_price) AS unit_price
    FROM inventory_audit_items kkct
    JOIN product_details pd ON kkct.product_detail_id = pd.id
    JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
    WHERE kkct.audit_batch_id = ?
    GROUP BY pd.product_code
    ORDER BY pd.product_code DESC
  `;

  db.query(sql, [dotId], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi lấy sản phẩm kiểm kê:', err);
      return res.status(500).json({ success: false, message: 'Lỗi truy vấn' });
    }

    const formatted = rows.map(row => ({
      ...row,
      checked_by_email: row.checked_by_email_list?.split(',')[0] || null,
      actual_quantity: Number(row.actual_quantity) || null,
      system_quantity: Number(row.system_quantity) || 0,
      kiem_ke_chi_tiet_id: (row.kiem_ke_chi_tiet_ids || '').split(',')[0] || null, // để cập nhật một dòng
      note: row.note?.split('; ')[0] || '' // ✅ thêm dòng này
    }));

    res.json({ success: true, data: formatted });
  });
};

exports.post__api_kiem_ke_cap_nhat_chi_tiet = (req, res) => {
  const { kiem_ke_chi_tiet_id, actual_quantity, note, checked_by_email } = req.body;

  if (!kiem_ke_chi_tiet_id || actual_quantity === undefined || !checked_by_email) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu.' });
  }

  const sql = `
    UPDATE inventory_audit_items
    SET actual_quantity = ?, note = ?, checked_by_email = ?, checked_at = NOW()
    WHERE id = ?;
  `;

  db.query(sql, [actual_quantity, note, checked_by_email, kiem_ke_chi_tiet_id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi cập nhật kết quả kiểm kê.' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi.' });
    }
    res.json({ success: true, message: 'Đã cập nhật kết quả kiểm kê.' });
  });
};

exports.get__api_kiem_ke_danh_sach_dot = (req, res) => {
  const sql = `
    SELECT id, batch_code, batch_name, created_at, created_by_email
    FROM inventory_audit_batches
    WHERE status = 'da_ket_thuc'
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Lỗi lấy danh sách đợt:', err);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đợt.' });
    }

    res.json({ success: true, data: rows });
  });
};

exports.get__api_kiem_ke_dot_dang_kiem = (req, res) => {
  const sql = `
    SELECT id, batch_code, batch_name, created_at, created_by_email
    FROM inventory_audit_batches
    WHERE status = 'dang_kiem'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    if (rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: rows[0] });
  });
};

exports.get__api_kiem_ke_bao_cao_dot_dotId = (req, res) => {
  const { dotId } = req.params;
  const sql = `
    SELECT
      kkct.id AS kiem_ke_chi_tiet_id,
      pd.product_code,
      pd.product_name,
      pd.image_url, -- ✅ Thêm dòng này
      pd.unit_price,
      pd.quantity AS system_quantity,
      kkct.actual_quantity,
      kkct.note,
      kkct.checked_by_email,
      kkct.checked_at,
      kv.area_name
    FROM inventory_audit_items kkct
    JOIN product_details pd ON kkct.product_detail_id = pd.id
    JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
    WHERE kkct.audit_batch_id = ?;
  `;

  db.query(sql, [dotId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo.' });
    res.json({ success: true, data: rows });
  });
};

exports.post__api_kiem_ke_reset_san_pham = (req, res) => {
  const { product_code, audit_batch_id } = req.body;

  if (!product_code || !audit_batch_id) {
    return res.status(400).json({ success: false, message: 'Thiếu mã sản phẩm hoặc đợt kiểm kê.' });
  }

  // Tìm tất cả product_detail_id theo product_code
  const sqlGetIds = `
    SELECT kkct.id
    FROM inventory_audit_items kkct
    JOIN product_details pd ON kkct.product_detail_id = pd.id
    WHERE pd.product_code = ? AND kkct.audit_batch_id = ?
  `;

  db.query(sqlGetIds, [product_code, audit_batch_id], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ success: false, message: 'Lỗi truy vấn sản phẩm kiểm kê.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu kiểm kê cần reset.' });
    }

    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');

    const sqlReset = `
      UPDATE inventory_audit_items
      SET actual_quantity = NULL,
          note = '',
          checked_by_email = NULL,
          checked_at = NULL
      WHERE id IN (${placeholders})
    `;

    db.query(sqlReset, ids, (err2, result) => {
      if (err2) {
        console.error('❌ Lỗi cập nhật:', err2);
        return res.status(500).json({ success: false, message: 'Lỗi reset dữ liệu kiểm kê.' });
      }

      res.json({ success: true, message: `Đã reset ${result.affectedRows} bản ghi kiểm kê.` });
    });
  });
};

exports.post__api_kiem_ke_xoa_san_pham_khoi_dot = (req, res) => {
  const { product_code, audit_batch_id } = req.body;
  if (!product_code || !audit_batch_id) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu.' });
  }

  const sql = `
    DELETE kkct FROM inventory_audit_items kkct
    JOIN product_details pd ON kkct.product_detail_id = pd.id
    WHERE pd.product_code = ? AND kkct.audit_batch_id = ?
  `;

  db.query(sql, [product_code, audit_batch_id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi xóa:', err);
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm khỏi đợt.' });
    }

    res.json({ success: true, message: `Đã xóa ${result.affectedRows} dòng khỏi đợt kiểm kê.` });
  });
};

exports.post__api_kiem_ke_xoa_nhieu_san_pham = (req, res) => {
  let { audit_batch_id, product_codes } = req.body;
  audit_batch_id = parseInt(audit_batch_id);

  if (!audit_batch_id || !Array.isArray(product_codes) || product_codes.length === 0) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu hoặc danh sách rỗng.' });
  }

  const placeholders = product_codes.map(() => '?').join(',');
  const sql = `
    DELETE kkct FROM inventory_audit_items kkct
    JOIN product_details pd ON kkct.product_detail_id = pd.id
    WHERE pd.product_code IN (${placeholders}) AND kkct.audit_batch_id = ?
  `;

  db.query(sql, [...product_codes, audit_batch_id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi xóa nhiều sản phẩm:', err);
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm hàng loạt.' });
    }

    res.json({ success: true, deletedCount: result.affectedRows });
  });
};

exports.delete__api_kiem_ke_huy_dot_dotId = (req, res) => {
  const dotId = parseInt(req.params.dotId);
  if (!dotId) {
    return res.status(400).json({ success: false, message: 'Thiếu dotId để hủy.' });
  }

  const deleteChiTietSql = `DELETE FROM inventory_audit_items WHERE audit_batch_id = ?`;
  const deleteDotSql = `DELETE FROM inventory_audit_batches WHERE id = ?`;

  // Bắt đầu bằng xóa các chi tiết
  db.query(deleteChiTietSql, [dotId], (err1, result1) => {
    if (err1) {
      console.error('❌ Lỗi khi xoá chi tiết kiểm kê:', err1);
      return res.status(500).json({ success: false, message: 'Không thể xoá chi tiết kiểm kê.' });
    }

    // Sau đó xóa đợt chính
    db.query(deleteDotSql, [dotId], (err2, result2) => {
      if (err2) {
        console.error('❌ Lỗi khi xoá đợt kiểm kê:', err2);
        return res.status(500).json({ success: false, message: 'Không thể xoá đợt kiểm kê.' });
      }

      res.json({ success: true, message: '✅ Đã huỷ đợt kiểm kê.' });
    });
  });
};

exports.delete__api_kiem_ke_huy_dot_dotId = (req, res) => {
  const dotId = parseInt(req.params.dotId);
  if (!dotId) {
    return res.status(400).json({ success: false, message: 'Thiếu dotId để hủy.' });
  }

  const deleteChiTietSql = `DELETE FROM inventory_audit_items WHERE audit_batch_id = ?`;
  const deleteDotSql = `DELETE FROM inventory_audit_batches WHERE id = ?`;

  // Bắt đầu bằng xóa các chi tiết
  db.query(deleteChiTietSql, [dotId], (err1, result1) => {
    if (err1) {
      console.error('❌ Lỗi khi xoá chi tiết kiểm kê:', err1);
      return res.status(500).json({ success: false, message: 'Không thể xoá chi tiết kiểm kê.' });
    }

    // Sau đó xóa đợt chính
    db.query(deleteDotSql, [dotId], (err2, result2) => {
      if (err2) {
        console.error('❌ Lỗi khi xoá đợt kiểm kê:', err2);
        return res.status(500).json({ success: false, message: 'Không thể xoá đợt kiểm kê.' });
      }

      res.json({ success: true, message: '✅ Đã huỷ đợt kiểm kê.' });
    });
  });
};

exports.get__api_kiem_ke_chua_kiem = (req, res) => {
  db.query(`
    SELECT COUNT(*) AS chua_kiem_count
    FROM inventory_audit_items
    WHERE actual_quantity IS NULL
  `, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn' });
    res.json({ count: results[0].chua_kiem_count });
  });
};

exports.put__api_kiem_ke_dot_id_ket_thuc = (req, res) => {
  const dotId = req.params.id;

  const sql = `UPDATE inventory_audit_batches SET status = 'da_ket_thuc' WHERE id = ?`;

  db.query(sql, [dotId], (err, result) => {
    if (err) {
      console.error('❌ Lỗi cập nhật trạng thái đợt:', err);
      return res.status(500).json({ success: false, message: 'Lỗi server' });
    }

    res.json({ success: true, message: 'Đã cập nhật trạng thái đợt thành công' });
  });
};

exports.get__api_vi_tri_con_trong = (req, res) => {
  const sql = `
    SELECT 
      FLOOR(SUM(kv.capacity_kg - IFNULL(pd_sum.weight_used, 0)) / 500) AS tong_vi_tri_con_trong
    FROM warehouse_areas kv
    LEFT JOIN (
      SELECT warehouse_area_id, SUM(weight) AS weight_used
      FROM product_details
      GROUP BY warehouse_area_id
    ) pd_sum ON kv.id = pd_sum.warehouse_area_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    // results là mảng kết quả, lấy phần tử đầu tiên
    const totalFreePositions = results[0]?.tong_vi_tri_con_trong ?? 0;
    res.json({ totalFreePositions });
  });
};

exports.get__api_thong_ke = (req, res) => {
  const type = req.query.type === 'ngay' ? 'ngay' : 'thang'; // mặc định là 'thang'
  const dateFormat = type === 'ngay' ? '%Y-%m-%d' : '%Y-%m';

  const sql = `
    SELECT 
      DATE_FORMAT(pnk.created_at, '${dateFormat}') AS label,
      'nhap' AS loai,
      SUM(ctnk.quantity) AS tong
    FROM goods_receipt_items ctnk
    JOIN goods_receipts pnk ON ctnk.goods_receipt_id = pnk.id
    GROUP BY label

    UNION

    SELECT 
      DATE_FORMAT(pxk.created_at, '${dateFormat}') AS label,
      'xuat' AS loai,
      SUM(ctxk.quantity) AS tong
    FROM goods_issue_items ctxk
    JOIN goods_issue_receipts pxk ON ctxk.goods_issue_receipt_id = pxk.id
    GROUP BY label

    ORDER BY label ASC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn thống kê:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn thống kê' });
    }
    res.json(results);
  });
};

exports.get__api_khu_vuc_suc_chua = (req, res) => {
  const sql = `
    SELECT 
      kv.id AS warehouse_area_id,
      kv.area_name,
      kv.capacity_kg,
      IFNULL(SUM(pd.weight), 0) AS da_su_dung_kg
    FROM warehouse_areas kv
    LEFT JOIN product_details pd ON kv.id = pd.warehouse_area_id
    GROUP BY kv.id;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Lỗi khi lấy dữ liệu sức chứa kho theo khu vực:', err);
      return res.status(500).json({ error: 'Lỗi máy chủ' });
    }

    // Vì bạn muốn max của biểu đồ là 50,000 kg
    const maxCapacity = 50000;

    // Tính tổng dùng, tổng sức chứa không dùng ở đây, chỉ để tính % tổng thôi nếu cần
    const tongSucChua = maxCapacity * results.length; // tổng max = 50000 * số khu vực
    const tongDaDung = results.reduce((sum, row) => sum + (row.da_su_dung_kg || 0), 0);

    const totalUsedPercent = tongSucChua > 0 ? Math.round((tongDaDung / tongSucChua) * 100) : 0;

    res.json({
      totalUsedPercent,
      data: results
    });
  });
};

exports.get__api_doanh_thu = (req, res) => {
  // SQL lấy 7 phiếu nhập + xuất mới nhất
  const sqlPhieu = `
    SELECT receipt_code, created_at, total_amount, 'nhap' AS type
    FROM goods_receipts
    UNION ALL
    SELECT receipt_code, created_at, total_amount, 'xuat' AS type
    FROM goods_issue_receipts
    ORDER BY created_at DESC
    LIMIT 7
  `;

  // SQL tính tổng nhập
  const sqlTongNhap = `SELECT COALESCE(SUM(total_amount), 0) AS tong_nhap FROM goods_receipts`;

  // SQL tính tổng xuất
  const sqlTongXuat = `SELECT COALESCE(SUM(total_amount), 0) AS tong_xuat FROM goods_issue_receipts`;

  // Thực hiện 3 truy vấn song song, hoặc tuần tự
  db.query(sqlPhieu, (err, phieuResults) => {
    if (err) {
      console.error('❌ Lỗi truy vấn phiếu:', err);
      return res.status(500).json({ error: 'Lỗi truy vấn phiếu' });
    }

    db.query(sqlTongNhap, (err, tongNhapResult) => {
      if (err) {
        console.error('❌ Lỗi truy vấn tổng nhập:', err);
        return res.status(500).json({ error: 'Lỗi truy vấn tổng nhập' });
      }

      db.query(sqlTongXuat, (err, tongXuatResult) => {
        if (err) {
          console.error('❌ Lỗi truy vấn tổng xuất:', err);
          return res.status(500).json({ error: 'Lỗi truy vấn tổng xuất' });
        }

        const tongNhap = parseFloat(tongNhapResult[0]?.tong_nhap || 0);
        const tongXuat = parseFloat(tongXuatResult[0]?.tong_xuat || 0);
        const doanhThu = tongXuat - tongNhap;

        res.json({
          phieu: phieuResults,
          tongNhap,
          tongXuat,
          doanhThu
        });
      });
    });
  });
};

exports.get__api_nha_cung_cap = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(`
      SELECT p1.supplier_name, p1.logo_url, p1.supplier_address, COUNT(p2.id) AS tong_phieu
      FROM goods_receipts p1
      INNER JOIN (
          SELECT supplier_name, MAX(created_at) AS max_date
          FROM goods_receipts
          GROUP BY supplier_name
      ) latest ON p1.supplier_name = latest.supplier_name 
               AND p1.created_at = latest.max_date
      LEFT JOIN goods_receipts p2 ON p2.supplier_name = p1.supplier_name
      GROUP BY p1.supplier_name, p1.logo_url, p1.supplier_address
      ORDER BY p1.supplier_name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách nhà cung cấp:", err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.get__api_xuat_excel_kiem_ke_dotId = async (req, res) => {
  const { dotId } = req.params;

  // 1. Lấy thông tin đợt kiểm kê
  const dotQuery = `SELECT batch_code, batch_name, created_at, created_by_email FROM inventory_audit_batches WHERE id = ?`;
  db.query(dotQuery, [dotId], (err, dotRows) => {
    if (err || dotRows.length === 0) {
      console.error('❌ Lỗi truy vấn thông tin đợt kiểm kê:', err);
      return res.status(500).json({ success: false, message: 'Không tìm thấy thông tin đợt kiểm kê hoặc lỗi truy vấn.' });
    }

    const dot = dotRows[0];

    // 2. Truy vấn chi tiết sản phẩm đã kiểm kê
    const sql = `
            SELECT
                pd.product_code,
                pd.product_name,
                pd.image_url,
                kv.area_name,
                pd.unit_price,
                pd.quantity AS system_quantity,
                kkct.actual_quantity,
                kkct.checked_by_email,
                kkct.checked_at,
                kkct.note  -- ✅ thêm dòng này
            FROM inventory_audit_items kkct
            JOIN product_details pd ON kkct.product_detail_id = pd.id
            JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
            WHERE kkct.audit_batch_id = ?
        `;

    db.query(sql, [dotId], async (err2, rows) => {
      if (err2) {
        console.error('❌ Lỗi truy vấn dữ liệu chi tiết sản phẩm:', err2);
        return res.status(500).json({ success: false, message: 'Lỗi truy vấn chi tiết sản phẩm kiểm kê.' });
      }

      try {
        // Khởi tạo Workbook và Worksheet của ExcelJS
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Báo cáo kiểm kê');

        // --- Cấu hình chung cho Workbook ---
        workbook.creator = 'Hệ thống quản lý kho';
        workbook.lastModifiedBy = 'Hệ thống quản lý kho';
        workbook.created = new Date();
        workbook.modified = new Date();

        let currentRow = 1; // Biến theo dõi dòng hiện tại trong Excel

        // --- 1. Tiêu đề chính của báo cáo ---
        sheet.mergeCells(`A${currentRow}:J${currentRow}`);
        const titleCell = sheet.getCell(`A${currentRow}`);
        titleCell.value = 'BÁO CÁO KIỂM KÊ KHO';
        titleCell.font = { name: 'Times New Roman', size: 28, bold: true, color: { argb: 'FF000080' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDEBF7' }
        };
        titleCell.border = {
          top: { style: 'medium' }, left: { style: 'medium' },
          bottom: { style: 'medium' }, right: { style: 'medium' }
        };
        sheet.getRow(currentRow).height = 45;
        currentRow++;

        // Dòng trống sau tiêu đề
        sheet.addRow([]);
        sheet.getRow(currentRow).height = 5;
        currentRow++;

        // --- 2. Thông tin đợt kiểm kê (Mã kiểm hàng & Tên đợt kiểm) ---
        const infoLabelStyle = { font: { bold: true, color: { argb: 'FF333333' }, size: 12 } };
        const infoValueStyle = { font: { color: { argb: 'FF000000' }, size: 12 } };

        // Mã đợt kiểm kê - Nổi bật hơn
        sheet.mergeCells(`A${currentRow}:J${currentRow}`);
        const maDotCell = sheet.getCell(`A${currentRow}`);
        maDotCell.value = `Mã đợt kiểm kê: ${dot.batch_code}`;
        maDotCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF1F4E79' } };
        maDotCell.alignment = { vertical: 'middle', horizontal: 'center' };
        maDotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        maDotCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        sheet.getRow(currentRow).height = 30;
        currentRow++;

        // Tên đợt kiểm (to và nổi bật nhất)
        sheet.mergeCells(`A${currentRow}:J${currentRow}`);
        const dotNameCell = sheet.getCell(`A${currentRow}`);
        dotNameCell.value = `Tên đợt kiểm: ${dot.batch_name}`;
        dotNameCell.font = { name: 'Times New Roman', size: 20, bold: true, color: { argb: 'FF1F4E79' } };
        dotNameCell.alignment = { vertical: 'middle', horizontal: 'center' };
        dotNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
        dotNameCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        sheet.getRow(currentRow).height = 35;
        currentRow++;

        // Ngày tạo báo cáo
        const rowNgayTao = sheet.addRow(['Ngày tạo báo cáo:', new Date(dot.created_at).toLocaleString('vi-VN')]);
        rowNgayTao.getCell('A').style = infoLabelStyle;
        rowNgayTao.getCell('B').style = infoValueStyle;
        currentRow++;

        // Người tạo báo cáo
        const rowNguoiTao = sheet.addRow(['Người tạo báo cáo:', dot.created_by_email]);
        rowNguoiTao.getCell('A').style = infoLabelStyle;
        rowNguoiTao.getCell('B').style = infoValueStyle;
        currentRow++;

        sheet.addRow([]); // Dòng trống trước bảng chi tiết
        sheet.getRow(currentRow).height = 10;
        currentRow++;

        // --- 3. Header chi tiết sản phẩm ---
        const tableHeaderRow = currentRow; // Lưu dòng hiện tại để đóng băng header sau này

        // 1. Cấu trúc cột
        sheet.columns = [
          { header: 'STT', key: 'stt', width: 20 },
          { header: 'Mã SP', key: 'product_code', width: 18 },
          { header: 'Tên SP', key: 'product_name', width: 35 },
          { header: 'Khu vực', key: 'area_name', width: 20 },
          { header: 'Giá SP (VND)', key: 'unit_price', width: 18 },
          { header: 'Tồn hệ thống', key: 'system_quantity', width: 18 },
          { header: 'Thực tế', key: 'actual_quantity', width: 18 },
          { header: 'Tình trạng', key: 'chenh_lech', width: 18 },
          { header: 'Người kiểm', key: 'checked_by_email', width: 28 },
          { header: 'Thời gian kiểm', key: 'checked_at', width: 25 }
        ];

        // 2. Tạo dòng tiêu đề thật (thủ công)
        const headers = sheet.columns.map(c => c.header); // Lấy danh sách header
        sheet.addRow(headers); // Thêm dòng header vào sheet
        currentRow++; // Tăng dòng hiện tại vì vừa thêm dòng header

        // 3. Styling cho dòng tiêu đề
        const headerRow = sheet.getRow(currentRow - 1); // Dòng vừa thêm là dòng header
        headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; // Chữ trắng
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' } // Nền xanh đậm
        };
        headerRow.height = 25;

        // 4. Thêm border cho các ô tiêu đề
        headerRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // --- 4. Thêm dữ liệu chi tiết sản phẩm và định dạng ---
        let totalActualQuantity = 0;
        let totalSystemQuantity = 0;
        let totalDifference = 0;
        let productsWithDiscrepancyCount = 0;

        rows.forEach((row, index) => {
          const chenh_lech = row.actual_quantity != null
            ? row.actual_quantity - row.system_quantity
            : null;

          if (chenh_lech !== null && chenh_lech !== 0) {
            productsWithDiscrepancyCount++;
          }

          const dataRow = sheet.addRow({
            stt: index + 1,
            product_code: row.product_code,
            product_name: row.product_name,
            area_name: row.area_name,
            unit_price: row.unit_price,
            system_quantity: row.system_quantity,
            actual_quantity: row.actual_quantity,
            chenh_lech: chenh_lech, // Vẫn dùng biến này cho giá trị, chỉ đổi tên cột hiển thị
            checked_by_email: row.checked_by_email,
            checked_at: row.checked_at ? new Date(row.checked_at).toLocaleString('vi-VN') : '',
          });

          if (index % 2 === 0) {
            dataRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' }
            };
          }

          dataRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          });

          dataRow.getCell('unit_price').numFmt = '#,##0.00';
          dataRow.getCell('system_quantity').numFmt = '#,##0';
          dataRow.getCell('actual_quantity').numFmt = '#,##0';
          dataRow.getCell('chenh_lech').numFmt = '#,##0';

          const diffCell = dataRow.getCell('chenh_lech');

          if (chenh_lech === null || row.actual_quantity === null) {
            diffCell.value = 'Chưa kiểm';
            diffCell.font = { italic: true, color: { argb: 'FF808080' } };
          } else if (chenh_lech < 0) {
            diffCell.value = `Thiếu ${Math.abs(chenh_lech)}`;
            diffCell.font = { color: { argb: 'FFFF0000' }, bold: true };
          } else if (chenh_lech > 0) {
            diffCell.value = `Dư ${chenh_lech}`;
            diffCell.font = { color: { argb: 'FFFFA500' }, bold: true };
          } else {
            diffCell.value = 'Đủ';
            diffCell.font = { color: { argb: 'FF00B050' }, bold: true }; // Màu xanh lá
          }


          totalSystemQuantity += row.system_quantity || 0;
          totalActualQuantity += row.actual_quantity || 0;
          totalDifference += chenh_lech || 0;
        });

        // --- 5. Phần tổng kết chi tiết hơn ---
        const summaryLabelStyle = {
          font: { bold: true, size: 12, color: { argb: 'FF333333' } },
          alignment: { vertical: 'middle', horizontal: 'right' }
        };
        const summaryValueStyle = {
          font: { bold: true, size: 12, color: { argb: 'FF1F4E79' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
          alignment: { vertical: 'middle', horizontal: 'center' }
        };

        sheet.addRow([]);
        sheet.addRow([]);
        currentRow += 2;

        const rowTotalProducts = sheet.addRow(['', '', '', '', 'Tổng số sản phẩm đã kiểm kê:', '', rows.length, '', '', '']);
        rowTotalProducts.height = 25;
        rowTotalProducts.getCell('E').style = summaryLabelStyle;
        rowTotalProducts.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
        sheet.mergeCells(rowTotalProducts.getCell('E').address, rowTotalProducts.getCell('F').address);
        sheet.mergeCells(rowTotalProducts.getCell('G').address, rowTotalProducts.getCell('J').address);

        const rowProductsWithDiscrepancy = sheet.addRow(['', '', '', '', 'Tổng số sản phẩm có chênh lệch:', '', productsWithDiscrepancyCount, '', '', '']);
        rowProductsWithDiscrepancy.height = 25;
        rowProductsWithDiscrepancy.getCell('E').style = summaryLabelStyle;
        rowProductsWithDiscrepancy.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
        sheet.mergeCells(rowProductsWithDiscrepancy.getCell('E').address, rowProductsWithDiscrepancy.getCell('F').address);
        sheet.mergeCells(rowProductsWithDiscrepancy.getCell('G').address, rowProductsWithDiscrepancy.getCell('J').address);

        const rowSystemTotal = sheet.addRow(['', '', '', '', 'Tổng số lượng tồn hệ thống:', '', totalSystemQuantity, '', '', '']);
        rowSystemTotal.height = 25;
        rowSystemTotal.getCell('E').style = summaryLabelStyle;
        rowSystemTotal.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
        sheet.mergeCells(rowSystemTotal.getCell('E').address, rowSystemTotal.getCell('F').address);
        sheet.mergeCells(rowSystemTotal.getCell('G').address, rowSystemTotal.getCell('J').address);

        const rowActualTotal = sheet.addRow(['', '', '', '', 'Tổng số lượng thực tế kiểm:', '', totalActualQuantity, '', '', '']);
        rowActualTotal.height = 25;
        rowActualTotal.getCell('E').style = summaryLabelStyle;
        rowActualTotal.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
        sheet.mergeCells(rowActualTotal.getCell('E').address, rowActualTotal.getCell('F').address);
        sheet.mergeCells(rowActualTotal.getCell('G').address, rowActualTotal.getCell('J').address);

        const rowDifferenceTotal = sheet.addRow(['', '', '', '', 'Tổng số lượng chênh lệch:', '', totalDifference, '', '', '']);
        rowDifferenceTotal.height = 25;
        rowDifferenceTotal.getCell('E').style = summaryLabelStyle;
        rowDifferenceTotal.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
        sheet.mergeCells(rowDifferenceTotal.getCell('E').address, rowDifferenceTotal.getCell('F').address);
        sheet.mergeCells(rowDifferenceTotal.getCell('G').address, rowDifferenceTotal.getCell('J').address);


        // --- 6. Đóng băng tiêu đề ---
        //sheet.views = [{ state: 'frozen', ySplit: tableHeaderRow }];

        // --- 7. Xuất file ---
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=bao-cao-kiem-ke-${dot.batch_code}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
      } catch (e) {
        console.error('❌ Lỗi trong quá trình tạo file Excel:', e);
        res.status(500).json({ success: false, message: 'Lỗi trong quá trình tạo file Excel.' });
      }
    });
  });
};

exports.get__api_tong_gia_tri_ton_kho = (req, res) => {
  const sql = `
    SELECT SUM(
      IFNULL(quantity, 0) * IFNULL(unit_price, 0)
    ) AS tongGiaTriTonKho
    FROM product_details
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Lỗi API tổng giá trị tồn kho:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }

    const tongGiaTriTonKho = results[0]?.tongGiaTriTonKho ?? 0;
    res.json({ tongGiaTriTonKho });
  });
};

