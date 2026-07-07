const db = require('../config/db');
const ProductService = {
  calculateWeightPerUnit(weight, quantity) {
    if (quantity > 0) return weight / quantity;
    return 0;
  },
  calculateAreaPerUnit(area, quantity) {
    if (quantity > 0) return area / quantity;
    return 0;
  },
  async generateNextLocation(khu_vuc_id, dbPromise) {
    if (!khu_vuc_id) return null;
    const prefix = `KV${khu_vuc_id}_L`;
    const [rows] = await dbPromise.query(
      `SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(location, 'L', -1) AS UNSIGNED)), 0) as maxNum
       FROM product_details WHERE warehouse_area_id = ?`,
      [khu_vuc_id]
    );
    const maxNum = rows[0].maxNum || 0;
    return prefix + String(maxNum + 1).padStart(3, '0');
  },
  async aggregateProductTotal(product, dbPromise) {
    const aggregateQuery = `
      INSERT INTO products (
          product_code, product_name, product_type, unit, image_url,
          total_quantity, total_weight, total_area
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
          product_name = VALUES(product_name),
          product_type = VALUES(product_type),
          unit = VALUES(unit),
          image_url = VALUES(image_url),
          total_quantity = total_quantity + VALUES(total_quantity),
          total_weight = total_weight + VALUES(total_weight),
          total_area = total_area + VALUES(total_area)
    `;
    await dbPromise.query(aggregateQuery, [
      product.product_code,
      product.product_name,
      product.product_type,
      product.unit,
      product.image_url,
      parseInt(product.quantity),
      parseFloat(product.weight),
      parseFloat(product.area || 0)
    ]);
  },
  async createProductDetail(product, dbInstance) {
    const dbPromise = dbInstance.promise();

    const weightPerUnit = this.calculateWeightPerUnit(parseFloat(product.weight), parseInt(product.quantity));
    const areaPerUnit = this.calculateAreaPerUnit(parseFloat(product.area || 0), parseInt(product.quantity));

    // Bắt đầu Transaction
    await dbPromise.beginTransaction();
    try {
      const khu_vuc_id = product.warehouse_area_id || product.khu_vuc_id;
      const location = product.location || await this.generateNextLocation(khu_vuc_id, dbPromise);

      const insertSql = `
        INSERT INTO product_details (
          product_code, product_name, product_type, unit, quantity, weight, area,
          manufacture_date, expiry_date, unit_price, total_price,
          warehouse_area_id, supplier_name, image_url, logo_url,
          old_product_code, receipt_code, location,
          weight_per_unit, area_per_unit
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        product.product_code, product.product_name, product.product_type, product.unit,
        parseInt(product.quantity), parseFloat(product.weight), parseFloat(product.area || 0),
        product.manufacture_date, product.expiry_date,
        parseFloat(product.unit_price), parseFloat(product.total_price),
        khu_vuc_id || null, product.supplier_name || '',
        product.image_url, product.logo_url,
        product.old_product_code || null, product.receipt_code || null, location,
        weightPerUnit, areaPerUnit
      ];

      await dbPromise.query(insertSql, params);
      await this.aggregateProductTotal(product, dbPromise);

      await dbPromise.commit();
      return { success: true };
    } catch (err) {
      await dbPromise.rollback();
      throw err;
    }
  }
};


module.exports = ProductService;
