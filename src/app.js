// src/app.js
// wk09: เพิ่มการ mount menuRoutes (/api/menu) — จุดอื่นไม่เปลี่ยนจากเดิม
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// เผื่อเปิดหน้าเว็บจากพอร์ตอื่น (เช่น VS Code Live Server :5500) ไม่ใช่จาก :3000 ตรงๆ
// ไม่มีบรรทัดนี้ fetch จากพอร์ตอื่นจะถูกเบราว์เซอร์บล็อกด้วย CORS แล้วโยน error
// เหมือน "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" ทั้งที่ server รันอยู่จริง
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

const menuRoutes = require("./routes/menuRoutes");
app.use("/api/menu", menuRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cafe POS server running on port ${PORT}`);
});
