## การใช้ AI ในงานนี้ (AI Usage Declaration)

### 1. ใช้ AI หรือไม่?

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

### 2. เครื่องมือ AI ที่ใช้:

- Claude , Gemini

### 3. งานส่วนไหนใช้ AI:

- [x] Requirement Analysis - ส่วน: ตารางสืบย้อนกลับ (Traceability) ฟอร์ม/รายงาน → FR/US/UC ของ wk03-wk04
- [ ] Database Design - ส่วน: -
- [ ] System Architecture - ส่วน: -
- [ ] Document/Grammar Check - ส่วน: -
- [x] อื่นๆ: ออกแบบ I/O form, ใบเสร็จ, รายงานยอดขาย, Wireframe Mid-Fi (SVG), ร่าง Sequence Diagram `GET /api/reports/sales`, โค้ด frontend (`public/`), `GET /api/lookups`

### 4. Prompt ที่ใช้ (ตัวอย่าง):

```
"ช่วยรวมโค้ดหน้า POS, จัดการเมนู และรายงานให้อยู่ในหน้าเดียว (index.html/script.js) และช่วยเขียน SQL Query คำนวณยอดขายตามช่วงเวลา"
```

### 5. ผลลัพธ์จาก AI:

AI ช่วยวางโครงสร้างโค้ดหน้าเว็บแบบ SPA (สลับหน้าโดยไม่รีเฟรช) ร่างหน้าตาฟอร์มใบเสร็จ/รายงาน และแนะนำคำสั่ง SQL LEFT JOIN สำหรับสรุปยอดขายรายสาขา

### 6. การปรับแต่งของนิสิตเอง:

นำโค้ดที่ AI แนะนำมาปรับแก้ชื่อฟิลด์ให้ตรงกับฐานข้อมูลจริง (branch_id, stock_quantity) ทดสอบเชื่อมต่อ API จริงผ่านหน้าเว็บ และปรับ Sequence Diagram ให้มี Participant ครบถ้วนตามระบบจริง

### 7. เหตุผลในการใช้ AI:

ใช้ช่วยให้ฟอร์ม/ใบเสร็จ/รายงานและ UI สอดคล้องกับ requirement และโค้ดของสัปดาห์ก่อนหน้า

---

## รายการไฟล์ที่ AI ช่วยเขียน (สำหรับ Coding)

### 1. Diagram/เอกสารต้นทาง:

wk04 Use Case Description 3.1-3.4 และ User Stories, wk07 ER/schema, wk09 Sequence Diagram (หัวข้อ 1.4) และ endpoint

### 2. ส่วนที่ AI ช่วยเขียนโค้ด:

index.html, style.css, script.js (ฝั่งหน้าบ้าน) และฟังก์ชัน getSalesSummary ใน src/models/orderModel.js (ฝั่งหลังบ้าน)

### 3. สมาชิกที่อธิบายโค้ดส่วนนี้ได้ (ต้องมีอย่างน้อย 1 คนต่อส่วน):

ปาฏลี(67160035),พิชชาพร (67160037)

### 4. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง — เหตุผล: ดูตารางหัวข้อ 7 ใน `wk10-input-output-design.md` (เพิ่ม `GET /api/lookups`, เปลี่ยนวิธีชำระหลังสร้างออเดอร์ยังไม่ได้, ยังไม่มียกเลิกออเดอร์, รายงานเป็นข้อมูลตัวอย่าง) ปรับ diagram แล้ว: [ ] แล้ว [x] ยังไม่ได้ปรับ (ช่องว่างทั้งหมดจะเติมใน Coding Sprint 3 สัปดาห์ที่ 13)
