// src/models/menuItemModel.js
// ตาม UC 3.1 (wk04-user-stories.md): ราคาและสถานะสต็อกต้องมาจากระบบเสมอ
const db = require("../config/db");

// รับ array ของ id แล้วคืนแถวเมนูทั้งหมดที่ตรงในคำสั่งเดียว (กัน N+1 query)
exports.findByIds = async (ids) => {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT id, name, price, stock_quantity FROM menu_items WHERE id IN (${placeholders})`,
    ids,
  );
  return rows;
};
