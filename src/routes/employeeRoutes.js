// src/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeModel = require("../models/employeeModel");

// GET /api/employees?branchId=1
router.get("/", async (req, res) => {
  const branchId = Number(req.query.branchId);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  try {
    res.json(await employeeModel.findByBranch(branchId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน" });
  }
});

module.exports = router;
