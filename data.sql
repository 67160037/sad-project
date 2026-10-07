-- Active: 1788072596788@@127.0.0.1@3306@cafe_pos
-- รีเซ็ตและสร้างฐานข้อมูลชื่อ cafe ใหม่ทั้งหมดในคำสั่งเดียว
DROP DATABASE IF EXISTS cafe_pos;
CREATE DATABASE cafe_pos;
USE cafe_pos;

-- 1. สร้างตารางหมวดหมู่
CREATE TABLE category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

-- 2. สร้างตารางสาขา
CREATE TABLE branch (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255)
);

-- 3. สร้างตารางพนักงาน
CREATE TABLE employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
);

-- 4. สร้างตารางเมนู
CREATE TABLE menu_item (
  menu_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (branch_id) REFERENCES branch(branch_id),
  FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- 5. สร้างตารางออเดอร์และรายการสินค้า
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  employee_id INT NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'เงินสด',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branch(branch_id),
  FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE order_item (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  sweet_level VARCHAR(30) NULL,
  ice_level VARCHAR(30) NULL,
  extras TEXT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (menu_id) REFERENCES menu_item(menu_id)
);

CREATE TABLE stock_movement (
  movement_id INT AUTO_INCREMENT PRIMARY KEY,
  menu_id INT NOT NULL,
  quantity_change INT NOT NULL,
  moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menu_item(menu_id)
);

-- 6. เพิ่มข้อมูลเริ่มต้น (Seed Data)
INSERT INTO category (name) VALUES
  ('กาแฟ'),
  ('เบเกอรี่'),
  ('เค้ก'),
  ('เครื่องดื่มอื่นๆ'),
  ('ชา');

UPDATE category
SET name = CASE category_id
    WHEN 1 THEN 'กาแฟ'
    WHEN 2 THEN 'ชา'
    WHEN 3 THEN 'เบเกอรี่'
    WHEN 4 THEN 'เค้ก'
    WHEN 5 THEN 'เครื่องดื่มอื่นๆ'
END
WHERE category_id IN (1, 2, 3, 4, 5);  

INSERT INTO branch (branch_id, name, address) VALUES
  (1, 'สาขา 1 (บางแสน)', 'ถ.ลงหาดบางแสน ต.แสนสุข อ.เมือง จ.ชลบุรี'),
  (2, 'สาขา 2 (ศรีราชา)', 'ถ.สุขุมวิท อ.ศรีราชา จ.ชลบุรี'),
  (3, 'สาขา 3 (พัทยา)', 'ถ.เลียบชายหาด เมืองพัทยา จ.ชลบุรี');

INSERT INTO employee (employee_id, branch_id, name, role) VALUES
  (67160037, 1, 'พิชชาพร', 'cashier'),
  (67160038, 2, 'สมชาย', 'cashier'),
  (67160039, 3, 'สมหญิง', 'cashier'),
  (67160040, 1, 'ฟ้า', 'cashier'),
  (67160041, 2, 'น้ำ', 'cashier'),
  (67160042, 3, 'ฝน', 'cashier');

-- 7. เพิ่มรายการเมนู
INSERT INTO menu_item (branch_id, category_id, name, price, stock_quantity, low_stock_threshold) VALUES
  (1, 1, 'อเมริกาโน่', 45.00, 20, 10),
  (1, 1, 'ลาเต้', 55.00, 20, 10),
  (1, 2, 'ครัวซองต์', 35.00, 5, 10),
  (1, 1, 'เอสเปรสโซ่', 40.00, 0, 10),
  (1, 4, 'ชาเขียว', 60.00, 15, 10),
  (1, 4, 'มัทฉะ', 120.00, 15, 10),
  
  (2, 1, 'อเมริกาโน่', 45.00, 20, 10),
  (2, 1, 'ลาเต้', 55.00, 20, 10),
  (2, 2, 'ครัวซองต์', 35.00, 15, 10),
  (2, 1, 'เอสเปรสโซ่', 40.00, 20, 10),
  (2, 4, 'ชาเขียว', 60.00, 15, 10),
  (2, 4, 'มัทฉะ', 120.00, 15, 10),
  
  (3, 1, 'อเมริกาโน่', 45.00, 20, 10),
  (3, 1, 'ลาเต้', 55.00, 20, 10),
  (3, 2, 'ครัวซองต์', 35.00, 20, 10),
  (3, 1, 'เอสเปรสโซ่', 40.00, 0, 10),
  (3, 4, 'ชาเขียว', 60.00, 15, 10),
  (3, 4, 'มัทฉะ', 120.00, 15, 10);