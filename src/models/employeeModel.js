// src/models/employeeModel.js
const pool = require("../config/db");

// พนักงานของสาขาหนึ่ง (ดึงจากตาราง employee จริง)
exports.findByBranch = async (branchId) => {
  const [rows] = await pool.query(
    "SELECT employee_id AS id, branch_id, name, role FROM employee WHERE branch_id = ? ORDER BY employee_id",
    [branchId],
  );
  return rows;
};
