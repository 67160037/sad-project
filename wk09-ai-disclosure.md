# การใช้ AI ในงานนี้ (AI Usage Declaration)

**1. ใช้ AI หรือไม่?**

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

**2. เครื่องมือ AI ที่ใช้:**
Claude,Gemini

**3. งานส่วนไหนใช้ AI:**

- [ ] Requirement Analysis - ส่วน: -
- [ ] Database Design - ส่วน: -
- [ ] System Architecture - ส่วน: -
- [ ] Document/Grammar Check - ส่วน: -
- [x] อื่นๆ: Sequence Diagram, Business Rule + Flowchart, โค้ด Coding Sprint 2 (CRUD เมนู, สั่งซื้อ, ชำระเงิน/ตัดสต็อก), ตารางจับคู่ diagram กับโค้ด

**4. Prompt ที่ใช้ (ตัวอย่าง):**

> "ช่วยแนะนำวิธีเขียน MySQL Transaction ใน Node.js/Express สำหรับตัดสต็อกพร้อมบันทึก stock_movement และป้องกันสต็อกติดลบให้หน่อย"

**5. ผลลัพธ์จาก AI:**
AI ออกแบบ Sequence Diagram 2 แผนภาพ (สั่งซื้อ, ชำระเงิน+ตัดสต็อก) พร้อม business rule 7 ข้อและ flowchart เขียนโค้ดตาม diagram (`menuModel`, `orderModel`, `stockMovementModel`, `orderController`, `menuController`, `routes`)
และ
AI ช่วยแนะนำโครงสร้างตัวอย่างการใช้ connection.beginTransaction() และ rollback() ใน orderModel.js รวมถึงแนะนำชุดคำสั่ง SQL Query สำหรับคำนวณยอดขายจาก order_item ตามเงื่อนไขเวลา

**6. การปรับแต่งของนิสิตเอง:**
ได้ทำการตรวจสอบและปรับปรุง Sequence Diagram ของระบบ POS ให้สอดคล้องกับข้อกำหนดเชิงสถาปัตยกรรม (โดยมี Participant ครบถ้วน ได้แก่ Frontend, OrderController, OrderModel และ Database พร้อมทั้งออกแบบ Fragment แบบ Alt สำหรับตรวจสอบเงื่อนไขสต็อก/เงินสด และ Loop สำหรับการตัดสต็อกสินค้าในรายการออเดอร์)

จากนั้นได้นำโครงสร้างโค้ดส่วนที่ AI ช่วยแนะนำ (เช่น โครงสร้าง MySQL Transaction และ SQL Query สรุปยอดขาย) มาปรับแก้ชื่อตัวแปรและฟิลด์ให้ตรงกับตารางฐานข้อมูลจริงของกลุ่ม (เช่น branch_id, employee_id, stock_quantity) แล้วนำมาทดสอบการทำงานจริงผ่าน Postman และหน้าเว็บเบราว์เซอร์ เพื่อยืนยันว่า API POST /api/orders และ PATCH /api/orders/:id/pay ทำงานถูกต้องตาม Acceptance Criteria

โดยเฉพาะระบบ Transaction (BEGIN, COMMIT, ROLLBACK) ที่ช่วยตัดสต็อกและบันทึกประวัติลงตาราง stock_movement เมื่อชำระเงินสำเร็จ รวมถึงได้ศึกษาและทำความเข้าใจ Logic การดักจับ Error ต่างๆ (เช่น 400 Bad Request, 404 Not Found, 409 Conflict) ใน Controller อย่างละเอียด เพื่อให้มั่นใจว่าสามารถอธิบายการทำงานของโค้ดและ Flow ทั้งหมดได้ด้วยตนเอง

**7. เหตุผลในการใช้ AI:**
ใช้เพื่อประมวลผลข้อมูลที่เชื่อมโยงกันจากหลายสัปดาห์ (Use Case สัปดาห์ที่ 4 และ ER Diagram สัปดาห์ที่ 7) ให้ออกมาเป็น Sequence Diagram และ Flowchart ที่สอดคล้องกัน ป้องกันข้อผิดพลาดในการออกแบบ Logic ข้ามสัปดาห์ นอกจากนี้ AI ยังช่วยขึ้นโครงร่างโค้ด สำหรับระบบ Database Transaction ที่มีความซับซ้อน ทำให้กลุ่มมีเวลาโฟกัสกับการทดสอบ API และทำความเข้าใจ Business Logic หลักได้มากขึ้น

---

# AI Usage Declaration — Coding Sprint สัปดาห์ที่ 9

**1. Diagram/เอกสารต้นทางของ sprint นี้:**
Use Case Diagram + Use Case Description 3.1-3.3 (wk04), Class Diagram v1 (wk06), ER Diagram + schema (wk07), Sequence Diagram และ Flowchart ของ wk09 (`wk09-sequence-diagram.md`)

**2. ส่วนที่ AI ช่วยเขียนโค้ด:**

- `src/models/menuModel.js` (เพิ่ม CRUD, decreaseStock รับ transaction)
- `src/models/orderModel.js` (เพิ่ม markPaid)
- `src/models/stockMovementModel.js` (ไฟล์ใหม่)
- `src/controllers/orderController.js` (createOrder ปรับ, payOrder ใหม่)
- `src/controllers/menuController.js`, `src/routes/menuRoutes.js` (ไฟล์ใหม่), `src/routes/orderRoutes.js` (เพิ่ม route pay)

**3. สมาชิกที่อธิบายโค้ดส่วนนี้ได้ (ต้องมีอย่างน้อย 1 คนต่อส่วน):**
67160035(ปาฏลี) , 67160037(พิชชาพร)

**4. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:**

- [ ] ไม่ต่าง
- [x] ต่าง — **เหตุผล:** ดูตารางหัวข้อ 4 ใน `wk09-sequence-diagram.md` (เช่น ตัดสต็อกตอนชำระเงินตาม wk04, ใช้ threshold จาก schema, ลบเมนูที่มีประวัติสั่งไม่ได้)

**และได้ปรับปรุง diagram สัปดาห์นี้ให้ตรงแล้ว:**

- [x] แล้ว
- [ ] ยังไม่ได้ปรับ _(Class Diagram wk06 และ ER wk07 ยังไม่ได้ปรับ จะอัปเดตในสัปดาห์ถัดไปที่เกี่ยวข้อง)_
