class OrderItem {
  constructor(item, quantity) {
    // Aggregation: OrderItem o-- MenuItem
    // -> รับ reference ของ object ที่มีอยู่แล้วจากภายนอกเข้ามาเก็บไว้ ไม่ได้ new เอง
    //    (ตอนนี้ MenuItem ยังไม่ implement จริงตาม wk06.md หัวข้อ 3.3 จึงรับ raw object
    //     จาก request body เข้ามาแทน จึงตั้งชื่อพารามิเตอร์ว่า item ไม่ใช่ menuItem)
    this.menuItem = item;
    this.quantity = quantity;

    // Snapshot ราคา ณ เวลาที่สั่ง -- ราคาต้องคงที่ตามเวลาที่ลูกค้าสั่ง แม้ภายหลัง
    // ราคาเมนูจะถูกปรับเปลี่ยน ออเดอร์เก่าต้องยังแสดงราคาเดิมที่ลูกค้าจ่ายจริง
    this.unitPrice = Number(item.price);
  }

  getSubtotal() {
    return this.unitPrice * this.quantity;
  }
}

class Order {
  constructor(paymentMethod) {
    this.orderId = null;
    this.createdAt = new Date();
    this.paymentMethod = paymentMethod;
    this.items = []; // -List~OrderItem~ items ใน Class Diagram
  }

  addItem(item, quantity) {
    this.items.push(new OrderItem(item, quantity));
  }

  calculateTotal() {
    return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
  }

  submit() {
    if (this.items.length === 0) return false;
    return true;
  }
}

module.exports = { Order, OrderItem };
