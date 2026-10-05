// src/routes/menuRoutes.js — ไฟล์ใหม่ของ wk09
const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");

router.get("/", menuController.listMenu); // ?branchId=
router.get("/categories", menuController.listCategories); // ต้องอยู่ก่อน "/:id"
router.get("/:id", menuController.getMenuById); // ?branchId=
router.post("/", menuController.createMenu);
router.put("/:id", menuController.updateMenu);
router.delete("/:id", menuController.deleteMenu); // ?branchId=

module.exports = router;
