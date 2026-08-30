// src/controllers/orderController.js
// Implement Use Case "รับออเดอร์และคำนวณราคา" (wk04-user-stories.md ข้อ 3.1)
const orderModel = require("../models/orderModel");
const menuItemModel = require("../models/menuItemModel");
const { Order } = require("../models/Order");

exports.createOrder = async (req, res) => {
  const { items, paymentMethod } = req.body;

  // ---- ตรงกับ Main Flow ข้อ 1 (พนักงานเลือกรายการเมนู) ----
  // ต้องมีอย่างน้อย 1 รายการ — เป็นเงื่อนไขโดยนัยของ "เลือกรายการเมนูที่ลูกค้าสั่ง"
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "ต้องมีรายการเมนูอย่างน้อย 1 รายการ" });
  }

  if (!paymentMethod) {
    return res.status(400).json({ error: "ต้องระบุวิธีการชำระเงิน" });
  }

  // ---- ตรงกับ Main Flow ข้อ 3 (พนักงานระบุจำนวนของแต่ละรายการ) ----
  // ตรวจรูปแบบข้อมูลพื้นฐานก่อนเช็คกับฐานข้อมูลจริง
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

  // ---- ตรงกับ Main Flow ข้อ 2 (ระบบตรวจสอบว่าเมนูมีวัตถุดิบเพียงพอ) ----
  const menuItemIds = items.map((item) => item.menuItemId);
  const menuItems = await menuItemModel.findByIds(menuItemIds);
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // ตรงกับ Exception 2a กรณี "ไม่พบเมนูนี้ในระบบเลย" (ขยายจาก Exception 2a เดิมของ wk04
  // ซึ่งเขียนถึงกรณี "สต็อกไม่พอ" — เพิ่มกรณี "ไม่มีเมนูนี้อยู่จริง" ซึ่งเป็นเงื่อนไขที่ implied
  // จาก Main Flow ข้อ 1 ที่ต้อง "เลือกรายการเมนู" ที่มีอยู่จริงในระบบเท่านั้น)
  const notFoundId = menuItemIds.find((id) => !menuItemMap.has(id));
  if (notFoundId !== undefined) {
    return res.status(400).json({ error: `ไม่พบเมนู id ${notFoundId} ในระบบ` });
  }

  // ---- ตรงกับ Exception Flow 2a ของ UC 3.1 (วัตถุดิบไม่เพียงพอ → เมนูหมดชั่วคราว) ----
  // sprint นี้ simplify สต็อกเป็น "ต่อเมนู 1 หน่วย" ตรง ๆ (stock_quantity ในตาราง menu_items)
  // ยังไม่ใช่ระบบ recipe/วัตถุดิบย่อยแบบเต็มรูปแบบตาม FR-06/US-05 (deferred ไป wk07 ER Diagram)
  const insufficientItem = items.find((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    return menuItem.stock_quantity < item.quantity;
  });
  if (insufficientItem) {
    const menuItem = menuItemMap.get(insufficientItem.menuItemId);
    return res.status(400).json({
      error: `เมนู "${menuItem.name}" หมดชั่วคราว ไม่สามารถเพิ่มรายการนี้ได้`,
    });
  }

  // ---- ตรงกับ Main Flow ข้อ 4 (ระบบคำนวณราคารวม) ----
  // totalAmount คำนวณจากราคาในฐานข้อมูลเสมอ ไม่รับราคาตรงจาก client
  const order = new Order(paymentMethod);

  items.forEach((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    order.addItem(menuItem, item.quantity);
  });

  if (!order.submit()) {
    return res
      .status(400)
      .json({ error: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" });
  }

  const totalAmount = order.calculateTotal(); // <-- คำนวณผ่าน Encapsulation

  // ---- ตรงกับ Main Flow ข้อ 5-6 (ระบบบันทึกรายการสั่งซื้อ และแสดงยอดรวม) ----
  // หมายเหตุ: ยังไม่ตัดสต็อกที่นี่ — ตาม design decision ของกลุ่ม สต็อกจะถูกตัดตอน
  // "ชำระเงิน" สำเร็จเท่านั้น (UC 3.2/3.3 include relationship) ไม่ใช่ตอนรับออเดอร์
  try {
    const orderId = await orderModel.create(totalAmount);
    res.status(201).json({
      orderId,
      totalAmount,
      paymentMethod,
      status: "pending",
      items: order.items.map((orderItem) => ({
        menuItemId: orderItem.menuItem.id,
        name: orderItem.menuItem.name,
        unitPrice: orderItem.unitPrice, // ใช้ Snapshot ราคาที่บันทึกไว้ใน OrderItem
        quantity: orderItem.quantity,
        subtotal: orderItem.getSubtotal(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" });
  }
};

exports.getAllOrders = async (req, res) => {
  const orders = await orderModel.findAll();
  res.json(orders);
};
