const Pos = {
  cart: [],
  total: 0,
  orderId: null,
  orderMethod: "cash",
  cat: "ทั้งหมด",

  // ดึงตะกร้าที่ค้างไว้กลับมา (กันรีเฟรชหาย)
  restoreCart() {
    const saved = localStorage.getItem("pos_cart");
    if (saved) {
      try {
        this.cart = JSON.parse(saved);
      } catch (e) {
        this.cart = [];
      }
    }
    this.updateUI();
  },

  // เซฟตะกร้าลง LocalStorage
  saveCart() {
    localStorage.setItem("pos_cart", JSON.stringify(this.cart));
  },

  // 1. ฟังก์ชันปลดล็อกกลับไป "แก้ไขรายการ" (ของในตะกร้าอยู่ครบ)
  editOrder() {
    if (confirm("คุณต้องการกลับไป 'แก้ไขรายการ' ใช่หรือไม่?")) {
      this.orderId = null; // ปลดล็อกรหัสบิล
      this.saveCart();
      this.updateUI();
      App.toast("ปลดล็อกรายการแล้ว สามารถเพิ่ม/ลดเมนูได้เลย");
    }
  },

  // 2. ฟังก์ชัน "ยกเลิกบิล" หรือ "ล้างตะกร้าทิ้ง" (ลบของในตะกร้าทิ้งทั้งหมด)
  async clearCartConfirm() {
    const msg = this.orderId
      ? "คุณแน่ใจหรือไม่ว่าต้องการ 'ยกเลิกบิลนี้' และทิ้งรายการทั้งหมด?"
      : "คุณแน่ใจหรือไม่ว่าต้องการล้างรายการในตะกร้าทั้งหมด?";

    if (confirm(msg)) {
      this.cart = [];
      this.orderId = null;
      this.saveCart();
      this.updateUI();
      App.toast("ยกเลิกและล้างตะกร้าเรียบร้อย");
    }
  },

  renderChips() {
    const q = document.getElementById("q")?.value || "";
    document.getElementById("chips").innerHTML =
      [
        "ทั้งหมด",
        ...(App.CATS.length
          ? App.CATS.map((c) => c.name)
          : ["กาแฟ", "เบเกอรี่"]),
      ]
        .map(
          (c) =>
            `<button class="chip ${c === this.cat ? "on" : ""}" onclick="Pos.cat='${c}';Pos.renderChips();Pos.renderGrid()">${c}</button>`,
        )
        .join("") +
      `<input class="search" id="q" placeholder="ค้นหาเมนู (สแกนบาร์โค้ดได้เลย)..." value="${q}" oninput="Pos.renderGrid()">`;
  },

  renderGrid() {
    const q = (document.getElementById("q")?.value || "").trim();
    document.getElementById("grid").innerHTML =
      App.MENU.filter(
        (m) =>
          (this.cat === "ทั้งหมด" || m.cat === this.cat) && m.name.includes(q),
      )
        .map((m) => {
          const n =
            (this.cart.find((i) => i.menuItemId === m.id) || {}).quantity || 0;
          const s =
            m.stock === 0
              ? ["out", "หมดชั่วคราว"]
              : m.stock <= 5
                ? ["low", "⚠ ใกล้หมด เหลือ " + m.stock]
                : ["", "เหลือ " + m.stock];
          return `<button class="item" ${m.stock ? "" : "disabled"} onclick="Pos.addToCart(${m.id})">
            ${n ? `<span class="qty-badge">${n}</span>` : ""}
            <div class="pic" style="background:${m.bg}">${m.icon}</div><h3>${m.name}</h3>
            <div class="row"><span class="price">${m.price}.-</span><span class="tag ${s[0]}">${s[1]}</span></div></button>`;
        })
        .join("") || '<div class="empty">ไม่พบเมนูที่ค้นหา</div>';
  },

  addToCart(id) {
    if (this.orderId)
      return App.toast("บิลถูกสร้างแล้ว กรุณากด 'แก้ไข' ก่อนเพิ่มเมนู", true);
    const m = App.MENU.find((x) => x.id === id);
    const it = this.cart.find((i) => i.menuItemId === id);

    if (it) {
      if (it.quantity >= m.stock)
        return App.toast(
          "สต็อก " + m.name + " เหลือ " + m.stock + " ชิ้น",
          true,
        );
      it.quantity++;
    } else {
      this.cart.push({
        menuItemId: id,
        name: m.name,
        price: m.price,
        quantity: 1,
      });
    }

    this.saveCart();
    this.updateUI();
  },

  changeQty(id, d) {
    const it = this.cart.find((i) => i.menuItemId === id);
    const m = App.MENU.find((x) => x.id === id);
    it.quantity += d;
    if (it.quantity > m.stock) {
      it.quantity = m.stock;
      App.toast("สต็อกไม่พอ", true);
    }
    if (it.quantity <= 0) this.cart = this.cart.filter((i) => i !== it);

    this.saveCart();
    this.updateUI();
  },

  // 3. ฟังก์ชันอัปเดตหน้าจอหลัก (สลับปุ่มแก้ไข/ยกเลิก)
  updateUI() {
    this.total = 0;
    const cartEl = document.getElementById("cart-list");

    if (this.cart.length) {
      cartEl.innerHTML = this.cart
        .map((i) => {
          const s = i.price * i.quantity;
          this.total += s;
          const d = this.orderId ? "disabled" : "";
          return `<div class="line"><div><strong>${i.name}</strong><br><small>${i.price} x ${i.quantity}</small></div>
        <div class="step"><button ${d} aria-label="ลด" onclick="Pos.changeQty(${i.menuItemId},-1)">−</button><button ${d} aria-label="เพิ่ม" onclick="Pos.changeQty(${i.menuItemId},1)">+</button></div><b>${App.baht(s)}</b></div>`;
        })
        .join("");
    } else {
      cartEl.innerHTML =
        '<div class="empty"><div>🛒</div>ตะกร้ายังว่าง<br>แตะเมนูทางซ้ายเพื่อเริ่มออเดอร์</div>';
    }

    document.getElementById("sub-price").textContent = App.baht(this.total);
    document.getElementById("total-price").textContent =
      App.baht(this.total) + " ฿";
    document.getElementById("btn-create").disabled = !this.cart.length;
    document.getElementById("btn-create").textContent = this.orderId
      ? "ไปชำระเงิน"
      : "ยืนยันออเดอร์";
    document
      .querySelectorAll('input[name="pay-method"]')
      .forEach((r) => (r.disabled = !!this.orderId));

    // ควบคุมป้ายสถานะ และ กล่องปุ่มด้านล่าง
    const billTag = document.getElementById("bill-tag");
    const actionRow = document.getElementById("action-row"); // กล่องรวมปุ่ม แก้ไข/ยกเลิก
    const btnClear = document.getElementById("btn-clear"); // ปุ่มล้างตะกร้าปกติ

    if (this.orderId) {
      // มีบิลแล้ว -> โชว์สถานะรอชำระ และแสดงกล่องที่มี 2 ปุ่มคู่กัน (แก้ไข/ยกเลิก)
      billTag.innerHTML = `<span class="tag warn" style="font-size:0.85rem;">⏳ รอชำระ (บิล #${this.orderId})</span>`;
      actionRow.style.display = "flex";
      btnClear.style.display = "none";
    } else if (this.cart.length) {
      // ยังไม่มีบิล แต่มีของในตะกร้า -> โชว์สถานะจัดรายการ และแสดงปุ่มล้างตะกร้าปุ่มเดียว
      billTag.innerHTML = `<span class="tag" style="background:#e3f1ec; color:var(--brand-d); font-size:0.85rem;">🛒 กำลังจัดรายการ</span>`;
      actionRow.style.display = "none";
      btnClear.style.display = "block";
    } else {
      // ตะกร้าว่างเปล่า
      billTag.innerHTML = `<span>ยังไม่ยืนยัน</span>`;
      actionRow.style.display = "none";
      btnClear.style.display = "none";
    }

    this.renderGrid();
  },

  async confirmOrder() {
    if (this.orderId) return this.openCheckout();
    if (!App.EMPLOYEE.id)
      return App.toast(
        "ไม่พบข้อมูลพนักงานของสาขานี้ ไม่สามารถสร้างออเดอร์ได้",
        true,
      );
    const payload = {
      branchId: Number(document.getElementById("branchId").value),
      employeeId: App.EMPLOYEE.id,
      paymentMethod: document.querySelector('input[name="pay-method"]:checked')
        .value,
      items: this.cart,
    };

    const { ok, data } = await Api.post("/orders", payload);
    if (!ok) return App.toast(data.error, true);

    this.orderId = data.orderId || Date.now().toString().slice(-6);
    this.orderMethod = payload.paymentMethod;

    this.updateUI();
    this.openCheckout();
  },

  openCheckout() {
    document.getElementById("display-order-id").textContent = this.orderId;
    const tr = this.orderMethod === "transfer";
    document.getElementById("cash-box").hidden = tr;
    document.getElementById("tr-box").hidden = !tr;
    document.getElementById("co-title").textContent = tr
      ? "ชำระเงินโอน (QR Code)"
      : "ชำระเงินสด";
    document.getElementById("btn-pay").textContent = tr
      ? "ยืนยันได้รับเงินโอนแล้ว"
      : "ยืนยันชำระเงิน";

    document.getElementById("co-lines").innerHTML = this.cart
      .map(
        (i) =>
          `<div><span>${i.name} × ${i.quantity}</span><span>${App.baht(i.price * i.quantity)}</span></div>`,
      )
      .join("");
    document.getElementById("co-total").textContent =
      App.baht(this.total) + " ฿";

    const b = Math.ceil(this.total / 100) * 100;
    document.getElementById("quick").innerHTML = [
      this.total,
      b,
      b + 100,
      b + 500,
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(
        (v) =>
          `<button onclick="document.getElementById('cash-received').value=${v};Pos.showChange()">${v}</button>`,
      )
      .join("");

    document.getElementById("cash-received").value = "";
    this.showChange();
    this.setStep(2);
    document.getElementById("checkout").classList.add("show");
    if (!tr) document.getElementById("cash-received").focus();
  },

  closeCheckout() {
    document.getElementById("checkout").classList.remove("show");
  },

  showChange() {
    if (this.orderMethod === "transfer") {
      document.getElementById("btn-pay").disabled = false;
      return;
    }
    const c = parseFloat(document.getElementById("cash-received").value);
    const enough = !isNaN(c) && c >= this.total;
    document.getElementById("change-preview").textContent = isNaN(c)
      ? "-"
      : enough
        ? App.baht(c - this.total) + " ฿"
        : "เงินไม่พอ";
    document.getElementById("btn-pay").disabled = !enough;
  },

  async payOrder() {
    const isTransfer = this.orderMethod === "transfer";
    const cash = isTransfer
      ? this.total
      : parseFloat(document.getElementById("cash-received").value);

    if (!isTransfer && (isNaN(cash) || cash < this.total))
      return App.toast("ยอดเงินสดไม่เพียงพอ", true);

    const { ok, data } = await Api.patch(
      `/orders/${this.orderId}/pay`,
      isTransfer ? {} : { cashReceived: cash },
    );
    if (!ok) return App.toast(data.error, true);

    const receipt = {
      orderId: this.orderId,
      branch:
        document.getElementById("branchId").selectedOptions[0].textContent,
      time: new Date(),
      items: this.cart.map((i) => ({ ...i })),
      method: this.orderMethod,
      total: this.total,
      cash,
      change: Number(data.change ?? cash - this.total),
    };

    this.cart = [];
    this.orderId = null;
    localStorage.removeItem("pos_cart");

    await App.initData();
    this.showReceipt(receipt);

    if (data.lowStockMenuIds?.length) {
      App.toast(
        "⚠ ใกล้หมด: " +
          data.lowStockMenuIds
            .map(
              (i) => (App.MENU.find((m) => m.id === i) || {}).name || "ID " + i,
            )
            .join(", "),
      );
    }
  },

  showReceipt(r) {
    const p = (n) => String(n).padStart(2, "0");
    const d = r.time;
    const when = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
    const money = (n) => "฿" + App.baht(n);
    const tr = r.method === "transfer";

    document.getElementById("slip").innerHTML = `
      <div class="slip-shop"><b>ร้านกาแฟ</b><span>${r.branch}</span></div><hr>
      <div class="slip-info"><div>เลขที่ออเดอร์ #${r.orderId}</div><div>วันที่ ${when}</div><div>พนักงาน ${App.EMPLOYEE.name}</div></div><hr>
      <div class="slip-table"><div class="th"><span>รายการ</span><span>จำนวน</span><span>ราคา</span><span>รวม</span></div>
        ${r.items.map((i) => `<div><span>${i.name}</span><span>${i.quantity}</span><span>${i.price}</span><span>${App.baht(i.price * i.quantity)}</span></div>`).join("")}
      </div><hr>
      <div class="slip-total"><span>ยอดรวม</span><strong>${money(r.total)}</strong></div><hr>
      <div class="slip-row"><span>ชำระโดย</span><span>${tr ? "โอนเงิน (QR Code)" : "เงินสด"}</span></div>
      ${tr ? "" : `<div class="slip-row"><span>รับเงินสด</span><span>${money(r.cash)}</span></div><div class="slip-row"><span>เงินทอน</span><b>${money(r.change)}</b></div>`}
      <hr><div class="slip-thanks">ขอบคุณที่ใช้บริการ</div>`;
    this.setStep(3);
    window.currentReceiptData = r;
  },

  newOrder() {
    this.closeCheckout();
    document.getElementById("slip").innerHTML = "";
    document.getElementById("q").focus();
  },

  setStep(n) {
    document
      .querySelectorAll("#steps li")
      .forEach(
        (li, i) =>
          (li.className = i + 1 < n ? "done" : i + 1 === n ? "on" : ""),
      );
    document.getElementById("co-pay").hidden = n !== 2;
    document.getElementById("co-receipt").hidden = n !== 3;
  },
};

document.addEventListener("keydown", (e) => {
  const isCheckoutOpen = document
    .getElementById("checkout")
    .classList.contains("show");

  if (e.key === "Escape" && isCheckoutOpen) return Pos.closeCheckout();

  if (
    e.key === "Enter" &&
    isCheckoutOpen &&
    !document.getElementById("btn-pay").disabled
  ) {
    if (document.getElementById("co-pay").hidden === false) {
      Pos.payOrder();
      return;
    }
  }

  if (
    e.key === "Enter" &&
    document.activeElement === document.getElementById("q")
  ) {
    const code = document.getElementById("q").value.trim();
    if (!code) return;
    const m = App.MENU.find((x) => String(x.id) === code || x.name === code);
    if (m) {
      Pos.addToCart(m.id);
      document.getElementById("q").value = "";
      Pos.renderGrid();
    } else {
      App.toast("ไม่พบสินค้ารหัส: " + code, true);
    }
  }
});
