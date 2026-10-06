// src/controllers/orderController.js
const orderModel = require("../models/orderModel");
const orderItemModel = require("../models/orderItemModel");
const menuModel = require("../models/menuModel");
const { Order } = require("../models/Order");

// ==========================================
// ส่วนที่ 1: สร้างออเดอร์ (สถานะ pending ยังไม่ตัดสต็อก)
// ==========================================
exports.createOrder = async (req, res) => {
  const { branchId, employeeId, paymentMethod, items } = req.body;

  // 1. ตรวจสอบข้อมูลนำเข้าเบื้องต้น
  if (!Number.isInteger(branchId) || !Number.isInteger(employeeId)) {
    return res
      .status(400)
      .json({ error: "ต้องระบุ branchId และ employeeId เป็นจำนวนเต็ม" });
  }
  if (!paymentMethod) {
    return res.status(400).json({ error: "ต้องระบุวิธีการชำระเงิน" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "ต้องมีรายการเมนูอย่างน้อย 1 รายการ" });
  }
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

  // 2. รวมจำนวนรายการที่เป็นเมนูเดียวกัน
  const quantityByMenuItemId = new Map();
  for (const item of items) {
    quantityByMenuItemId.set(
      item.menuItemId,
      (quantityByMenuItemId.get(item.menuItemId) || 0) + item.quantity,
    );
  }

  const menuItemIds = [...quantityByMenuItemId.keys()];
  let menuItems;
  try {
    menuItems = await menuModel.findByIds(menuItemIds);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // 3. ตรวจสอบเมนูและสาขา
  for (const menuItemId of menuItemIds) {
    const menuItem = menuItemMap.get(menuItemId);
    if (!menuItem) {
      return res
        .status(400)
        .json({ error: `ไม่พบเมนู id ${menuItemId} ในระบบ` });
    }
    if (menuItem.branch_id !== branchId) {
      return res
        .status(400)
        .json({ error: `เมนู "${menuItem.name}" ไม่ได้อยู่ในสาขาที่ระบุ` });
    }
  }

  // 4. เช็คสต็อกเบื้องต้นว่าพอหรือไม่ (ยังไม่ตัดจริง)
  for (const [menuItemId, totalQuantity] of quantityByMenuItemId) {
    const menuItem = menuItemMap.get(menuItemId);
    if (menuItem.stock_quantity < totalQuantity) {
      return res.status(400).json({
        error: `เมนู "${menuItem.name}" หมดชั่วคราว ไม่สามารถเพิ่มรายการนี้ได้`,
      });
    }
  }

  // 5. สร้าง Order Class เพื่อเตรียมข้อมูล
  const order = new Order(paymentMethod);
  items.forEach((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    order.addItem(menuItem, item.quantity);
  });
  const totalAmount = order.calculateTotal();

  try {
    // 6. บันทึกข้อมูลลงฐานข้อมูล (สถานะจะเป็น pending)
    const orderId = await orderModel.create({
      branchId,
      employeeId,
      paymentMethod,
      totalAmount,
    });

    for (const orderItem of order.items) {
      await orderItemModel.addItem({
        orderId,
        menuId: orderItem.menuItem.id,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
      });
    }

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
        subtotal: orderItem.getSubtotal(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" });
  }
};

// ==========================================
// ส่วนที่ 2: ชำระเงินและตัดสต็อกอัตโนมัติ (Transaction ผ่าน Model)
// ==========================================
exports.payOrder = async (req, res) => {
  const { id } = req.params;
  const { cashReceived } = req.body;

  try {
    // 1. ดึงข้อมูลออเดอร์และเช็คสถานะ
    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({ error: "ไม่พบออเดอร์นี้" });
    }
    if (order.status !== "pending") {
      return res
        .status(409)
        .json({ error: "ออเดอร์นี้ชำระเงินไปแล้วหรือถูกยกเลิก" });
    }

    // 2. คำนวณยอดรวมจาก order_item
    const items = await orderItemModel.findByOrderId(id);
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );

    // 3. ตรวจสอบเงินสด (กรณีจ่ายด้วยเงินสด) หรือเงินโอน (transfer)
    let change = 0;
    if (order.payment_method === "cash") {
      if (cashReceived === undefined || cashReceived < totalAmount) {
        return res.status(400).json({ error: "จำนวนเงินสดรับมาไม่เพียงพอ" });
      }
      change = cashReceived - totalAmount;
    }

    // 4. เตรียมข้อมูลรายการที่จะตัดสต็อกส่งให้ Model จัดการ Transaction
    const deductions = items.map((item) => ({
      menuId: item.menu_id,
      quantity: item.quantity,
    }));

    // เรียกใช้ฟังก์ชัน markPaid ใน orderModel (ซึ่งจะจัดการอัปเดตสถานะและลดสต็อกใน Transaction เดียวกัน)
    await orderModel.markPaid(id, deductions);

    // 5. เช็คสต็อกคงเหลือหลังตัด เพื่อแจ้งเตือน Low Stock
    const menuIds = deductions.map((d) => d.menuId);
    const updatedMenuItems = await menuModel.findByIds(menuIds);

    const lowStockMenuIds = [];
    for (const menu of updatedMenuItems) {
      if (menu.stock_quantity < (menu.low_stock_threshold || 10)) {
        lowStockMenuIds.push(menu.id);
      }
    }

    // 6. ตอบกลับ 200 OK
    res.status(200).json({
      status: "paid",
      change: change,
      lowStockMenuIds: lowStockMenuIds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการชำระเงินและตัดสต็อก" });
  }
};

// ==========================================
// ส่วนที่ 3: รายงานและจัดการข้อมูลทั่วไป
// ==========================================
exports.getSalesSummary = async (req, res) => {
  try {
    const period = req.query.period || "today";
    const reportData = await orderModel.getSalesSummary(period);
    res.json(reportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงรายงานยอดขาย" });
  }
};

exports.getMenuSales = async (req, res) => {
  const branchId = Number(req.query.branchId);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId เป็นจำนวนเต็ม" });
  }
  const period = req.query.period === "week" ? "week" : "today";
  try {
    res.json(await orderModel.getMenuSales(branchId, period));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงยอดขายรายเมนู" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.findAll();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "ไม่พบออเดอร์นี้" });
    }
    const items = await orderItemModel.findByOrderId(req.params.id);
    res.json({ ...order, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};

exports.getBranchOrders = async (req, res) => {
  const branchId = Number(req.query.branchId);
  const period = req.query.period || "today";
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId เป็นจำนวนเต็ม" });
  }
  try {
    const orders = await orderModel.getBranchOrders(branchId, period);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงรายการของสาขา" });
  }
};
