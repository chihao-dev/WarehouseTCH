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

exports.post__api_phieu_nhap = (req, res) => {
  const fields = req.body;
  const files = req.files;

  const {
    created_at,
    created_date,
    supplier_name,
    supplier_address,
    meeting_date,
    note,
    total_amount,
    email,
    representative_name,
    representative_email,
    representative_phone
  } = fields;

  const final_created_at = created_at || created_date;

  if (!email) {
    return res.status(400).json({ message: '❌ Thiếu email người dùng' });
  }

  // ✅ Ưu tiên logo mới (file), nếu không có thì dùng logo_url cũ
  const logoFile = files.find(f => f.fieldname === 'logo');
  const logo_url = logoFile
    ? `http://localhost:3000/uploads/${logoFile.filename}`
    : fields.logo_url || null;

  let products = [];
  try {
    products = JSON.parse(fields.products || '[]');
  } catch {
    return res.status(400).json({ message: '❌ Dữ liệu sản phẩm không hợp lệ' });
  }

  // 🔍 Lấy thông tin người dùng
  db.query(`
    SELECT users.id, user_info.full_name 
    FROM users 
    LEFT JOIN user_info ON users.id = user_info.user_id 
    WHERE users.email = ?
  `, [email], (err, results) => {
    if (err || results.length === 0) {
      console.error('❌ Không tìm thấy người dùng:', err);
      return res.status(400).json({ message: '❌ Không tìm thấy người dùng từ email' });
    }

    const userId = results[0].id;
    const staffFullName = results[0].full_name || 'Chưa rõ';

    // ✅ Tạo phiếu nhập
    db.query(
      `INSERT INTO goods_receipts 
        (created_at, supplier_name, supplier_address, logo_url, user_id, total_amount,
         meeting_date, note,
         staff_account_name, staff_account_email, admin_account_email,
         representative_name, representative_email, representative_phone,
         status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        final_created_at,
        supplier_name,
        supplier_address,
        logo_url,
        userId,
        total_amount,
        meeting_date || null,
        note || null,

        staffFullName,
        email,
        null,

        representative_name || null,
        representative_email || null,
        representative_phone || null,
        'Đã gửi phiếu'
      ],
      (err, result) => {
        if (err) {
          console.error('❌ Lỗi tạo phiếu:', err);
          return res.status(500).json({ message: '❌ Lỗi khi tạo phiếu' });
        }

        const phieuId = result.insertId;
        const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, '');
        const receipt_code = `PNK${todayStr}-${String(phieuId).padStart(3, '0')}`;

        db.query(`UPDATE goods_receipts SET receipt_code = ? WHERE id = ?`, [receipt_code, phieuId]);

        // 🧾 Lưu chi tiết từng sản phẩm
        products.forEach((item, i) => {
          const img = files.find(f => f.fieldname === `product_image_${i}`);
          const image_url = img
            ? `http://localhost:3000/uploads/${img.filename}`
            : item.image_url || null;

          db.query(
            `INSERT INTO goods_receipt_items 
              (goods_receipt_id, item_no, image_url, product_name, product_type, product_code,
               unit, weight, area, manufacture_date, expiry_date, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              phieuId,
              i + 1,
              image_url,
              item.product_name,
              item.product_type,
              item.product_code,
              item.unit,
              item.weight,
              item.area || 0,
              item.manufacture_date,
              item.expiry_date,
              item.quantity,
              item.unit_price,
              item.quantity * item.unit_price
            ]
          );
        });

        return res.json({ message: '✅ Tạo phiếu chuyển hàng thành công!', receipt_code });
      }
    );
  });
};

exports.get__api_hoa_don_userId = (req, res) => {
  const userId = req.params.userId;

  const nhapQuery = `
    SELECT pnk.*,
           CASE
             WHEN pnk.logo_url LIKE 'http%' THEN pnk.logo_url
             WHEN pnk.logo_url IS NOT NULL THEN CONCAT('http://localhost:3000', pnk.logo_url)
             ELSE NULL
           END AS logo_url,
           TRIM(IFNULL(pnk.status, 'Đã gửi phiếu')) AS trang_thai,
           pnk.created_at AS created_date,
           pnk.admin_note AS note_admin,
           'Phiếu nhập kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM goods_receipts pnk
    LEFT JOIN user_info ui ON pnk.user_id = ui.user_id
    WHERE pnk.user_id = ?
  `;

  const xuatQuery = `
    SELECT pxk.*,
           TRIM(IFNULL(pxk.status, 'Đã gửi phiếu')) AS trang_thai,
           pxk.created_at AS created_date,
           pxk.admin_note AS note_admin,
           'Phiếu xuất kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM goods_issue_receipts pxk
    LEFT JOIN user_info ui ON pxk.user_id = ui.user_id
    WHERE pxk.user_id = ?
  `;

  db.query(nhapQuery, [userId], (err1, nhapList) => {
    if (err1) {
      console.error('❌ Lỗi truy vấn phiếu nhập:', err1);
      return res.status(500).json({ message: 'Lỗi lấy phiếu nhập' });
    }

    Promise.all(
      nhapList.map((phieu) => {
        return new Promise((resolve, reject) => {
          db.query(
            `SELECT * FROM goods_receipt_items WHERE goods_receipt_id = ?`,
            [phieu.id],
            (err, products) => {
              if (err) return reject(err);
              phieu.products = products;
              resolve(phieu);
            }
          );
        });
      })
    )
      .then((withDetails) => {
        db.query(xuatQuery, [userId], async (err2, xuatList) => {
          if (err2) {
            console.error('❌ Lỗi truy vấn phiếu xuất:', err2);
            return res.status(500).json({ message: 'Lỗi lấy phiếu xuất' });
          }

          try {
            const xuatWithDetails = await Promise.all(
              xuatList.map((pxk) => {
                return new Promise((resolve, reject) => {
                  db.query(
                    `SELECT * FROM goods_issue_items WHERE goods_issue_receipt_id = ?`,
                    [pxk.id],
                    (err, products) => {
                      if (err) return reject(err);
                      pxk.products = products;
                      pxk.payment = null; // bỏ thanh toán
                      resolve(pxk);
                    }
                  );
                });
              })
            );

            const hoaDonTong = [...withDetails, ...xuatWithDetails].sort((a, b) => {
              const dateA = new Date(a.created_at || a.created_at);
              const dateB = new Date(b.created_at || b.created_at);
              return dateB - dateA || b.id - a.id;
            });

            res.json(hoaDonTong);
          } catch (error) {
            console.error('❌ Lỗi tổng hợp chi tiết phiếu xuất:', error);
            res.status(500).json({ message: 'Lỗi tổng hợp phiếu xuất' });
          }
        });
      })
      .catch((err) => {
        console.error('❌ Lỗi tổng hợp chi tiết phiếu nhập:', err);
        res.status(500).json({ message: 'Lỗi tổng hợp phiếu nhập' });
      });
  });
};

exports.get__api_phieu_nhap = async (req, res) => {
  const query = `
    SELECT pnk.id, pnk.receipt_code, pnk.supplier_name, pnk.supplier_address,
           CASE
             WHEN pnk.logo_url LIKE 'http%' THEN pnk.logo_url
             WHEN pnk.logo_url IS NOT NULL THEN CONCAT('http://localhost:3000', pnk.logo_url)
             ELSE NULL
           END AS logo_url,
           pnk.total_amount, pnk.meeting_date, pnk.note, pnk.status,
           pnk.staff_account_name, pnk.staff_account_email,
           pnk.admin_account_name, pnk.admin_account_email,
           pnk.representative_name, pnk.representative_email, pnk.representative_phone,
           TRIM(IFNULL(pnk.status, 'Đã gửi phiếu')) AS trang_thai,
           pnk.created_at AS created_date,
           pnk.admin_note AS note_admin,
           ui.full_name, ui.phone
    FROM goods_receipts pnk
    LEFT JOIN user_info ui ON pnk.user_id = ui.user_id
    ORDER BY created_date DESC, pnk.id DESC
  `;

  db.query(query, async (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn phiếu:', err);
      return res.status(500).json({ message: 'Lỗi lấy danh sách phiếu nhập' });
    }

    try {
      const withDetails = await Promise.all(
        results.map((phieu) => {
          return new Promise((resolve, reject) => {
            db.query(
              'SELECT * FROM goods_receipt_items WHERE goods_receipt_id = ?',
              [phieu.id],
              (err, products) => {
                if (err) {
                  console.error('❌ Lỗi lấy chi tiết sản phẩm:', err);
                  return reject(err);
                }
                phieu.products = products;
                resolve(phieu);
              }
            );
          });
        })
      );

      return res.json(withDetails);
    } catch (err) {
      console.error('❌ Lỗi xử lý dữ liệu phiếu:', err);
      return res.status(500).json({ message: 'Lỗi xử lý chi tiết phiếu nhập' });
    }
  });
};

exports.put__api_phieu_nhap_id_staff_cap_nhat = (req, res) => {
  const { id } = req.params;
  const { staff_account_email, staff_account_name, note, status, trang_thai } = req.body;
  const final_status = status || trang_thai;

  const query = `
    UPDATE goods_receipts 
    SET 
      staff_account_email = ?, 
      staff_account_name = ?, 
      note = ?, 
      status = ?
    WHERE id = ?
  `;

  db.query(query, [staff_account_email, staff_account_name, note, final_status, id], (err) => {
    if (err) {
      console.error('Lỗi cập nhật thông tin nhân viên:', err);
      return res.status(500).json({ message: '❌ Lỗi cập nhật thông tin nhân viên' });
    }

    res.json({ message: '✅ Cập nhật thành công nhân viên và trạng thái phiếu' });
  });
};

exports.put__api_phieu_nhap_id_admin_cap_nhat = (req, res) => {
  const { id } = req.params;
  const { status, trang_thai, admin_note, note_admin, admin_account_email, admin_account_name } = req.body;
  const final_status = status || trang_thai;
  const final_admin_note = admin_note || note_admin;

  const query = `
    UPDATE goods_receipts 
    SET status = ?, 
        admin_note = ?, 
        admin_account_email = ?, 
        admin_account_name = ?
    WHERE id = ?
  `;

  db.query(query, [final_status, final_admin_note, admin_account_email, admin_account_name, id], (err) => {
    if (err) {
      console.error('❌ Lỗi khi cập nhật phiếu:', err); // 👈 Thêm dòng này để debug
      return res.status(500).json({ message: 'Lỗi khi duyệt phiếu' });
    }
    res.json({ message: 'Duyệt thành công' });
  });
};

exports.put__api_phieu_nhap_id_hoan_tat = (req, res) => {
  const id = req.params.id;
  const { status, trang_thai } = req.body;
  const final_status = status || trang_thai;

  // Kiểm tra đầu vào
  if (!final_status || typeof final_status !== 'string') {
    return res.status(400).json({ error: '⚠️ Thiếu hoặc sai định dạng trường "status" hoặc "trang_thai"' });
  }

  const sql = 'UPDATE goods_receipts SET status = ? WHERE id = ?';

  db.query(sql, [final_status, id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi SQL khi cập nhật phiếu:', err);
      return res.status(500).json({ error: '❌ Lỗi server khi cập nhật phiếu' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '⚠️ Không tìm thấy phiếu với ID đã cho' });
    }

    res.json({ message: '✅ Trạng thái phiếu đã được cập nhật thành công!' });
  });
};

exports.get__api_phieu_nhap_id_san_pham = (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT c.*, p.receipt_code, p.supplier_name
    FROM goods_receipt_items c
    JOIN goods_receipts p ON c.goods_receipt_id = p.id
    WHERE c.goods_receipt_id = ?
  `;
  db.query(query, [id], (err, rows) => {
    if (err) {
      console.error('Lỗi khi lấy chi tiết phiếu:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(rows);
  });
};

exports.post__api_phieu_xuat = (req, res) => {
  try {
    const body = req.body;
    const products = JSON.parse(body.products || '[]');

    if (!body.receiver_name || !products.length) {
      return res.status(400).json({ error: '⚠️ Thiếu thông tin người nhận hoặc sản phẩm.' });
    }

    const total_amount = parseFloat(body.total_amount || 0);
    const total_weight = parseFloat(body.total_weight || 0);
    const created_at = body.created_at || body.created_date || new Date().toISOString().split('T')[0];

    // Tạo mã phiếu xuất
    const generateCode = () => {
      const now = new Date();
      const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `PXK${yyyyMMdd}-${random}`;
    };
    const receipt_code = generateCode();

    // Xử lý file logo nếu có
    let logo_url = '';
    const logoFile = req.files?.find(f => f.fieldname === 'logo');
    if (logoFile) {
      const newName = `${Date.now()}_${logoFile.originalname}`;
      const newPath = path.join(__dirname, 'uploads', newName);
      fs.renameSync(logoFile.path, newPath);
      logo_url = `/uploads/${newName}`;
    }

    // Chuẩn bị câu lệnh SQL lưu phiếu xuất
    const sqlInsertPhieu = `
      INSERT INTO goods_issue_receipts (
        receipt_code, created_at, receiver_name, receiver_address,
        logo_url, user_id, total_amount, total_weight,
        delivery_date,
        representative_name, representative_email, representative_phone,
        staff_account_name, staff_account_email,
        admin_account_name, admin_account_email,
        note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      receipt_code,
      created_at,
      body.receiver_name,
      body.receiver_address || '',
      logo_url,
      parseInt(body.user_id || 0),
      total_amount,
      total_weight,
      body.delivery_date || null,
      body.representative_name || '',
      body.representative_email || '',
      body.representative_phone || '',
      body.staff_account_name || '',
      body.staff_account_email || '',
      body.admin_account_name || '',
      body.admin_account_email || '',
      body.note || ''
    ];

    db.query(sqlInsertPhieu, values, (err, result) => {
      if (err) {
        console.error('❌ Lỗi khi tạo phiếu xuất:', err);
        return res.status(500).json({ error: 'Không thể tạo phiếu xuất kho.' });
      }

      const goods_issue_receipt_id = result.insertId;

      // Lưu chi tiết sản phẩm
      const sqlChiTiet = `
        INSERT INTO goods_issue_items (
          goods_issue_receipt_id, item_no, image_url, product_name, product_type,
          product_code, unit, weight, weight_per_unit, manufacture_date, expiry_date,
          quantity, unit_price, total_price
        ) VALUES ?
      `;

      const chiTietValues = products.map((p, index) => [
        goods_issue_receipt_id,
        index + 1,
        p.preview || '',
        p.product_name,
        p.product_type,
        p.product_code,
        p.unit,
        parseFloat(p.weight || 0),
        parseFloat(p.weight_per_unit || 0),
        p.manufacture_date.split('T')[0],
        p.expiry_date.split('T')[0],
        parseInt(p.quantity),
        parseFloat(p.unit_price),
        parseFloat(p.quantity) * parseFloat(p.unit_price),
      ]);

      db.query(sqlChiTiet, [chiTietValues], (err2) => {
        if (err2) {
          console.error('❌ Lỗi thêm chi tiết sản phẩm:', err2);
          return res.status(500).json({ error: 'Không thể lưu chi tiết phiếu xuất.' });
        }

        return res.json({ message: '✅ Phiếu xuất kho đã lưu thành công!', receipt_code });
      });
    });
  } catch (error) {
    console.error('❌ Lỗi xử lý:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo phiếu xuất.' });
  }
};

exports.get__api_phieu_xuat = (req, res) => {
  const sql = `
    SELECT pxk.*,
           TRIM(IFNULL(pxk.status, 'Đã gửi phiếu')) AS trang_thai,
           pxk.created_at AS created_date,
           pxk.admin_note AS note_admin
    FROM goods_issue_receipts pxk
    ORDER BY pxk.created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi khi truy vấn phiếu xuất' });
    res.json(rows);
  });
};

exports.get__api_phieu_xuat_id_san_pham = (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM goods_issue_items WHERE goods_issue_receipt_id = ?`;
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi khi truy vấn chi tiết phiếu' });
    res.json(rows);
  });
};

exports.put__api_phieu_xuat_id_admin_cap_nhat = (req, res) => {
  const id = req.params.id;
  const { status, trang_thai, admin_note, note_admin, admin_account_name, admin_account_email } = req.body;
  const final_status = status || trang_thai;
  const final_admin_note = admin_note || note_admin;

  const sql = `
    UPDATE goods_issue_receipts
    SET status = ?, admin_note = ?, admin_account_name = ?, admin_account_email = ?
    WHERE id = ?
  `;
  db.query(sql, [final_status, final_admin_note, admin_account_name, admin_account_email, id], (err, result) => {
    if (err) {
      console.error('Lỗi khi cập nhật phiếu xuất:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }
    res.json({ message: 'Cập nhật thành công' });
  });
};

exports.post__api_phieu_xuat_xac_nhan_xuat_kho_id = async (req, res) => {
  const id = req.params.id;

  try {
    // 1. Lấy chi tiết phiếu xuất
    const [chiTiet] = await db.promise().query(
      'SELECT product_code, quantity FROM goods_issue_items WHERE goods_issue_receipt_id = ?',
      [id]
    );

    // 2. Kiểm tra tồn kho từng sản phẩm
    for (const sp of chiTiet) {
      const [rows] = await db.promise().query(
        'SELECT SUM(quantity) AS total FROM product_details WHERE product_code = ?',
        [sp.product_code]
      );
      const total = rows[0]?.total || 0;
      if (total < sp.quantity) {
        return res.status(400).json({
          message: `❌ Không đủ số lượng sản phẩm: ${sp.product_code}`
        });
      }
    }

    // 3. Trừ hàng từ nhiều lô (ưu tiên ít số lượng trước, location tăng dần số)
    for (const sp of chiTiet) {
      let remaining = sp.quantity;

      const [lots] = await db.promise().query(
        `SELECT id, warehouse_area_id, location, quantity 
         FROM product_details 
         WHERE product_code = ? AND quantity > 0 
         ORDER BY quantity ASC, warehouse_area_id ASC, CAST(SUBSTRING(location, 2) AS UNSIGNED) ASC`,
        [sp.product_code]
      );

      for (const lot of lots) {
        if (remaining <= 0) break;

        const deduct = Math.min(lot.quantity, remaining);

        // Trừ hàng trong kho
        await db.promise().query(
          'UPDATE product_details SET quantity = quantity - ? WHERE id = ?',
          [deduct, lot.id]
        );

        // Ghi log trừ hàng
        const palletName = `KV${lot.warehouse_area_id}__${lot.location || '??'}`;
        await db.promise().query(
          `INSERT INTO inventory_deduction_logs (product_code, pallet_name, quantity_deducted, goods_issue_receipt_id)
           VALUES (?, ?, ?, ?)`,
          [sp.product_code, palletName, deduct, id]
        );

        remaining -= deduct;
      }
    }

    // 4. Cập nhật trạng thái phiếu
    await db.promise().query(
      'UPDATE goods_issue_receipts SET status = "Đã xuất hàng khỏi kho" WHERE id = ?',
      [id]
    );

    res.json({ message: '✔️ Xác nhận xuất kho thành công!' });
  } catch (err) {
    console.error('❌ Lỗi xác nhận xuất kho:', err);
    res.status(500).json({
      message: 'Lỗi hệ thống khi xác nhận xuất kho.',
      error: err.message || err
    });
  }
};

exports.put__api_phieu_nhap_id_xuat_hoa_don = (req, res) => {
  const id = req.params.id;

  const sql = 'UPDATE goods_receipts SET invoice_issued = 1 WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi cập nhật invoice_issued:', err);
      return res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái hóa đơn.' });
    }

    res.json({ success: true, message: '✅ Đã cập nhật trạng thái xuất hóa đơn.' });
  });
};

exports.put__api_phieu_xuat_id_xuat_hoa_don = (req, res) => {
  const id = req.params.id;

  const sql = 'UPDATE goods_issue_receipts SET invoice_issued = 1 WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi cập nhật invoice_issued (phiếu xuất):', err);
      return res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái hóa đơn (phiếu xuất).' });
    }

    res.json({ success: true, message: '✅ Đã cập nhật trạng thái xuất hóa đơn (phiếu xuất).' });
  });
};

exports.get__api_hoa_don = (req, res) => {
  const nhapQuery = `
    SELECT pnk.*,
           CASE
             WHEN pnk.logo_url LIKE 'http%' THEN pnk.logo_url
             WHEN pnk.logo_url IS NOT NULL THEN CONCAT('http://localhost:3000', pnk.logo_url)
             ELSE NULL
           END AS logo_url,
           TRIM(IFNULL(pnk.status, 'Đã gửi phiếu')) AS trang_thai,
           pnk.created_at AS created_date,
           pnk.admin_note AS note_admin,
           'Phiếu nhập kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM goods_receipts pnk
    LEFT JOIN user_info ui ON pnk.user_id = ui.user_id
  `;

  const xuatQuery = `
    SELECT pxk.*,
           TRIM(IFNULL(pxk.status, 'Đã gửi phiếu')) AS trang_thai,
           pxk.created_at AS created_date,
           pxk.admin_note AS note_admin,
           'Phiếu xuất kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM goods_issue_receipts pxk
    LEFT JOIN user_info ui ON pxk.user_id = ui.user_id
  `;

  db.query(nhapQuery, async (err1, nhapList) => {
    if (err1) {
      console.error('❌ Lỗi truy vấn phiếu nhập:', err1);
      return res.status(500).json({ message: 'Lỗi lấy phiếu nhập' });
    }

    try {
      const nhapWithDetails = await Promise.all(
        nhapList.map((pnk) => {
          return new Promise((resolve, reject) => {
            db.query(
              `SELECT * FROM goods_receipt_items WHERE goods_receipt_id = ?`,
              [pnk.id],
              (err, products) => {
                if (err) return reject(err);
                pnk.products = products;
                resolve(pnk);
              }
            );
          });
        })
      );

      db.query(xuatQuery, async (err2, xuatList) => {
        if (err2) {
          console.error('❌ Lỗi truy vấn phiếu xuất:', err2);
          return res.status(500).json({ message: 'Lỗi lấy phiếu xuất' });
        }

        try {
          const xuatWithDetails = await Promise.all(
            xuatList.map((pxk) => {
              return new Promise((resolve, reject) => {
                db.query(
                  `SELECT * FROM goods_issue_items WHERE goods_issue_receipt_id = ?`,
                  [pxk.id],
                  (err, products) => {
                    if (err) return reject(err);
                    pxk.products = products;
                    pxk.payment = null; // bỏ thanh toán
                    resolve(pxk);
                  }
                );
              });
            })
          );

          const hoaDonTong = [...nhapWithDetails, ...xuatWithDetails].sort((a, b) => {
            const dateA = new Date(a.created_at || a.created_at);
            const dateB = new Date(b.created_at || b.created_at);
            return dateB - dateA || b.id - a.id;
          });

          res.json(hoaDonTong);
        } catch (error) {
          console.error('❌ Lỗi tổng hợp chi tiết phiếu xuất:', error);
          res.status(500).json({ message: 'Lỗi tổng hợp phiếu xuất' });
        }
      });
    } catch (err) {
      console.error('❌ Lỗi tổng hợp chi tiết phiếu nhập:', err);
      res.status(500).json({ message: 'Lỗi tổng hợp phiếu nhập' });
    }
  });
};

exports.get__api_tong_phieu_nhap_xuat = (req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM goods_receipts) AS tong_phieu_nhap,
      (SELECT COUNT(*) FROM goods_issue_receipts) AS tong_phieu_xuat
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn tổng phiếu nhập xuất:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn tổng phiếu nhập xuất' });
    }
    res.json(results[0]);
  });
};

exports.put__api_phieu_nhap_kho_id_huy = (req, res) => {
  const id = req.params.id;

  // Câu SQL update trạng thái phiếu sang 'Đã hủy'
  const sql = 'UPDATE goods_receipts SET status = ? WHERE id = ?';

  db.query(sql, ['Đã hủy', id], (err, result) => {
    if (err) {
      console.error('Lỗi khi cập nhật trạng thái hủy phiếu:', err);
      return res.status(500).json({ error: 'Lỗi server khi hủy phiếu' });
    }

    if (result.affectedRows === 0) {
      // Không tìm thấy phiếu có id tương ứng
      return res.status(404).json({ error: 'Không tìm thấy phiếu để hủy' });
    }

    // Thành công
    res.json({ message: 'Hủy phiếu thành công' });
  });
};

exports.put__api_phieu_xuat_kho_id_huy = (req, res) => {
  const id = req.params.id;
  const sql = 'UPDATE goods_issue_receipts SET status = ? WHERE id = ?';

  db.query(sql, ['Đã hủy', id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Lỗi server khi hủy phiếu' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu để hủy' });
    }
    res.json({ message: 'Hủy phiếu thành công' });
  });
};
