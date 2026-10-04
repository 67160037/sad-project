// src/models/orderItemModel.js
// ไฟล์ใหม่ wk07: แยก order_item ออกมาตามหลัก 3NF
// Field ตรงกับ ER Diagram ยกเว้น getSubtotal() ที่เป็น Derived value (คำนวณสด ไม่เก็บลง DB)

const pool = require("../config/db");

// เพิ่มรายการสินค้าเข้าออเดอร์ (unitPrice คือ snapshot ราคา ณ ตอนสั่งซื้อ)
exports.addItem = async ({ orderId, menuId, quantity, unitPrice }) => {
  const [result] = await pool.query(
    "INSERT INTO order_item (order_id, menu_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
    [orderId, menuId, quantity, unitPrice],
  );
  return result.insertId;
};

// ดึงรายการสินค้าทั้งหมดของออเดอร์ พร้อมชื่อเมนู
exports.findByOrderId = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT oi.order_item_id, oi.order_id, oi.menu_id, oi.quantity, oi.unit_price,
            m.name AS menu_name
     FROM order_item oi
     JOIN menu_item m ON m.menu_id = oi.menu_id
     WHERE oi.order_id = ?`,
    [orderId],
  );
  return rows;
};

// คำนวณยอดรวมย่อย (สอดคล้องกับ method getSubtotal() ใน Class Diagram)
exports.getSubtotal = (orderItemRow) => {
  return orderItemRow.quantity * orderItemRow.unit_price;
};
