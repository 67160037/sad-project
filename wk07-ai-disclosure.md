# AI Disclosure Form — wk07 (ER Diagram & Database Design)

**สัปดาห์:** 7 — Entity-Relationship Diagram, Normalization, Model Layer
**สมาชิกที่ร่วมทำและสามารถอธิบายโค้ด/diagram นี้ได้:** พิชชาพร (67160037) — _(เพื่อนร่วมกลุ่มที่เข้าใจและอธิบายได้ โปรดเติมชื่อเพิ่ม: ธันย์ชนก, มาดี, ปาฏลี, ณัฏฐณิชา)_

## 1. เครื่องมือ AI ที่ใช้

Claude ช่วยออกแบบ ER Diagram, ตรวจสอบ 3NF, เขียน `wk07-schema.sql`, และปรับโค้ด Model/Controller จาก Sprint 1 (wk05) ให้ตรงกับ schema ใหม่

## 2. Traceability — จาก Class Diagram (wk06) สู่ ER Diagram/Schema (wk07)

| ที่มา                                              | รายละเอียด                                    | ไปเป็น                                                                                                  |
| -------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Class `Order` (wk06 §2.3)                          | attribute `paymentMethod`, `createdAt`        | `orders.payment_method`, `orders.created_at`                                                            |
| Class `Order` method `calculateTotal()`            | method คำนวณ ไม่เก็บค่า                       | **ไม่มีคอลัมน์คู่กัน** — คำนวณสดด้วย `SUM()` ใน `orderModel.findById`/`findAll`                         |
| Class `OrderItem`                                  | attribute `menuItem`, `quantity`, `unitPrice` | ตาราง `order_item` ใหม่ทั้งตาราง (`menu_id` FK, `quantity`, `unit_price`)                               |
| Class `OrderItem` method `getSubtotal()`           | method คำนวณ                                  | **ไม่มีคอลัมน์คู่กัน** — ฟังก์ชัน `orderItemModel.getSubtotal()` คำนวณจาก field ที่มีอยู่ ไม่ query ซ้ำ |
| Class `MenuItem`                                   | attribute `name`, `price`                     | `menu_item.name`, `menu_item.price` (ตรงกับ wk05 schema เดิม)                                           |
| Class `Employee`/`Barista`/`Cashier` (Inheritance) | `Employee <                                   | -- Barista`, `Employee <                                                                                | -- Cashier` | รวมเป็นตาราง `employee` เดียว + คอลัมน์ `role` (single-table inheritance) |
| UC 3.1 รับออเดอร์และคำนวณราคา (wk04)               | validation 6 ข้อเดิมจาก wk05                  | คงไว้ทั้งหมดใน `orderController.createOrder` ใหม่ (ดูหัวข้อ 4)                                          |

## 3. จุดที่ต่างจาก diagram/เอกสารต้นทาง (ตามนโยบายของวิชา — ไม่ย้อนแก้ diagram เดิม)

1. **ตาราง `branch` ไม่มีอยู่ใน Class Diagram wk06** — Class Diagram สัปดาห์ที่ 6 ของกลุ่มยังไม่ได้ออกแบบเรื่องหลายสาขา แต่ `CASE-STUDY-COFFEE-SHOP-STD.md` กำหนดขอบเขตเรื่องนี้ไว้ตั้งแต่ wk02 (แผนขยายสาขา) จึงต้องเพิ่ม entity นี้เองตอนออกแบบ ER Diagram ยังไม่ได้ย้อนไปแก้ Class Diagram ของ wk06 ให้มี class `Branch` คู่กัน — ถือเป็นช่องว่างที่ควรปรับใน wk06 ย้อนหลัง หรือหมายเหตุไว้ในรอบ revisit ถัดไป
2. **ไม่มีตาราง `category` หรือ `stock_movement`** — ต่างจากตัวอย่างในเอกสาร wk07_1.md หัวข้อ 3.2 ซึ่งมีทั้งสองตาราง กลุ่มเลือกไม่ใส่เพราะ (ก) Class Diagram wk06 ไม่มี class `Category` หรือกลไกบันทึก stock movement และ (ข) FR ของกลุ่ม (wk03) ยังไม่ได้ระบุเรื่องหมวดหมู่เมนูหรือ audit trail การตัดสต็อก — เก็บ `stock_quantity` แบบง่ายต่อเมนูเหมือน Sprint 1 เดิมพอสำหรับขอบเขตปัจจุบัน หากต้องมีรายงานประวัติการตัดสต็อกในอนาคต จะต้องเพิ่มตารางนี้และปรับ `menuModel.decreaseStock` ให้บันทึก log ด้วย
3. **`menu_item.branch_id` ทำให้เมนูชื่อเดียวกันซ้ำได้หลายแถวถ้ามีหลายสาขา** — เป็น trade-off ที่ยอมรับตามที่ wk07_1.md หัวข้อ 3.2 อธิบายไว้ (query ง่ายกว่า แต่แก้ราคาร่วมทุกสาขาต้อง UPDATE หลายแถว) ปัจจุบันกลุ่มมีข้อมูลทดสอบแค่ 1 สาขา ยังไม่กระทบจริง
4. **`orderController.createOrder` ต้องรับ `branchId`/`employeeId` เพิ่มจาก wk05 เดิม** — endpoint เดิมใน Sprint 1 ไม่มี field นี้เพราะตอนนั้นยังไม่มีแนวคิดหลายสาขา/ผู้ใช้ระบบ ตอนนี้ client (เช่น Postman หรือหน้าเว็บ) ต้องส่ง `branchId`/`employeeId` มาด้วยทุกครั้ง — ยังไม่มีระบบ login ที่จะดึง `employeeId` จาก session โดยอัตโนมัติ (ตามที่ตั้งข้อสังเกตไว้ใน wk04-user-stories.md หัวข้อ 3.5 ว่า Use Case "เข้าสู่ระบบ" ยังเป็น draft)

## 4. การตรวจสอบ Diagram-Code Drift Checklist (ตามหัวข้อ 4.4 ของ wk07_1.md)

- [x] ทุก field ใน `orderModel.js`/`orderItemModel.js`/`menuModel.js` ตรงกับคอลัมน์ใน `wk07-schema.sql` ทุกตัว (ตรวจแล้วทีละไฟล์)
- [x] query ที่ JOIN ตรงกับ cardinality ที่ออกแบบไว้ (`orders` 1:N `order_item`, `menu_item` 1:N `order_item`)
- [x] field ใหม่ (`branch_id`, `employee_id`, `payment_method`) ถูกเพิ่มเข้า ER Diagram **พร้อมกับ** โค้ด ไม่ใช่แก้โค้ดอย่างเดียวแล้วปล่อย diagram ค้างไว้
- [x] method คำนวณ (`calculateTotal`, `getSubtotal`) ตกลงให้อยู่ที่ชั้น Model/Controller (คำนวณสดจาก query) ไม่เก็บเป็น field — ใช้หลักเดียวกันทั้งโปรเจกต์

## 5. สิ่งที่ยังไม่ implement ใน sprint นี้

- Endpoint ตัดสต็อกจริงตอนชำระเงิน (UC 3.2/3.3) — เตรียมฟังก์ชัน `menuModel.decreaseStock` ไว้แล้ว แต่ยังไม่เรียกใช้จาก endpoint ใด ๆ (รอ Sprint 2 สัปดาห์ที่ 9)
- การ migrate ข้อมูลจริงจาก `wk05-sprint1/sql/schema.sql` เดิม (ถ้ามีข้อมูลทดสอบอยู่แล้วในเครื่อง ต้อง backup ก่อน DROP ตารางเดิมแล้ว import `wk07-schema.sql` ใหม่ — ไม่มีสคริปต์ ALTER TABLE อัตโนมัติ เพราะโครงสร้างเปลี่ยนมากจนง่ายกว่าจะสร้างใหม่สำหรับข้อมูลทดสอบ)
