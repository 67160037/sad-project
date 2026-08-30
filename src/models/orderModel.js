// src/models/orderModel.js
const db = require("../config/db");

exports.create = async (totalAmount) => {
  const [result] = await db.query(
    "INSERT INTO orders (total_amount, status, created_at) VALUES (?, 'pending', NOW())",
    [totalAmount],
  );
  return result.insertId;
};

exports.findAll = async () => {
  const [rows] = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
  return rows;
};
