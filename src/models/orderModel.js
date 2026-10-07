// src/models/orderModel.js
const pool = require("../config/db");
const menuModel = require("./menuModel");

exports.create = async ({ branchId, employeeId, paymentMethod }) => {
  const [result] = await pool.query(
    `INSERT INTO orders (branch_id, employee_id, payment_method)
     VALUES (?, ?, ?)`,
    [branchId, employeeId, paymentMethod],
  );
  return result.insertId;
};

exports.findAll = async () => {
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

exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT o.order_id, o.branch_id, o.employee_id, o.payment_method, o.status, o.created_at
     FROM orders o
     WHERE order_id = ?`,
    [id],
  );
  return rows[0];
};

// เงื่อนไขช่วงเวลาที่ใช้ร่วมกันในรายงานทุกตัว (today หรือ week เริ่มวันจันทร์)
const periodCondition = (period, date) => {
  if (period === "date" && /^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    // ผ่านการตรวจรูปแบบ YYYY-MM-DD แล้ว จึงปลอดภัยต่อ SQL injection
    return `AND DATE(o.created_at) = '${date}'`;
  }
  return period === "week"
    ? "AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)"
    : "AND DATE(o.created_at) = CURDATE()";
};

// ดึงสรุปยอดขายแยกรายสาขาตามช่วงเวลา (today หรือ week เริ่มวันจันทร์)
exports.getSalesSummary = async (period, date) => {
  const dateCondition = periodCondition(period, date);

  const query = `
    SELECT 
      b.branch_id AS id,
      b.name AS name,
      COUNT(DISTINCT o.order_id) AS orders,
      COUNT(DISTINCT CASE WHEN o.payment_method IN ('cash', 'เงินสด') THEN o.order_id END) AS cash_count,
      COUNT(DISTINCT CASE WHEN o.payment_method IN ('transfer', 'โอน') THEN o.order_id END) AS transfer_count,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS sales
    FROM branch b
    LEFT JOIN orders o ON b.branch_id = o.branch_id AND o.status = 'paid' ${dateCondition}
    LEFT JOIN order_item oi ON o.order_id = oi.order_id
    GROUP BY b.branch_id, b.name
    ORDER BY b.branch_id;
  `;
  const [rows] = await pool.query(query);
  return rows;
};

// ยอดขายรายเมนูของสาขาหนึ่ง ใช้ส่งออกรายงาน PDF (ตารางเมนู / จำนวนที่ขาย / ราคา / ยอดขาย)
exports.getMenuSales = async (branchId, period, date) => {
  const [rows] = await pool.query(
    `SELECT m.menu_id AS id, m.name,
            SUM(oi.quantity) AS qty, oi.unit_price,
            SUM(oi.quantity * oi.unit_price) AS sales
     FROM orders o
     JOIN order_item oi ON oi.order_id = o.order_id
     JOIN menu_item m ON m.menu_id = oi.menu_id
     WHERE o.status = 'paid' AND o.branch_id = ? ${periodCondition(period, date)}
     GROUP BY m.menu_id, m.name, oi.unit_price
     ORDER BY sales DESC`,
    [branchId],
  );
  return rows;
};

exports.getBranchOrders = async (branchId, period, date) => {
  const dateCondition = periodCondition(period, date);
  const [rows] = await pool.query(
    `SELECT o.order_id, o.created_at, o.payment_method, 
            oi.menu_id, m.name AS menu_name, oi.quantity, oi.unit_price,
            (oi.quantity * oi.unit_price) AS subtotal
     FROM orders o
     JOIN order_item oi ON o.order_id = oi.order_id
     JOIN menu_item m ON oi.menu_id = m.menu_id
     WHERE o.branch_id = ? AND o.status = 'paid' ${dateCondition}
     ORDER BY o.created_at DESC`,
    [branchId],
  );
  return rows;
};

// ==========================================
// ระบบ Transaction ชำระเงินและตัดสต็อก
// ==========================================
exports.markPaid = async (orderId, deductions) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [updateResult] = await conn.query(
      `UPDATE orders SET status = 'paid' WHERE order_id = ? AND status = 'pending'`,
      [orderId],
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("ออเดอร์ไม่ใช่สถานะ pending หรือถูกชำระเงินไปแล้ว");
    }

    for (const item of deductions) {
      // เรียก menuModel.decreaseStock(menuId, quantity, conn) ตาม Sequence Diagram
      const decreased = await menuModel.decreaseStock(
        item.menuId,
        item.quantity,
        conn,
      );
      if (!decreased) {
        throw new Error("สต็อกไม่พอ menu_id " + item.menuId);
      }

      // บันทึกประวัติลงตาราง stock_movement ให้ตรงกับโครงสร้างจริง (มีเฉพาะ menu_id และ quantity_change)[cite: 20]
      await conn.query(
        `INSERT INTO stock_movement (menu_id, quantity_change)
         VALUES (?, ?)`,
        [item.menuId, -item.quantity],
      );
    }

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
