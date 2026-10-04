// src/models/orderModel.js
// อัปเดตสำหรับ wk07: รองรับ branch_id, employee_id และนำ total_amount ออกตามหลัก 3NF

const pool = require("../config/db");

// สร้างออเดอร์ใหม่
exports.create = async ({ branchId, employeeId, paymentMethod }) => {
  const [result] = await pool.query(
    `INSERT INTO orders (branch_id, employee_id, payment_method) 
     VALUES (?, ?, ?)`,
    [branchId, employeeId, paymentMethod],
  );
  return result.insertId;
};

// ดึงข้อมูลออเดอร์ทั้งหมด
exports.findAll = async () => {
  // JOIN สาขาและพนักงานมาให้ด้วย เผื่อนำไปแสดงในหน้ารายงาน
  const [rows] = await pool.query(
    `SELECT o.order_id, o.branch_id, b.name AS branch_name, 
            o.employee_id, e.name AS employee_name, 
            o.payment_method, o.status, o.created_at
     FROM orders o
     JOIN branch b ON o.branch_id = b.branch_id
     JOIN employee e ON o.employee_id = e.employee_id
     ORDER BY o.created_at DESC`,
  );
  return rows;
};

// ดึงข้อมูลออเดอร์ตาม ID
exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT o.order_id, o.branch_id, o.employee_id, o.payment_method, o.status, o.created_at
     FROM orders o 
     WHERE order_id = ?`,
    [id],
  );
  return rows[0]; // ส่งคืน object ตัวแรก
};
