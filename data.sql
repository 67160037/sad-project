-- fix-add-employee.sql
-- สาเหตุ error "เกิดข้อผิดพลาดในการบันทึกออเดอร์":
-- script.js hardcode EMPLOYEE.id = 67160037 แต่ตาราง employee ไม่มี id นี้จริง
-- ทำให้ INSERT INTO orders ชน FOREIGN KEY (employee_id) แล้วถูก catch เป็น error 500
USE cafe_pos;

INSERT INTO employee (employee_id, branch_id, name, role)
VALUES (67160037, 1, 'พิชชาพร', 'cashier')
ON DUPLICATE KEY UPDATE name = 'พิชชาพร', branch_id = 1, role = 'cashier';

INSERT INTO employee (employee_id, branch_id, name, role)
VALUES (67160009, 1, 'สมหญิง', 'cashier')
ON DUPLICATE KEY UPDATE name = 'สมหญิง', branch_id = 1, role = 'cashier';
ALTER TABLE stock_movement ADD COLUMN quantity INT NOT NULL;

-- ก๊อปปี้เมนูทั้งหมดจากสาขา 1 ไปให้สาขา 2 (สมมติให้สต็อกเริ่มต้นเป็น 20 ชิ้น)
INSERT INTO menu_item (branch_id, category_id, name, price, stock_quantity, low_stock_threshold)
SELECT 2, category_id, name, price, 20, low_stock_threshold
FROM menu_item
WHERE branch_id = 1;

-- ก๊อปปี้เมนูทั้งหมดจากสาขา 1 ไปให้สาขา 3 (สมมติให้สต็อกเริ่มต้นเป็น 20 ชิ้น)
INSERT INTO menu_item (branch_id, category_id, name, price, stock_quantity, low_stock_threshold)
SELECT 3, category_id, name, price, 20, low_stock_threshold
FROM menu_item
WHERE branch_id = 1;