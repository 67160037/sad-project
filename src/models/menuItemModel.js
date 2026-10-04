// src/models/menuItemModel.js
// ปรับจาก wk05 เดิม — เพิ่ม branch_id ตาม ER Diagram (เมนูผูกกับสาขา)
// field อื่น (name, price, stock_quantity, low_stock_threshold) ไม่เปลี่ยนจาก wk05 เดิม
const pool = require("../config/db");

exports.findByIds = async (ids) => {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT menu_id AS id, branch_id, name, price, stock_quantity, low_stock_threshold
     FROM menu_item WHERE menu_id IN (${placeholders})`,
    ids,
  );
  return rows;
};

exports.findByBranch = async (branchId) => {
  const [rows] = await pool.query(
    "SELECT menu_id AS id, branch_id, name, price, stock_quantity, low_stock_threshold FROM menu_item WHERE branch_id = ?",
    [branchId],
  );
  return rows;
};

// ใช้ตอน "ชำระเงิน" (UC 3.2/3.3) เพื่อตัดสต็อกจริง — ยังไม่ implement endpoint ใน sprint นี้
// เตรียมไว้ให้ Sprint 2 (wk09) เรียกใช้ต่อได้ทันที
exports.decreaseStock = async (menuId, quantity) => {
  await pool.query(
    "UPDATE menu_item SET stock_quantity = stock_quantity - ? WHERE menu_id = ?",
    [quantity, menuId],
  );
};
