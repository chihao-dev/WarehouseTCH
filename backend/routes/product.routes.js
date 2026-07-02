const express = require('express');
const router = express.Router();
const controller = require('../controllers/product.controller');
const upload = require('../config/multer');
router.put('/api/products-detail/:id', upload.fields([
  { name: 'image_url', maxCount: 1 },
  { name: 'logo_url', maxCount: 1 }
]), controller.put__api_products_detail_id);
router.get('/api/products-detail/check-ma/:code', controller.get__api_products_detail_check_ma_code);
router.post('/api/products-detail/check-multiple', controller.post__api_products_detail_check_multiple);
router.post('/api/nhap-kho', controller.post__api_nhap_kho);
router.get('/api/products-detail/by-code/:code', controller.get__api_products_detail_by_code_code);
router.get('/api/products-detail/filter', controller.get__api_products_detail_filter);
router.get('/api/products-detail/types', controller.get__api_products_detail_types);
router.post('/api/products-detail', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), controller.post__api_products_detail);
router.delete('/api/products-detail/xoa-theo-ma/:product_code', controller.delete__api_products_detail_xoa_theo_ma_product_code);
router.put('/api/products/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), controller.put__api_products_id);
router.get('/api/products-detail/check-available/:code/:required', controller.get__api_products_detail_check_available_code_required);
router.get('/api/kho/overview', controller.get__api_kho_overview);
router.get('/api/kho/area/:khuvucId', controller.get__api_kho_area_khuvucId);
router.get('/api/kho/pallet/:location', controller.get__api_kho_pallet_location);
router.get('/api/products-detail/all-by-code/:code', controller.get__api_products_detail_all_by_code_code);
router.get('/api/products-detail/kha-dung/:location/:productId', controller.get__api_products_detail_kha_dung_location_productId);
router.post('/api/kho/chuyen-pallet', controller.post__api_kho_chuyen_pallet);
router.get('/api/kho/transfer-log', controller.get__api_kho_transfer_log);
router.get('/api/products-detail', controller.get__api_products_detail);
router.get('/api/products-detail/batch-list/:code', controller.get__api_products_detail_batch_list_code);
router.get('/api/products-detail/with-deducted', controller.get__api_products_detail_with_deducted);
router.post('/api/products-detail/by-codes', controller.post__api_products_detail_by_codes);
router.get('/api/products-detail/sap-het', controller.get__api_products_detail_sap_het);
router.get('/api/products-detail/sap-het-han', controller.get__api_products_detail_sap_het_han);
router.get('/api/products-detail/kha-dung/:location/:id', controller.get__api_products_detail_kha_dung_location_id);
router.put('/api/products-detail/update-quantity/:id', controller.put__api_products_detail_update_quantity_id);
router.put('/api/products-detail/distribute', controller.put__api_products_detail_distribute);
module.exports = router;
