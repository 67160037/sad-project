-- Active: 1788072596788@@127.0.0.1@3306@cafe_pos
-- เพิ่มตัวเลือกของเมนูในแต่ละรายการออเดอร์
-- รันครั้งเดียวกับฐานข้อมูลเดิม
ALTER TABLE order_item
  ADD COLUMN sweet_level VARCHAR(30) NULL AFTER unit_price,
  ADD COLUMN ice_level VARCHAR(30) NULL AFTER sweet_level,
  ADD COLUMN extras TEXT NULL AFTER ice_level;
