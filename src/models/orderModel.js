// src/models/orderModel.js
const pool = require("../config/db");

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
const periodCondition = (period) =>
  period === "today"
    ? "AND DATE(o.created_at) = CURDATE()"
    : period === "week"
      ? "AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)"
      : "";

// ดึงสรุปยอดขายแยกรายสาขาตามช่วงเวลา (today หรือ week เริ่มวันจันทร์)
exports.getSalesSummary = async (period) => {
  const dateCondition = periodCondition(period);

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
exports.getMenuSales = async (branchId, period) => {
  const [rows] = await pool.query(
    `SELECT m.menu_id AS id, m.name,
            SUM(oi.quantity) AS qty, oi.unit_price,
            SUM(oi.quantity * oi.unit_price) AS sales
     FROM orders o
     JOIN order_item oi ON oi.order_id = o.order_id
     JOIN menu_item m ON m.menu_id = oi.menu_id
     WHERE o.status = 'paid' AND o.branch_id = ? ${periodCondition(period)}
     GROUP BY m.menu_id, m.name, oi.unit_price
     ORDER BY sales DESC`,
    [branchId],
  );
  return rows;
};

// ==========================================
// ใหม่ใน wk09: ระบบ Transaction ชำระเงินและตัดสต็อก (ตรงตาม image_2.png)
// ==========================================
exports.markPaid = async (orderId, deductions) => {
  // ดึง Connection แยกออกมาเพื่อทำ Transaction
  const conn = await pool.getConnection();
  try {
    // 1. เริ่ม Transaction (เทียบเท่าลูกศร BEGIN ใน Diagram)
    await conn.beginTransaction();

    // 2. อัปเดตสถานะบิลจาก pending เป็น paid
    // (เพิ่มเงื่อนไข WHERE status = 'pending' เพื่อป้องกัน Race condition)
    const [updateResult] = await conn.query(
      `UPDATE orders SET status = 'paid' WHERE order_id = ? AND status = 'pending'`,
      [orderId],
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("ออเดอร์ไม่ใช่สถานะ pending หรือถูกชำระเงินไปแล้ว");
    }

    // 3. วนลูปตัดสต็อกและบันทึกประวัติ (เทียบเท่า Loop ใน Diagram)
    for (const item of deductions) {
      // ตัดสต็อก: ต้องมีสต็อกพอ ไม่งั้นไม่อัปเดต (กันสต็อกติดลบ)
      const [stockResult] = await conn.query(
        `UPDATE menu_item
         SET stock_quantity = stock_quantity - ?
         WHERE menu_id = ? AND stock_quantity >= ?`,
        [item.quantity, item.menuId, item.quantity],
      );
      if (stockResult.affectedRows === 0) {
        throw new Error("สต็อกไม่พอ menu_id " + item.menuId);
      }

      // บันทึกประวัติลงตาราง stock_movement
      // ตารางจริงมีคอลัมน์: menu_id, quantity_change, moved_at (auto), quantity, movement_type
      // quantity_change = ค่าติดลบเมื่อขายออก, quantity = จำนวนที่ออก (บวก), movement_type = 'OUT'
      await conn.query(
        `INSERT INTO stock_movement (menu_id, quantity_change, quantity, movement_type)
         VALUES (?, ?, ?, 'OUT')`,
        [item.menuId, -item.quantity, item.quantity],
      );
    }

    // 4. ยืนยันการเปลี่ยนแปลง (เทียบเท่าลูกศร COMMIT ใน Diagram)
    await conn.commit();
    return true;
  } catch (error) {
    // ถ้าระหว่างทำงานพังหรือ error จะยกเลิกข้อมูลทั้งหมดที่แก้ไป (Rollback)
    await conn.rollback();
    throw error;
  } finally {
    // คืน Connection กลับเข้า Pool
    conn.release();
  }
};
