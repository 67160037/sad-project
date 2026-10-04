-- wk07-schema.sql
-- ER Diagram -> MySQL Schema สำหรับระบบ POS ร้านกาแฟ (Group 13)
-- อัปเดต: เพิ่มตาราง category และ stock_movement เพื่อความสมบูรณ์ในการจัดการข้อมูล

CREATE DATABASE IF NOT EXISTS cafe_pos;
USE cafe_pos;

-- ลบตารางเก่า (เรียงลำดับจากตารางลูกไปแม่ ป้องกัน Error Foreign Key)
DROP TABLE IF EXISTS stock_movement;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_item;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS branch;
DROP TABLE IF EXISTS category;

-- ===================================================================
-- CATEGORY — หมวดหมู่เมนู
-- ===================================================================
CREATE TABLE IF NOT EXISTS category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

-- ===================================================================
-- BRANCH — สาขาของร้าน
-- ===================================================================
CREATE TABLE IF NOT EXISTS branch (
  branch_id   INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(255)
);

-- ===================================================================
-- EMPLOYEE — พนักงาน (รวม Barista/Cashier ไว้ตารางเดียว + คอลัมน์ role)
-- ===================================================================
CREATE TABLE IF NOT EXISTS employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id   INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(20) NOT NULL,  -- 'cashier', 'barista', 'manager'
  FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
);

-- ===================================================================
-- MENU_ITEM — เมนู (เพิ่ม category_id เป็น FK เชื่อมกับหมวดหมู่)
-- ===================================================================
CREATE TABLE IF NOT EXISTS menu_item (
  menu_id             INT AUTO_INCREMENT PRIMARY KEY,
  branch_id           INT NOT NULL,
  category_id         INT NOT NULL,
  name                VARCHAR(100) NOT NULL,
  price               DECIMAL(10,2) NOT NULL,
  stock_quantity      INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  FOREIGN KEY (branch_id) REFERENCES branch(branch_id),
  FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- ===================================================================
-- ORDERS — ออเดอร์ (ไม่มีคอลัมน์ total_amount ตามหลัก 3NF)
-- ===================================================================
CREATE TABLE IF NOT EXISTS orders (
  order_id        INT AUTO_INCREMENT PRIMARY KEY,
  branch_id       INT NOT NULL,
  employee_id     INT NOT NULL,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'เงินสด',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branch(branch_id),
  FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

-- ===================================================================
-- ORDER_ITEM — รายการสินค้าในออเดอร์ (เก็บ unit_price เป็น snapshot)
-- ===================================================================
CREATE TABLE IF NOT EXISTS order_item (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NOT NULL,
  menu_id       INT NOT NULL,
  quantity      INT NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (menu_id) REFERENCES menu_item(menu_id)
);

-- ===================================================================
-- STOCK_MOVEMENT — บันทึกประวัติการเข้า-ออกของสต็อก (เพิ่มใหม่)
-- ===================================================================
CREATE TABLE IF NOT EXISTS stock_movement (
  movement_id     INT AUTO_INCREMENT PRIMARY KEY,
  menu_id         INT NOT NULL,
  quantity_change INT NOT NULL, -- เช่น -2 (ขายไป) หรือ +10 (เติมสต็อก)
  moved_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menu_item(menu_id)
);

-- ===================================================================
-- Seed data สำหรับทดสอบ (สาขาเดียว, พนักงาน 2 คน, หมวดหมู่ และเมนู)
-- ===================================================================
INSERT INTO category (name) VALUES
  ('Coffee'),
  ('Bakery');

INSERT INTO branch (name, address) VALUES
  ('Brew Haven สาขา 1', '123 ถ.มหาวิทยาลัย ต.แสนสุข อ.เมือง จ.ชลบุรี');

INSERT INTO employee (branch_id, name, role) VALUES
  (1, 'ฟ้า', 'cashier'),
  (1, 'บาริสต้าทดสอบ', 'barista');

-- ใส่ category_id = 1 สำหรับกาแฟ, category_id = 2 สำหรับเบเกอรี่
INSERT INTO menu_item (branch_id, category_id, name, price, stock_quantity, low_stock_threshold) VALUES
  (1, 1, 'อเมริกาโน่', 45.00, 20, 10),
  (1, 1, 'ลาเต้', 55.00, 20, 10),
  (1, 2, 'ครัวซองต์', 35.00, 5, 10),
  (1, 1, 'เอสเปรสโซ่', 40.00, 0, 10);