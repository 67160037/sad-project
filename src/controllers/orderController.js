// src/controllers/orderController.js
// Migrate จาก wk05 ให้ใช้ schema ใหม่ของ wk07 (orders + order_item แยกกัน)

const orderModel = require("../models/orderModel");
const orderItemModel = require("../models/orderItemModel");
const menuItemModel = require("../models/menuItemModel");
const { Order } = require("../models/Order");

exports.createOrder = async (req, res) => {
  const { branchId, employeeId, paymentMethod, items } = req.body;

  // ---- เพิ่มใหม่ใน wk07: ตรวจสอบข้อมูล FK ตาม ER Diagram (สาขา, พนักงาน) ----
  // จำเป็นต้องมีเพราะตาราง orders ใหม่บังคับใช้เป็น Foreign Key (NOT NULL)
  if (!Number.isInteger(branchId) || !Number.isInteger(employeeId)) {
    return res
      .status(400)
      .json({ error: "ต้องระบุ branchId และ employeeId เป็นจำนวนเต็ม" });
  }
  if (!paymentMethod) {
    return res.status(400).json({ error: "ต้องระบุวิธีการชำระเงิน" });
  }

  // ---- ตรงกับ Main Flow ข้อ 1 (พนักงานเลือกรายการเมนู) — เหมือน wk05 เดิมทุกประการ ----
  // ต้องมีอย่างน้อย 1 รายการ
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "ต้องมีรายการเมนูอย่างน้อย 1 รายการ" });
  }

  // ---- ตรงกับ Main Flow ข้อ 3 (พนักงานระบุจำนวนของแต่ละรายการ) — เหมือน wk05 เดิมทุกประการ ----
  // ตรวจสอบรูปแบบข้อมูลว่าส่ง id และ quantity มาเป็นตัวเลขที่ถูกต้อง
  const hasInvalidShape = items.some(
    (item) =>
      !Number.isInteger(item.menuItemId) ||
      item.menuItemId <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0,
  );
  if (hasInvalidShape) {
    return res.status(400).json({
      error: "แต่ละรายการต้องระบุ menuItemId และ quantity เป็นจำนวนเต็มบวก",
    });
  }

  // ---- ตรงกับ Main Flow ข้อ 2 (ระบบตรวจสอบว่าเมนูที่เลือกมีวัตถุดิบเพียงพอ) — ขั้นตอนดึงข้อมูลจากฐานข้อมูล ----
  const menuItemIds = items.map((item) => item.menuItemId);
  const menuItems = await menuItemModel.findByIds(menuItemIds);
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // ---- ตรงกับ Exception Flow (เสริม): กรณีไม่พบเมนูนี้ในระบบเลย — เหมือน wk05 เดิม ----
  // ป้องกันข้อผิดพลาดกรณีลูกค้าระบุ id ที่ไม่มีอยู่จริงก่อนไปตรวจสอบสต็อก
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);

    if (!menuItem) {
      return res
        .status(400)
        .json({ error: `ไม่พบเมนู id ${item.menuItemId} ในระบบ` });
    }

    // ---- เพิ่มใหม่ใน wk07: เมนูต้องอยู่สาขาเดียวกับออเดอร์ ----
    // สอดคล้องกับ ER Diagram ที่ผูก menu_item กับ branch_id เข้าด้วยกัน
    if (menuItem.branch_id !== branchId) {
      return res
        .status(400)
        .json({ error: `เมนู "${menuItem.name}" ไม่ได้อยู่ในสาขาที่ระบุ` });
    }

    // ---- ตรงกับ Exception Flow 2a (วัตถุดิบของเมนูที่เลือกไม่เพียงพอ) — เหมือน wk05 เดิม ----
    if (menuItem.stock_quantity < item.quantity) {
      return res.status(400).json({
        error: `เมนู "${menuItem.name}" หมดชั่วคราว ไม่สามารถเพิ่มรายการนี้ได้`,
      });
    }
  }

  // ---- ตรงกับ Main Flow ข้อ 4 (ระบบคำนวณราคารวม) — เริ่มต้นเรียกใช้ OOP สัปดาห์ที่ 6 ----
  const order = new Order(paymentMethod);

  items.forEach((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    // เพิ่มเมนูเข้า Class เพื่อให้ OrderItem เก็บ Snapshot ของราคา (unitPrice) เอาไว้
    order.addItem(menuItem, item.quantity);
  });

  // ---- ตรงกับ Main Flow ข้อ 4 (ระบบคำนวณราคารวม) — คำนวณผ่าน Encapsulation ของ Class ----
  const totalAmount = order.calculateTotal();

  try {
    // ---- ตรงกับ Main Flow ข้อ 5 (ระบบบันทึกรายการสั่งซื้อ) — บันทึกลงตาราง orders ----
    // เปลี่ยนจาก wk05: ไม่มียอดรวม (total_amount) เก็บใน DB แล้ว เพื่อป้องกัน Update Anomaly ตามหลัก 3NF
    const orderId = await orderModel.create({
      branchId,
      employeeId,
      paymentMethod,
    });

    // ---- ตรงกับ Main Flow ข้อ 5 (ระบบบันทึกรายการสั่งซื้อ) — บันทึกลงตาราง order_item ทีละรายการ ----
    for (const orderItem of order.items) {
      await orderItemModel.addItem({
        orderId: orderId,
        menuId: orderItem.menuItem.id,
        quantity: orderItem.quantity,
        // ใช้ Snapshot ราคา ณ ตอนสั่งซื้อที่ OOP คลาสเก็บไว้ แทนการดึงราคาปัจจุบันมาเก็บ
        unitPrice: orderItem.unitPrice,
      });
    }

    // ---- ตรงกับ Main Flow ข้อ 6 (ระบบแสดงยอดรวมเพื่อดำเนินการต่อ) ----
    // ตอบกลับ Client ด้วยยอดรวม totalAmount ที่เป็น Derived value (คำนวณสด)
    res.status(201).json({
      orderId,
      branchId,
      employeeId,
      paymentMethod,
      totalAmount,
      status: "pending",
      items: order.items.map((orderItem) => ({
        menuItemId: orderItem.menuItem.id,
        name: orderItem.menuItem.name,
        unitPrice: orderItem.unitPrice,
        quantity: orderItem.quantity,
        subtotal: orderItem.getSubtotal(), // ดึงค่า Subtotal ผ่าน Method ของ Class
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" });
  }
};

// ---- ฟังก์ชันเสริมที่ขาดหายไป ----

// ดึงรายการออเดอร์ทั้งหมด
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.findAll();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};

// ดึงรายละเอียดออเดอร์ตาม ID พร้อมรายการสินค้า
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "ไม่พบออเดอร์นี้" });
    }

    // ดึงรายการสินค้าจากตาราง order_item
    const items = await orderItemModel.findByOrderId(req.params.id);

    res.json({ ...order, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};
