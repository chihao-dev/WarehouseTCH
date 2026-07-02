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

exports.put__api_products_detail_id = (req, res) => {
  const { id } = req.params;
  const {
    product_code = '',
    product_name = '',
    product_type = '',
    unit = '',
    unit_price = 0,
    supplier_name = '',
    manufacture_date = null,
    expiry_date = null
  } = req.body;

  const BASE_URL = 'http://localhost:3000';

  // Lấy URL mới nếu upload, nếu không thì giữ URL cũ
  let imageUrl = req.body.image_url || '';
  let logoUrl = req.body.logo_url || '';

  if (req.files['image_url']?.[0]) {
    imageUrl = `${BASE_URL}/uploads/${req.files['image_url'][0].filename}`;
  } else if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${BASE_URL}${imageUrl}`;
  }

  if (req.files['logo_url']?.[0]) {
    logoUrl = `${BASE_URL}/uploads/${req.files['logo_url'][0].filename}`;
  } else if (logoUrl && !logoUrl.startsWith('http')) {
    logoUrl = `${BASE_URL}${logoUrl}`;
  }

  // 1️⃣ Cập nhật thông tin sản phẩm tổng (products)
  const sqlUpdateProduct = `
    UPDATE products
    SET product_name=?, product_type=?, unit=?, unit_price=?, supplier_name=?,
        image_url=?, logo_url=?, manufacture_date=?, expiry_date=?, updated_at=NOW()
    WHERE product_code=?
  `;

  db.query(sqlUpdateProduct, [
    product_name, product_type, unit, parseFloat(unit_price), supplier_name,
    imageUrl, logoUrl, manufacture_date, expiry_date, product_code
  ], (err) => {
    if (err) {
      console.error('❌ Lỗi cập nhật products:', err);
      return res.status(500).json({ error: 'Lỗi server khi cập nhật products' });
    }

    // 2️⃣ Rải thông tin NSX/HSD xuống tất cả product_details cùng product_code
    const sqlUpdateDetails = `
      UPDATE product_details
      SET product_name=?, product_type=?, unit=?, unit_price=?, supplier_name=?,
          image_url=?, logo_url=?, manufacture_date=?, expiry_date=?
      WHERE product_code=?
    `;

    db.query(sqlUpdateDetails, [
      product_name, product_type, unit, parseFloat(unit_price), supplier_name,
      imageUrl, logoUrl, manufacture_date, expiry_date, product_code
    ], (err2) => {
      if (err2) {
        console.error('❌ Lỗi cập nhật product_details:', err2);
        return res.status(500).json({ error: 'Lỗi server khi cập nhật product_details' });
      }

      res.json({
        message: '✅ Cập nhật thành công! Đã đồng bộ NSX/HSD từ products xuống product_details',
        image_url: imageUrl,
        logo_url: logoUrl
      });
    });
  });
};

exports.get__api_products_detail_check_ma_code = (req, res) => {
  const code = req.params.code;

  db.query('SELECT * FROM product_details WHERE product_code = ?', [code], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (results.length === 0) {
      return res.json({ exists: false });
    }

    const tong = results.reduce((acc, sp, index) => {
      const quantity = Number(sp.quantity) || 0;
      const weightPerUnit = Number(sp.weight_per_unit) || 0;
      const areaPerUnit = Number(sp.area_per_unit) || 0;
      const unitPrice = Number(sp.unit_price) || 0;

      acc.quantity += quantity;
      acc.total_weight += quantity * weightPerUnit;
      acc.total_area += quantity * areaPerUnit;
      acc.total_price += quantity * unitPrice;

      if (index === 0) {
        acc.product_code = sp.product_code;
        acc.product_name = sp.product_name;
        acc.product_type = sp.product_type;
        acc.unit = sp.unit;
        acc.unit_price = unitPrice;
        acc.weight_per_unit = weightPerUnit;
        acc.area_per_unit = areaPerUnit;
        acc.image_url = sp.image_url;
        acc.manufacture_date = sp.manufacture_date;
        acc.expiry_date = sp.expiry_date;
        acc.supplier_name = sp.supplier_name;
        acc.supplier_logo = sp.supplier_logo;
      }

      return acc;
    }, {
      quantity: 0,
      total_weight: 0,
      total_area: 0,
      total_price: 0
    });

    res.json({ exists: true, product: tong });
  });
};

exports.post__api_products_detail_check_multiple = (req, res) => {
  const { ma_san_pham } = req.body;

  if (!Array.isArray(ma_san_pham) || ma_san_pham.length === 0) {
    return res.json({ duplicates: [] });
  }

  const placeholders = ma_san_pham.map(() => '?').join(',');
  db.query(`SELECT product_code FROM product_details WHERE product_code IN (${placeholders})`,
    ma_san_pham,
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Lỗi server' });
      const duplicates = results.map(r => r.product_code);
      res.json({ duplicates });
    });
};

exports.post__api_nhap_kho = (req, res) => {
  const { danh_sach_san_pham } = req.body;

  if (!Array.isArray(danh_sach_san_pham) || danh_sach_san_pham.length === 0) {
    return res.status(400).json({ message: 'Không có sản phẩm để lưu' });
  }

  let processed = 0;
  const total = danh_sach_san_pham.length;

  for (let sp of danh_sach_san_pham) {
    const oldCode = sp.old_product_code || sp.product_code;

    // Nếu người dùng bật "Cập nhật thêm" thì cũng thêm mới
    insertNewProduct(sp, (errInsert) => {
      if (errInsert) {
        console.error('❌ Lỗi khi thêm sản phẩm:', errInsert);
        return res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
      }

      processed++;
      if (processed === total) return res.json({ message: '📦 Nhập kho hoàn tất!' });
    });
  }

  // ✅ Hàm insert mới sử dụng Service để tính toán và lưu DB
  async function insertNewProduct(sp, callback) {
    try {
      await ProductService.createProductDetail(sp, db);
      callback(null);
    } catch (errInsert) {
      callback(errInsert);
    }
  }
};

exports.get__api_products_detail_by_code_code = (req, res) => {
  const productCode = req.params.code;

  const query = `
    SELECT 
      pd.id,
      pd.product_code,
      pd.old_product_code,
      pd.product_name,
      pd.product_type,
      pd.unit,
      pd.image_url,
      pd.weight_per_unit,
      pd.area_per_unit,
      pd.unit_price,
      pd.manufacture_date,
      pd.expiry_date,
      pd.supplier_name,
      pd.logo_url,
      pd.location,
      pd.warehouse_area_id,
      kv.area_name,

      -- Thông tin đại diện từ bảng phiếu nhập
      pnk.supplier_address,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone

    FROM product_details pd
    LEFT JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
    LEFT JOIN goods_receipts pnk ON pd.receipt_code = pnk.receipt_code

    WHERE pd.product_code = ?
    ORDER BY pd.location ASC
    LIMIT 1
  `;

  db.query(query, [productCode], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn CSDL' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json(results[0]); // Trả về 1 sản phẩm (object) kèm thông tin đại diện
  });
};

exports.get__api_products_detail_filter = (req, res) => {
  const {
    keyword = '',
    product_type,
    warehouse_area_id,
    fromDate,
    toDate,
    minPrice,
    maxPrice
  } = req.query;

  let sql = `
    SELECT 
      pd.product_code,
      MAX(pd.product_name) AS product_name,
      MAX(pd.product_type) AS product_type,
      MAX(pd.image_url) AS image_url,
      MAX(pd.unit) AS unit,
      SUM(pd.quantity) AS quantity,
      SUM(pd.weight) AS weight,
      SUM(pd.area) AS area,
      MAX(pd.weight_per_unit) AS weight_per_unit,         -- ✅ thêm dòng này
      MAX(pd.manufacture_date) AS manufacture_date,
      MAX(pd.expiry_date) AS expiry_date,
      MAX(pd.unit_price) AS unit_price,
      SUM(pd.total_price) AS total_price,
      MAX(pd.warehouse_area_id) AS warehouse_area_id,
      MAX(kv.area_name) AS area_name,
      MAX(pd.supplier_name) AS supplier_name,
      MAX(pd.logo_url) AS logo_url,
      MAX(pd.import_date) AS import_date,
      MAX(pd.location) AS location,         -- ✅ THÊM DÒNG NÀY
      MAX(pd.id) AS id
    FROM product_details pd
    JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
    WHERE 1 = 1
  `;

  const params = [];

  if (keyword) {
    const isNumeric = /^\d+$/.test(keyword);
    if (isNumeric) {
      sql += ` AND pd.product_code = ?`;
      params.push(keyword);
    } else {
      sql += ` AND (pd.product_code = ? OR pd.product_name LIKE ?)`;
      params.push(keyword, `%${keyword}%`);
    }
  }

  if (product_type) {
    sql += ` AND pd.product_type = ?`;
    params.push(product_type);
  }

  if (warehouse_area_id) {
    sql += ` AND pd.warehouse_area_id = ?`;
    params.push(warehouse_area_id);
  }

  if (fromDate) {
    sql += ` AND pd.import_date >= ?`;
    params.push(fromDate);
  }

  if (toDate) {
    sql += ` AND pd.import_date <= ?`;
    params.push(toDate);
  }

  if (minPrice) {
    sql += ` AND pd.total_price >= ?`;
    params.push(minPrice);
  }

  if (maxPrice) {
    sql += ` AND pd.total_price <= ?`;
    params.push(maxPrice);
  }

  // 👉 GROUP BY để gộp sản phẩm theo mã
  sql += `
    GROUP BY pd.product_code
    ORDER BY MAX(pd.import_date) DESC, MAX(pd.id) DESC
  `;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn', error: err });
    }
    res.json(results);
  });
};

exports.get__api_products_detail_types = (req, res) => {
  const { warehouse_area_id } = req.query;

  let sql = `
    SELECT DISTINCT product_type 
    FROM product_details 
    WHERE product_type IS NOT NULL
  `;
  const params = [];

  // Nếu có warehouse_area_id thì lọc theo khu
  if (warehouse_area_id) {
    sql += ` AND warehouse_area_id = ?`;
    params.push(warehouse_area_id);
  }

  sql += ` ORDER BY product_type ASC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn loại hàng', error: err });
    res.json(results.map(row => row.product_type));
  });
};

exports.post__api_products_detail = (req, res) => {
  const sp = req.body;

  // Chuẩn hóa đường dẫn ảnh
  const normalizePath = file =>
    file?.path ? `http://localhost:3000/uploads/${path.basename(file.path)}` : null;

  const image_url = normalizePath(req.files?.image?.[0]) || sp.image_url || 'http://localhost:3000/uploads/default.png';
  const logo_url = normalizePath(req.files?.logo?.[0]) || sp.logo_url || 'http://localhost:3000/uploads/logogpt.png';

  // ======= Kiểm tra dữ liệu hợp lệ =======
  const requiredFields = ['product_code', 'product_name', 'product_type', 'unit', 'quantity', 'unit_price', 'weight', 'area', 'manufacture_date', 'expiry_date'];
  for (let field of requiredFields) {
    if (!sp[field] || sp[field].toString().trim() === '') {
      return res.status(400).json({ error: `⚠️ Trường '${field}' không được để trống.` });
    }
  }

  const numericFields = ['quantity', 'unit_price', 'weight', 'area'];
  for (let field of numericFields) {
    const val = parseFloat(sp[field]);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: `⚠️ '${field}' phải là số lớn hơn 0.` });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nsx = new Date(sp.manufacture_date);
  const hsd = new Date(sp.expiry_date);

  if (isNaN(nsx) || isNaN(hsd)) {
    return res.status(400).json({ error: '⚠️ Ngày sản xuất hoặc hạn sử dụng không hợp lệ.' });
  }

  if (nsx >= today) {
    return res.status(400).json({ error: '⚠️ Ngày sản xuất phải trước ngày hôm nay.' });
  }

  if (hsd <= today) {
    return res.status(400).json({ error: '⚠️ Hạn sử dụng phải sau ngày hôm nay.' });
  }

  if (nsx >= hsd) {
    return res.status(400).json({ error: '⚠️ Ngày sản xuất phải trước hạn sử dụng.' });
  }

  // ======= Kiểm tra trùng mã sản phẩm =======
  const checkSql = 'SELECT COUNT(*) AS count FROM product_details WHERE product_code = ?';
  db.query(checkSql, [sp.product_code], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('❌ Lỗi kiểm tra trùng mã:', checkErr);
      return res.status(500).json({ error: 'Lỗi kiểm tra trùng mã sản phẩm' });
    }

    if (checkResult[0].count > 0) {
      return res.status(400).json({ error: '⚠️ Mã sản phẩm đã tồn tại, vui lòng dùng mã khác!' });
    }

    // ======= Chèn dữ liệu =======
    const total_price = parseFloat(sp.unit_price) * parseFloat(sp.quantity);

    const productPayload = {
      product_code: sp.product_code,
      product_name: sp.product_name,
      product_type: sp.product_type,
      unit: sp.unit,
      quantity: sp.quantity,
      weight: sp.weight,
      area: sp.area,
      manufacture_date: sp.manufacture_date.split('T')[0],
      expiry_date: sp.expiry_date.split('T')[0],
      unit_price: sp.unit_price,
      total_price: total_price,
      warehouse_area_id: sp.warehouse_area_id,
      supplier_name: sp.supplier_name,
      image_url: image_url,
      logo_url: logo_url
    };

    ProductService.createProductDetail(productPayload, db)
      .then(() => {
        res.json({ message: '✅ Thêm sản phẩm thành công!' });
      })
      .catch((insertErr) => {
        console.error('❌ Lỗi thêm sản phẩm:', insertErr.message || insertErr.sqlMessage);
        res.status(500).json({ error: 'Lỗi thêm sản phẩm' });
      });
  });
};

exports.delete__api_products_detail_xoa_theo_ma_product_code = (req, res) => {
  const productCode = req.params.product_code;

  const sql = 'DELETE FROM product_details WHERE product_code = ?';

  db.query(sql, [productCode], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi xoá sản phẩm theo mã:', err);
      return res.status(500).json({ error: 'Lỗi khi xoá sản phẩm theo mã' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xoá' });
    }

    res.json({ message: '✅ Đã xoá toàn bộ sản phẩm thành công!' });
  });
};

exports.put__api_products_id = (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) {
    return res.status(400).json({ message: 'ID không hợp lệ' });
  }

  const BASE_URL = 'http://localhost:3000';
  let { product_name, product_code, product_type, unit, image_url, logo_url } = req.body;

  // ✅ Nếu upload mới thì lấy file mới
  if (req.files?.image?.[0]) {
    image_url = `${BASE_URL}/uploads/${req.files.image[0].filename}`;
  }
  if (req.files?.logo?.[0]) {
    logo_url = `${BASE_URL}/uploads/${req.files.logo[0].filename}`;
  }

  // ✅ Nếu vẫn giữ ảnh cũ nhưng chỉ là đường dẫn tương đối => chuyển thành full URL
  if (image_url && !image_url.startsWith('http')) {
    image_url = `${BASE_URL}${image_url}`;
  }
  if (logo_url && !logo_url.startsWith('http')) {
    logo_url = `${BASE_URL}${logo_url}`;
  }

  const sql = `
    UPDATE products
    SET product_name=?, product_code=?, product_type=?, unit=?, image_url=?, logo_url=?, updated_at=NOW()
    WHERE id=?
  `;

  db.query(sql, [product_name, product_code, product_type, unit, image_url, logo_url, productId], (err, result) => {
    if (err) {
      console.error('❌ Lỗi SQL:', err);
      return res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json({ message: '✅ Cập nhật thành công' });
  });
};

exports.get__api_products_detail_check_available_code_required = async (req, res) => {
  const { code, required } = req.params;
  const requiredQty = parseInt(required);

  try {
    // Tính tổng tất cả số lượng tồn (bao gồm hết hạn)
    const [allLots] = await db.promise().query(
      'SELECT SUM(quantity) AS total_quantity FROM product_details WHERE product_code = ?',
      [code]
    );
    const totalAll = allLots[0].total_quantity || 0;

    // Tính tổng chỉ các lô còn hạn sử dụng
    const [validLots] = await db.promise().query(
      `SELECT SUM(quantity) AS total_quantity 
       FROM product_details 
       WHERE product_code = ? 
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
      [code]
    );
    const totalValid = validLots[0].total_quantity || 0;

    // ✅ Nếu có hàng nhưng tất cả đều hết hạn
    if (totalAll > 0 && totalValid === 0) {
      return res.json({
        product_code: code,
        expired_only: true,
        message: `⚠ Sản phẩm ${code} có hàng nhưng toàn bộ đã hết hạn.`
      });
    }

    // ✅ Nếu còn hạn nhưng không đủ để xuất
    if (totalValid < requiredQty) {
      return res.json({
        product_code: code,
        not_enough_valid: true,
        valid_quantity: totalValid,
        required: requiredQty,
        message: `⚠ Chỉ còn ${totalValid} sản phẩm ${code} còn hạn, không đủ để xuất ${requiredQty}.`
      });
    }

    // ✅ Còn hạn và đủ số lượng
    res.json({
      product_code: code,
      enough: true,
      valid_quantity: totalValid,
      required: requiredQty,
      message: `✅ Đủ số lượng hợp lệ để xuất.`
    });

  } catch (err) {
    console.error('❌ Lỗi truy vấn kiểm tra số lượng:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

exports.get__api_kho_overview = (req, res) => {
  const query1 = `SELECT * FROM warehouse_capacity`;
  const query2 = `SELECT * FROM warehouse_areas ORDER BY warehouse_area_id`;

  db.query(query1, (err1, result1) => {
    if (err1) {
      console.error('❌ Lỗi query view 1:', err1);
      return res.status(500).json({ message: 'Lỗi khi lấy tổng sức chứa kho', error: err1 });
    }

    db.query(query2, (err2, result2) => {
      if (err2) {
        console.error('❌ Lỗi query view 2:', err2);
        return res.status(500).json({ message: 'Lỗi khi lấy thống kê khu vực', error: err2 });
      }

      return res.json({
        overview: result1[0],
        areas: result2
      });
    });
  });
};

exports.get__api_kho_area_khuvucId = (req, res) => {
  const khuId = parseInt(req.params.khuvucId);
  if (isNaN(khuId)) return res.status(400).json({ message: 'warehouse_area_id không hợp lệ' });

  const excludeProductCode = req.query.excludeProductCode || null;
  const prefix = `KV${khuId}_L`;

  const sql = `
    SELECT 
      location,
      product_code,
      quantity * weight_per_unit AS total_weight,
      quantity * area_per_unit AS total_area
    FROM product_details
    WHERE warehouse_area_id = ?
    ORDER BY location ASC
  `;

  db.query(sql, [khuId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Lỗi khi truy vấn pallet' });

    const fullPallets = [];
    for (let i = 1; i <= 100; i++) {
      const code = prefix + String(i).padStart(3, '0');
      const rows = result.filter(r => r.location === code);

      let weightUsed = 0;
      let areaUsed = 0;
      const products = {};

      for (const r of rows) {
        products[r.product_code] = r.total_weight;
        // Trừ đi sản phẩm đang cập nhật
        if (excludeProductCode && r.product_code === excludeProductCode) continue;
        weightUsed += r.total_weight;
        areaUsed += r.total_area;
      }

      fullPallets.push({
        name: code,
        weightUsed: Math.round(weightUsed),
        areaUsed: Number(areaUsed.toFixed(1)),
        products
      });
    }

    res.json(fullPallets);
  });
};

exports.get__api_kho_pallet_location = (req, res) => {
  const location = req.params.location;

  const sql1 = `
    SELECT * 
    FROM product_details 
    WHERE location = ? AND quantity > 0
  `;

  db.query(sql1, [location], (err1, results1) => {
    if (err1 || results1.length === 0) {
      console.error('❌ Lỗi truy vấn pallet:', err1);
      return res.status(500).json({ message: 'Không tìm thấy pallet hoặc không còn sản phẩm nào' });
    }

    // Duyệt từng sản phẩm, tìm location khác tương ứng
    const promises = results1.map((product) => {
      return new Promise((resolve, reject) => {
        const sql2 = `
          SELECT location 
          FROM product_details
          WHERE product_code = ? AND location != ? AND quantity > 0
          ORDER BY location ASC
        `;

        db.query(sql2, [product.product_code, location], (err2, locs) => {
          if (err2) return reject(err2);
          resolve({
            product,
            otherLocations: locs.map(l => l.location)
          });
        });
      });
    });

    Promise.all(promises)
      .then((finalList) => {
        res.json({ products: finalList });
      })
      .catch((err) => {
        console.error('❌ Lỗi truy vấn location:', err);
        res.status(500).json({ message: 'Lỗi khi truy vấn vị trí khác' });
      });
  });
};

exports.get__api_products_detail_all_by_code_code = (req, res) => {
  const productCode = req.params.code;

  const query = `
    SELECT 
      pd.id,
      pd.product_code,
      pd.old_product_code,
      pd.product_name,
      pd.product_type,
      pd.unit,
      pd.image_url,
      pd.weight_per_unit,
      pd.area_per_unit,
      pd.unit_price,
      pd.manufacture_date,
      pd.expiry_date,
      pd.quantity,
      pd.location,
      pd.warehouse_area_id,
      kv.area_name,
      
      -- Thông tin NCC
      pd.supplier_name,
      pd.logo_url,

      -- Thông tin đại diện từ phiếu nhập
      pnk.supplier_address,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone

    FROM product_details pd
    LEFT JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
    LEFT JOIN goods_receipts pnk ON pd.receipt_code = pnk.receipt_code

    WHERE pd.product_code = ?
    ORDER BY pd.location ASC
  `;

  db.query(query, [productCode], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn danh sách sản phẩm:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn CSDL' });
    }

    res.json(results);
  });
};

exports.get__api_products_detail_kha_dung_location_productId = async (req, res) => {
  const { location, productId } = req.params;

  try {
    const [rows] = await db.promise().query(`
      SELECT 
        SUM(quantity * weight_per_unit) AS used_weight
      FROM product_details
      WHERE location = ?
    `, [location]);

    const used = rows[0]?.used_weight || 0;
    const maxWeight = 500;

    // Lấy trọng lượng mỗi đơn vị của dòng sản phẩm cần cập nhật
    const [prodRows] = await db.promise().query(`
      SELECT weight_per_unit FROM product_details WHERE id = ?
    `, [productId]);

    if (!prodRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    const weightPerUnit = prodRows[0].weight_per_unit || 0;
    const remaining = Math.max(0, maxWeight - used);

    const maxQuantityCanAdd = weightPerUnit > 0 ? Math.floor(remaining / weightPerUnit) : 0;

    res.json({
      used_weight: used,
      remaining_weight: remaining,
      weight_per_unit: weightPerUnit,
      max_quantity_can_add: maxQuantityCanAdd
    });
  } catch (err) {
    console.error('❌ Lỗi khi tính khối lượng khả dụng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi kiểm tra sức chứa' });
  }
};

exports.post__api_kho_chuyen_pallet = (req, res) => {
  const { products, from, to, user_email } = req.body;

  if (!products?.length || !from || !to || !user_email)
    return res.status(400).json({ message: "Thiếu thông tin" });

  const updates = products.map(prod => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE product_details SET location = ? WHERE id = ?`;
      db.query(sql, [to, prod.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  Promise.all(updates)
    .then(() => {
      const logSql = `INSERT INTO location_transfer_log (product_code, from_location, to_location, user_email, transfer_time)
                      VALUES ?`;
      const values = products.map(p => [p.product_code, from, to, user_email, new Date()]);
      db.query(logSql, [values], (err2) => {
        if (err2) console.error('❌ Ghi log lỗi:', err2);
      });
      res.json({ message: "Chuyển hàng thành công" });
    })
    .catch(err => {
      console.error("❌ Lỗi chuyển:", err);
      res.status(500).json({ message: "Lỗi chuyển pallet" });
    });
};

exports.get__api_kho_transfer_log = (req, res) => {
  const email = req.query.email;
  db.query(
    'SELECT * FROM location_transfer_log WHERE user_email = ? ORDER BY transfer_time DESC',
    [email],
    (err, results) => {
      if (err) {
        console.error("❌ Lỗi truy vấn log:", err);
        return res.status(500).json({ message: 'Lỗi truy vấn log' });
      }
      res.json(results);
    }
  );
};

exports.get__api_products_detail = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        product_code, 
        product_name,
        product_type, 
        unit,
        SUM(quantity) AS total_quantity,
        weight_per_unit
      FROM product_details
      GROUP BY product_code, product_name, product_type, unit, weight_per_unit
      ORDER BY product_code ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Lỗi truy vấn product_details:', err);
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu sản phẩm tồn kho' });
  }
};

exports.get__api_products_detail_batch_list_code = (req, res) => {
  const code = req.params.code;
  const sql = `
    SELECT location, quantity, import_date, kv.area_name
    FROM product_details pd
    JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
    WHERE pd.product_code = ? AND pd.quantity > 0
    ORDER BY import_date DESC
  `;
  db.query(sql, [code], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn /batch-list:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn', error: err });
    }
    res.json(rows);
  });
};

exports.get__api_products_detail_with_deducted = async (req, res) => {
  try {
    const [products] = await db.promise().query(`
      SELECT 
        pd.product_code,
        MAX(pd.product_name) AS product_name,
        MAX(pd.product_type) AS product_type,
        MAX(pd.image_url) AS image_url,
        MAX(pd.unit) AS unit,
        SUM(pd.quantity) AS quantity,
        MAX(pd.expiry_date) AS expiry_date,
        MAX(pd.manufacture_date) AS manufacture_date,  -- ✅ Thêm dòng này
        MAX(pd.unit_price) AS unit_price,
        MAX(pd.warehouse_area_id) AS warehouse_area_id,
        MAX(kv.area_name) AS area_name,
        MAX(pd.id) AS id,
        MAX(CASE WHEN pd.is_checking = 1 THEN 1 ELSE 0 END) AS is_checking,

        MAX(kkl.actual_quantity) AS soLuongThucTe,
        MAX(kkl.checked_by_email) AS emailNhanVien,
        MAX(kkl.note) AS ghiChuKiemKe

      FROM product_details pd
      JOIN warehouse_areas kv ON pd.warehouse_area_id = kv.id
      LEFT JOIN (
        SELECT kk.*
        FROM inventory_audit_items kk
        JOIN (
          SELECT product_detail_id, MAX(checked_at) AS max_checked_at
          FROM inventory_audit_items
          WHERE checked_at IS NOT NULL
          GROUP BY product_detail_id
        ) latest ON latest.product_detail_id = kk.product_detail_id AND latest.max_checked_at = kk.checked_at
      ) kkl ON kkl.product_detail_id = pd.id
      GROUP BY pd.product_code
    `);

    const [logs] = await db.promise().query(`
      SELECT product_code, SUM(quantity_deducted) AS total_deducted
      FROM inventory_deduction_logs
      GROUP BY product_code
    `);

    const [receiptCounts] = await db.promise().query(`
      SELECT 
        lh.product_code, 
        COUNT(DISTINCT px.receipt_code) AS total_receipts
      FROM inventory_deduction_logs lh
      JOIN goods_issue_receipts px ON lh.goods_issue_receipt_id = px.id
      GROUP BY lh.product_code
    `);

    const logMap = {}, receiptMap = {};
    logs.forEach(log => {
      logMap[log.product_code] = log.total_deducted;
    });
    receiptCounts.forEach(rc => {
      receiptMap[rc.product_code] = rc.total_receipts;
    });

    const result = products.map(p => ({
      ...p,
      total_deducted: logMap[p.product_code] || 0,
      total_receipts: receiptMap[p.product_code] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ Lỗi lấy dữ liệu hàng tồn:', err);
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu hàng tồn' });
  }
};

exports.post__api_products_detail_by_codes = (req, res) => {
  const { productCodes } = req.body;

  if (!Array.isArray(productCodes) || productCodes.length === 0) {
    return res.status(400).json({ error: 'Danh sách mã sản phẩm không hợp lệ' });
  }

  const placeholders = productCodes.map(() => '?').join(',');
  const sql = `SELECT id, product_code FROM product_details WHERE product_code IN (${placeholders})`;

  db.query(sql, productCodes, (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn product_detail:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    res.json(rows); // Trả về danh sách id và product_code tương ứng
  });
};

exports.get__api_products_detail_sap_het = (req, res) => {
  const sql = `
    SELECT * FROM product_details 
    WHERE quantity <= 100 
    ORDER BY quantity ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn sản phẩm sắp hết:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn sản phẩm sắp hết' });
    }
    res.json(results);
  });
};

exports.get__api_products_detail_sap_het_han = (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Lấy ngày hiện tại theo định dạng YYYY-MM-DD
  const sql = `
    SELECT * FROM product_details 
    WHERE expiry_date IS NOT NULL
    AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY expiry_date ASC
  `;

  db.query(sql, [today], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn sản phẩm sắp hết hạn:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn sản phẩm sắp hết hạn' });
    }
    res.json(results);
  });
};

exports.get__api_products_detail_kha_dung_location_id = (req, res) => {
  const location = req.params.location;
  const id = req.params.id;

  // Truy vấn lấy toàn bộ sản phẩm cùng location
  db.query(`SELECT id, quantity, weight_per_unit FROM product_details WHERE location = ?`, [location], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '❌ Lỗi truy vấn sản phẩm tại vị trí này' });
    }

    let totalWeight = 0;
    let currentProductWeightPerUnit = 0;
    let currentProductOldQuantity = 0;

    for (const row of rows) {
      if (row.id == id) {
        currentProductWeightPerUnit = row.weight_per_unit;
        currentProductOldQuantity = row.quantity;
      }
      totalWeight += row.quantity * row.weight_per_unit;
    }

    if (currentProductWeightPerUnit === 0) {
      return res.status(404).json({ error: '⚠️ Không tìm thấy sản phẩm đang cập nhật' });
    }

    const maxWeight = 500;

    // Tổng khối lượng hiện tại của tất cả các sản phẩm ở vị trí này ngoại trừ sản phẩm đang được cập nhật
    const weightOfOtherProducts = totalWeight - (currentProductOldQuantity * currentProductWeightPerUnit);

    const remainingWeight = maxWeight - weightOfOtherProducts;

    const max_quantity_can_add = Math.floor(remainingWeight / currentProductWeightPerUnit);

    res.json({ max_quantity_can_add });
  });
};

exports.put__api_products_detail_update_quantity_id = async (req, res) => {
  const id = req.params.id;
  const quantity = parseInt(req.body.quantity);

  console.log('📦 Dữ liệu nhận được:', req.body);

  if (isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ message: '❌ Số lượng không hợp lệ!' });
  }

  try {
    // 1. Lấy thông tin sản phẩm hiện tại
    const [rows] = await db.promise().query(
      `SELECT product_code, location, weight_per_unit, unit_price, area_per_unit, quantity 
       FROM product_details WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '❌ Không tìm thấy sản phẩm!' });
    }

    const { product_code, location, weight_per_unit, unit_price, area_per_unit, quantity: oldQuantity } = rows[0];
    const newWeight = quantity * weight_per_unit;

    // 2. Nếu số lượng tăng thì kiểm tra giới hạn khối lượng
    if (quantity > oldQuantity) {
      const [sumRows] = await db.promise().query(
        `SELECT SUM(quantity * weight_per_unit) AS total_other_weight 
         FROM product_details WHERE location = ? AND id != ?`,
        [location, id]
      );
      const totalOthers = sumRows[0]?.total_other_weight || 0;
      const totalAfter = totalOthers + newWeight;

      if (totalAfter > KHOI_LUONG_PALLET_MAX) {
        const remaining = Math.max(0, KHOI_LUONG_PALLET_MAX - totalOthers);
        const max_quantity_can_add = Math.floor(remaining / weight_per_unit);
        return res.status(400).json({
          message: `❌ Tổng khối lượng vượt quá 500kg tại ${location}.`,
          max_quantity_can_add,
          remaining_weight: remaining
        });
      }
    }

    // 3. Cập nhật dòng sản phẩm
    const total_price = quantity * unit_price;
    await db.promise().query(
      `UPDATE product_details SET 
         quantity = ?, 
         weight = ?, 
         area = ?, 
         total_price = ?
       WHERE id = ?`,
      [quantity, newWeight, quantity * area_per_unit, total_price, id]
    );

    // 4. Tính tổng các dòng cùng mã sản phẩm
    const [allRows] = await db.promise().query(
      `SELECT quantity, weight_per_unit FROM product_details WHERE product_code = ?`,
      [product_code]
    );

    const total_quantity = allRows.reduce((sum, r) => sum + r.quantity, 0);
    const total_weight = allRows.reduce((sum, r) => sum + (r.quantity * r.weight_per_unit), 0);
    const total_area = total_weight * (5 / 500); // Giả định tỉ lệ diện tích theo khối lượng

    // 5. Cập nhật lại các dòng cùng product_code
    await db.promise().query(
      `UPDATE product_details 
       SET total_quantity = ?, total_weight = ?, total_area = ?
       WHERE product_code = ?`,
      [total_quantity, total_weight, total_area, product_code]
    );

    return res.json({
      message: '✅ Số lượng đã được cập nhật!',
      total_quantity,
      total_weight,
      total_area
    });

  } catch (err) {
    console.error('❌ Lỗi cập nhật:', err);
    return res.status(500).json({ message: '❌ Lỗi server khi cập nhật!' });
  }
};

exports.put__api_products_detail_distribute = (req, res) => {
  const { original_product_id, locations } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!original_product_id || !Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ message: 'Thiếu dữ liệu phân bổ' });
  }

  // Bắt đầu một transaction để đảm bảo toàn vẹn dữ liệu
  db.beginTransaction(err => {
    if (err) {
      return res.status(500).json({ message: 'Lỗi server', error: err });
    }

    // 1. Xóa hoặc cập nhật bản ghi gốc
    const sqlDeleteOriginal = 'DELETE FROM product_details WHERE id = ?';
    db.query(sqlDeleteOriginal, [original_product_id], (err, result) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ message: 'Lỗi xóa sản phẩm gốc', error: err });
        });
      }

      // 2. Thêm các bản ghi mới cho từng location
      const sqlInsertNew = `
                INSERT INTO product_details 
                (product_code, product_name, product_type, unit, image_url, quantity, weight, location, warehouse_area_id, receipt_code, supplier_name, ...) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ...);
            `;

      let completed = 0;
      locations.forEach(loc => {
        const params = [
          loc.product_code, // Cần gửi các thông tin này từ frontend
          loc.product_name,
          loc.product_type,
          loc.unit,
          loc.image_url,
          loc.quantity, // Số lượng đã tính toán cho location này
          loc.weight,   // Khối lượng đã tính toán cho location này
          loc.name,     // Tên location, ví dụ 'KV1_L015'
          loc.warehouse_area_id,
          loc.receipt_code,
          loc.supplier_name,
          // ... thêm các trường khác
        ];

        db.query(sqlInsertNew, params, (err, result) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: 'Lỗi thêm sản phẩm vào location mới', error: err });
            });
          }
          completed++;
          if (completed === locations.length) {
            // Nếu tất cả đã xong, commit transaction
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Lỗi commit transaction', error: err });
                });
              }
              res.json({ message: 'Phân bổ sản phẩm thành công!' });
            });
          }
        });
      });
    });
  });
};

