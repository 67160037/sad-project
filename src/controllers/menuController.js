// src/controllers/menuController.js
// ไฟล์ใหม่ของ wk09 — CRUD จัดการเมนู ตาม Workshop ขั้นตอนที่ 3
// ทุก endpoint ต้องระบุ branchId เสมอ (ป้องกัน IDOR — ดูหมายเหตุใน menuModel.js)
const menuModel = require("../models/menuModel");

exports.listMenu = async (req, res) => {
  const branchId = Number(req.query.branchId);
  if (!Number.isInteger(branchId)) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  try {
    const rows = await menuModel.findByBranch(branchId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
};

exports.getMenuById = async (req, res) => {
  const branchId = Number(req.query.branchId);
  if (!Number.isInteger(branchId)) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  try {
    const menu = await menuModel.findByIdAndBranch(req.params.id, branchId);
    if (!menu) {
      return res
        .status(404)
        .json({ error: `ไม่พบเมนู id ${req.params.id} ในสาขานี้` });
    }
    res.json(menu);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
};

exports.createMenu = async (req, res) => {
  const {
    branchId,
    categoryId,
    name,
    price,
    stockQuantity,
    lowStockThreshold,
  } = req.body;
  if (!Number.isInteger(branchId)) {
    return res.status(400).json({ error: "ต้องระบุ branchId เป็นจำนวนเต็ม" });
  }
  if (!Number.isInteger(categoryId)) {
    return res.status(400).json({ error: "ต้องระบุ categoryId (หมวดหมู่)" });
  }
  if (!name || typeof price !== "number" || price <= 0) {
    return res
      .status(400)
      .json({ error: "ต้องระบุ name และ price ที่เป็นตัวเลขมากกว่า 0" });
  }
  try {
    const menuId = await menuModel.create({
      branchId,
      categoryId,
      name,
      price,
      stockQuantity,
      lowStockThreshold,
    });
    res.status(201).json({ menuId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มเมนู" });
  }
};

exports.updateMenu = async (req, res) => {
  const {
    branchId,
    categoryId,
    name,
    price,
    stockQuantity,
    lowStockThreshold,
  } = req.body;
  if (!Number.isInteger(branchId)) {
    return res.status(400).json({ error: "ต้องระบุ branchId เป็นจำนวนเต็ม" });
  }
  try {
    const affectedRows = await menuModel.updateFields(req.params.id, branchId, {
      categoryId,
      name,
      price,
      stockQuantity,
      lowStockThreshold,
    });
    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ error: `ไม่พบเมนู id ${req.params.id} ในสาขานี้` });
    }
    res.json({ updated: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขเมนู" });
  }
};

exports.deleteMenu = async (req, res) => {
  const branchId = Number(req.query.branchId);
  if (!Number.isInteger(branchId)) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  try {
    const affectedRows = await menuModel.remove(req.params.id, branchId);
    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ error: `ไม่พบเมนู id ${req.params.id} ในสาขานี้` });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบเมนู" });
  }
};

exports.listCategories = async (req, res) => {
  try {
    res.json(await menuModel.listCategories());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงหมวดหมู่" });
  }
};
