// src/routes/orderRoutes.js
// wk09: เพิ่ม PATCH /:id/pay (UC 3.2 ชำระเงิน «include» UC 3.3 ตัดสต็อก)
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// สร้างออเดอร์ใหม่ (UC 3.1 — ยังไม่ตัดสต็อก)
router.post("/", orderController.createOrder);

// ชำระเงิน (UC 3.2) — ตัดสต็อกจริงที่นี่ (include UC 3.3)
router.patch("/:id/pay", orderController.payOrder);

// ดึงออเดอร์ทั้งหมด
router.get("/", orderController.getAllOrders);

// รายงาน (วางก่อน /:id เพื่อไม่ให้ชนกับ Parameter route)
router.get("/reports/sales", orderController.getSalesSummary);
router.get("/reports/menu-sales", orderController.getMenuSales);

// ดึงรายละเอียดออเดอร์ตาม ID
router.get("/:id", orderController.getOrderById);

module.exports = router;
