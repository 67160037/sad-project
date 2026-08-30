-- Active: 1788072596788@@127.0.0.1@3306@mysql
-- Active: 1786894670523@@127.0.0.1@3306
-- sql/schema.sql
-- Sprint 1 — รองรับเฉพาะ Use Case "รับออเดอร์และคำนวณราคา" (wk04-user-stories.md ข้อ 3.1, US-01)
-- ตารางฉบับสมบูรณ์ (รายการสินค้าแยกตาราง, การเชื่อมโยงวัตถุดิบแบบ recipe) จะออกแบบใน ER Diagram สัปดาห์ที่ 7

CREATE DATABASE IF NOT EXISTS cafe_pos;
USE cafe_pos;

-- เมนู พร้อมราคาและสต็อก (ยึดตาม US-01 AC2: ต้องเช็คได้ว่าเมนู "พร้อมขาย" หรือ "หมดชั่วคราว")
-- หมายเหตุ: sprint นี้ simplify สต็อกเป็น "ต่อเมนู 1 หน่วย" โดยตรง ยังไม่ทำระบบ recipe/วัตถุดิบย่อย
-- ตาม FR-06/US-05 เต็มรูปแบบ ซึ่งจะออกแบบพร้อม ER Diagram สัปดาห์ที่ 7 (ดูหมายเหตุความต่างใน wk05-ai-disclosure.md)
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ออเดอร์ — เก็บเฉพาะยอดรวม (total_amount) ตามขอบเขต sprint 1
-- ไม่มีคอลัมน์ payment_method เพราะ "ชำระเงิน" (UC 3.2, US-02) เป็นคนละ Use Case
-- ที่ wk05.md ระบุชัดว่าไม่บังคับ implement ใน sprint นี้ (เฉพาะ "รับออเดอร์และคำนวณราคา" เท่านั้น)
-- status ไว้เผื่อสัปดาห์ถัดไปที่จะต่อ endpoint ชำระเงิน (PATCH /api/orders/:id/pay) เปลี่ยนเป็น 'paid'
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ข้อมูลตัวอย่างสำหรับทดสอบ endpoint (ปรับราคา/ชื่อเมนูตามที่กลุ่มออกแบบจริงได้)
INSERT INTO menu_items (name, price, stock_quantity, low_stock_threshold) VALUES
  ('อเมริกาโน่', 45.00, 20, 10),
  ('ลาเต้', 55.00, 20, 10),
  ('ครัวซองต์', 35.00, 5, 10),
  ('เอสเปรสโซ่', 40.00, 0, 10);
-- 'เอสเปรสโซ่' ตั้งใจใส่ stock_quantity = 0 ไว้ทดสอบ Exception Flow 2a (เมนูหมดชั่วคราว)
