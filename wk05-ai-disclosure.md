## AI Usage Declaration — Coding Sprint สัปดาห์ที่ 5

### 1. Diagram/เอกสารต้นทางของ sprint นี้:

Use Case Diagram และ Use Case Description 3.1 "รับออเดอร์และคำนวณราคา" จาก `wk04-user-stories.md` (Actor: พนักงานหน้าร้าน) รวมถึง User Story US-01 และ Acceptance Criteria 2 ข้อของ US-01

### 2. ส่วนที่ AI ช่วยเขียนโค้ด:

- `src/config/db.js` (connection pool)
- `src/models/menuItemModel.js`, `src/models/orderModel.js`
- `src/controllers/orderController.js` (validation + คำนวณราคา + บันทึกออเดอร์)
- `src/routes/orderRoutes.js`, `src/app.js`
- `sql/schema.sql` (ตาราง `menu_items`, `orders` + ข้อมูลตัวอย่าง)

### 3. สมาชิกที่อธิบายโค้ดส่วนนี้ได้ (ต้องมีอย่างน้อย 1 คนต่อส่วน):

[ชื่อ]

### 4. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง — เหตุผล: ดูรายละเอียดทั้ง 4 ข้อในหัวข้อ "2. จุดที่ implement ต่างจาก wk04-user-stories.md" ด้านบน (ไม่รวม paymentMethod ในสต็อป, simplify สต็อกเป็นต่อเมนู, เพิ่ม validation implied, ตัดคอลัมน์ payment_method) และได้ปรับปรุง diagram สัปดาห์นี้ให้ตรงแล้ว: [ ] แล้ว [x] ยังไม่ได้ปรับ (ตามหลักการ wk05.md ข้อ 4.1 จะปรับ diagram ต้นทางในสัปดาห์ถัดไปที่เกี่ยวข้อง เช่น wk06 Class Diagram หรือ wk07 ER Diagram)
