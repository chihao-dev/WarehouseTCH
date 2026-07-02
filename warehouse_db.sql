-- CREATE DATABASE warehouse_db;
-- USE warehouse_db;;

-- Bảng tài khoản người dùng
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,

  role ENUM('user', 'admin', 'staff') DEFAULT 'user',
  status ENUM('active', 'inactive') DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10),
  address TEXT,
  phone VARCHAR(20),
  image_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



-- Bảng phiếu nhập kho (goods receipt)
CREATE TABLE goods_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_code VARCHAR(50) UNIQUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  supplier_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  supplier_address TEXT,

  -- Supplier representative
  representative_name VARCHAR(100),
  representative_email VARCHAR(100),
  representative_phone VARCHAR(20),

  user_id INT NOT NULL,
  total_amount DECIMAL(15,2) DEFAULT 0,

  meeting_date DATE,

  staff_account_name VARCHAR(100),
  staff_account_email VARCHAR(100),
  admin_account_name VARCHAR(100),
  admin_account_email VARCHAR(100),

  note TEXT,
  admin_note TEXT,

  -- Receipt status
  status ENUM(
    'Đã gửi phiếu', 
    'Đã duyệt', 
    'Đã nhập hàng vào kho', 
    'Đã hủy' 
  ) DEFAULT 'Đã gửi phiếu',

  invoice_issued BOOLEAN DEFAULT false,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bảng chi tiết phiếu nhập kho
CREATE TABLE goods_receipt_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  goods_receipt_id INT NOT NULL,

  item_no INT,                            -- Line number
  image_url TEXT,                         -- Product image

  product_name VARCHAR(255),              -- Product name
  product_type VARCHAR(100),              -- Product type
  product_code VARCHAR(100),              -- Product code

  unit VARCHAR(50),                       -- Unit
  weight DECIMAL(10,2),                   -- Weight
  area FLOAT DEFAULT 0,                   -- Area

  manufacture_date DATE,                  -- Manufacture date
  expiry_date DATE,                       -- Expiry date

  quantity INT,                           -- Quantity
  unit_price DECIMAL(15,2),               -- Unit price
  total_price DECIMAL(15,2),              -- Total price

  FOREIGN KEY (goods_receipt_id)
    REFERENCES goods_receipts(id)
    ON DELETE CASCADE
);


-- Bảng phiếu xuất kho (goods issue receipt)
CREATE TABLE goods_issue_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,              -- Auto-increment ID

  receipt_code VARCHAR(50) UNIQUE,                -- Issue receipt code
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  receiver_name VARCHAR(255) NOT NULL,            -- Receiver name
  receiver_address TEXT,                          -- Receiver address
  logo_url TEXT,                                  -- Receiver logo (optional)

  user_id INT NOT NULL,                           -- Created by user
  total_amount DECIMAL(15,2) DEFAULT 0,           -- Total amount
  total_weight DECIMAL(15,2) DEFAULT 0,           -- Total weight

  -- Customer representative
  representative_name VARCHAR(100),
  representative_email VARCHAR(100),
  representative_phone VARCHAR(20),

  delivery_date DATE,                             -- Expected delivery date

  staff_account_name VARCHAR(100),
  staff_account_email VARCHAR(100),
  admin_account_name VARCHAR(100),
  admin_account_email VARCHAR(100),

  note TEXT,
  admin_note TEXT,

  status ENUM(
    'Đã gửi phiếu', 
    'Đã duyệt', 
    'Đã xuất hàng khỏi kho',
    'Đã hủy'
  ) DEFAULT 'Đã gửi phiếu',                           -- Receipt status

  invoice_issued BOOLEAN DEFAULT false,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bảng chi tiết phiếu xuất kho
CREATE TABLE goods_issue_items (
  id INT AUTO_INCREMENT PRIMARY KEY,           -- Item ID

  goods_issue_receipt_id INT NOT NULL,          -- Issue receipt ID

  item_no INT,                                 -- Line number
  image_url TEXT,                              -- Product image

  product_name VARCHAR(255),                   -- Product name
  product_type VARCHAR(100),                   -- Product type
  product_code VARCHAR(100),                   -- Product code

  unit VARCHAR(50),                            -- Unit (kg, box, ...)
  weight_per_unit DECIMAL(10,2),               -- Weight per unit
  weight DECIMAL(10,2),                        -- Total weight

  manufacture_date DATE,                       -- Manufacture date
  expiry_date DATE,                            -- Expiry date

  quantity INT,                                -- Quantity
  unit_price DECIMAL(15,2),                    -- Unit price
  total_price DECIMAL(15,2),                   -- Total price

  FOREIGN KEY (goods_issue_receipt_id)
    REFERENCES goods_issue_receipts(id)
    ON DELETE CASCADE
);


/*Bảng tổng quan kho , sức chứa*/
CREATE TABLE warehouse_capacity (
  id INT PRIMARY KEY,             

  total_capacity_kg FLOAT,
  used_capacity_kg FLOAT,

  total_capacity_m2 FLOAT,
  used_capacity_m2 FLOAT,

  updated_at DATETIME
);

/*Bảng khu vực kho*/
CREATE TABLE warehouse_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,

  area_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  capacity_kg FLOAT DEFAULT 50000,   -- Max weight capacity
  used_kg FLOAT DEFAULT 0,            -- Used weight

  capacity_m2 FLOAT DEFAULT 500,      -- Max area capacity
  used_m2 FLOAT DEFAULT 0              -- Used area
);


INSERT INTO warehouse_areas (area_name, description)
VALUES 
('Đồ ăn & Đồ uống', 'Lưu trữ thực phẩm và đồ uống các loại'),
('Mỹ phẩm & chăm sóc cá nhân', 'Các sản phẩm mỹ phẩm, chăm sóc cá nhân'),
('Thời trang & giày dép', 'Sản phẩm thời trang, quần áo, giày dép'),
('Thiết bị điện tử', 'Các thiết bị công nghệ, điện tử'),
('Đồ dùng gia đình', 'Nồi niêu, nước lau nhà, nước rửa chén, vật dụng gia đình');

/*Bảng sản phẩm*/
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,

  product_code VARCHAR(100) NOT NULL UNIQUE,   -- Global product code
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  image_url TEXT,

  -- Inventory summary
  total_quantity INT DEFAULT 0,
  total_weight DECIMAL(10,2) DEFAULT 0,
  total_area DECIMAL(10,2) DEFAULT 0,

  -- Pricing & supplier snapshot
  unit_price DECIMAL(15,2) DEFAULT 0,
  supplier_name VARCHAR(255),
  receipt_code VARCHAR(100),
  logo_url TEXT,

  -- Manufacturing info
  manufacture_date DATE,
  expiry_date DATE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


/*Bảng danh sách sản phẩm*/
-- Product details table
CREATE TABLE product_details (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Basic information
  product_code VARCHAR(100) NOT NULL,          -- Product code
  old_product_code VARCHAR(100),               -- Old product code (if updated)
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  image_url TEXT,

  -- Quantity & physical attributes
  quantity INT DEFAULT 0,
  weight FLOAT DEFAULT 0,                      -- Total weight (kg)
  area FLOAT DEFAULT 0,                        -- Total area (m²)
  weight_per_unit FLOAT DEFAULT 0,
  area_per_unit FLOAT DEFAULT 0,

  -- Dates
  manufacture_date DATE,
  expiry_date DATE,
  import_date DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Pricing
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),

  -- Location & warehouse area
  location VARCHAR(20),
  warehouse_area_id INT,
  FOREIGN KEY (warehouse_area_id)
    REFERENCES warehouse_areas(id),

  -- Receipt & supplier snapshot
  receipt_code VARCHAR(100),
  supplier_name VARCHAR(255),
  logo_url TEXT,

  is_checking BOOLEAN DEFAULT 0,

  -- Aggregated fields
  total_weight DECIMAL(10,2) DEFAULT 0,
  total_quantity INT DEFAULT 0,
  total_area DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE location_transfer_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(100),
  from_location VARCHAR(50),
  to_location VARCHAR(50),
  user_email VARCHAR(100),
  transfer_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
   
CREATE TABLE inventory_deduction_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,

  product_code VARCHAR(50),
  pallet_name VARCHAR(50),

  quantity_deducted INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  goods_issue_receipt_id INT
);


-- Bảng lưu thông tin đợt kiểm kê
CREATE TABLE inventory_audit_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,

  batch_code VARCHAR(50) NOT NULL UNIQUE,     -- Audit batch code (e.g. KK001_27072025)
  batch_name VARCHAR(255) NOT NULL,           -- Audit batch name

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by_email VARCHAR(255),              -- Creator (Admin email)

  status VARCHAR(20) DEFAULT 'dang_kiem'
);

-- Bảng lưu chi tiết các sản phẩm trong từng đợt kiểm kê
CREATE TABLE inventory_audit_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  audit_batch_id INT NOT NULL,              -- Inventory audit batch ID
  product_detail_id INT NOT NULL,            -- Product detail ID

  actual_quantity INT,                      -- Counted quantity
  checked_by_email VARCHAR(255),             -- Staff email who checked
  note TEXT,                                 -- Additional note

  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (audit_batch_id)
    REFERENCES inventory_audit_batches(id)
    ON DELETE CASCADE,

  FOREIGN KEY (product_detail_id)
    REFERENCES product_details(id)
    ON DELETE CASCADE,

  -- Ensure one product per batch
  UNIQUE (audit_batch_id, product_detail_id)
);
