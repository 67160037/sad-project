// src/models/menuModel.js
// wk09: เพิ่มเมธอด CRUD เมนู (findAllByBranch คือ findByBranch เดิม, findByIdAndBranch, create,
// updateFields, remove) ต่อจาก wk07 — field เดิม (findByIds, findByBranch, decreaseStock) ไม่เปลี่ยน
const pool = require("../config/db");

exports.findByIds = async (ids) => {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT menu_id AS id, branch_id, category_id, name, price, stock_quantity, low_stock_threshold, is_active
     FROM menu_item WHERE menu_id IN (${placeholders})`,
    ids,
  );
  return rows;
};

exports.findByBranch = async (branchId) => {
  const [rows] = await pool.query(
    "SELECT menu_id AS id, branch_id, category_id, name, price, stock_quantity, low_stock_threshold, is_active FROM menu_item WHERE branch_id = ? AND is_active = 1",
    [branchId],
  );
  return rows;
};

// ---- ใช้ตอนยืนยันออเดอร์ (wk09) — เตรียมไว้ตั้งแต่ wk07 ตอนนี้ orderController เรียกใช้จริงแล้ว ----
exports.decreaseStock = async (menuId, quantity) => {
  await pool.query(
    "UPDATE menu_item SET stock_quantity = stock_quantity - ? WHERE menu_id = ?",
    [quantity, menuId],
  );
};

// ======================= เพิ่มใหม่ใน wk09: CRUD เมนู =======================

// ดึงเมนูเดียว "พร้อมกรองด้วย branch_id เสมอ" — ป้องกัน IDOR
// (เดาแค่ menu_id อย่างเดียวไม่สามารถดึง/แก้/ลบเมนูของสาขาอื่นได้)
exports.findByIdAndBranch = async (menuId, branchId) => {
  const [rows] = await pool.query(
    "SELECT menu_id AS id, branch_id, category_id, name, price, stock_quantity, low_stock_threshold, is_active FROM menu_item WHERE menu_id = ? AND branch_id = ? AND is_active = 1",
    [menuId, branchId],
  );
  return rows[0];
};

exports.create = async ({
  branchId,
  categoryId,
  name,
  price,
  stockQuantity,
  lowStockThreshold,
}) => {
  const [result] = await pool.query(
    `INSERT INTO menu_item
     (branch_id, category_id, name, price, stock_quantity, low_stock_threshold, is_active)
   VALUES (?, ?, ?, ?, ?, ?, 1)`, // เพิ่ม is_active และค่า 1 ตรงนี้
    [
      branchId,
      categoryId,
      name,
      price,
      stockQuantity ?? 0,
      lowStockThreshold ?? 10,
    ],
  );
  return result.insertId;
};

// partial update (COALESCE ให้ไม่ต้องส่งครบทุก field) — branch_id กรองคู่กับ menu_id เสมอ
exports.updateFields = async (
  menuId,
  branchId,
  { categoryId, name, price, stockQuantity, lowStockThreshold },
) => {
  const [result] = await pool.query(
    `UPDATE menu_item
     SET category_id = COALESCE(?, category_id),
         name = COALESCE(?, name),
         price = COALESCE(?, price),
         stock_quantity = COALESCE(?, stock_quantity),
         low_stock_threshold = COALESCE(?, low_stock_threshold)
     WHERE menu_id = ? AND branch_id = ?`,
    [
      categoryId ?? null,
      name ?? null,
      price ?? null,
      stockQuantity ?? null,
      lowStockThreshold ?? null,
      menuId,
      branchId,
    ],
  );
  return result.affectedRows;
};

// รายการหมวดหมู่ (ใช้ใน dropdown ของฟอร์มเพิ่ม/แก้ไขเมนู)
exports.listCategories = async () => {
  const [rows] = await pool.query(
    "SELECT category_id AS id, name FROM category ORDER BY category_id",
  );
  return rows;
};

exports.remove = async (menuId, branchId) => {
  const [result] = await pool.query(
    "UPDATE menu_item SET is_active = 0 WHERE menu_id = ? AND branch_id = ?",
    [menuId, branchId],
  );
  return result.affectedRows;
};
