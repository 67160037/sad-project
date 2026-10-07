// เข้าหน้าเว็บ/รีเฟรชทุกครั้ง = เริ่มตะกร้าใหม่
// (ล้างของที่ค้างจากรอบก่อน)
try {
  localStorage.removeItem("pos_cart");
} catch (e) {}

const Pos = {
  cart: [],
  total: 0,
  serverTotal: null, // totalAmount จาก response 201 ของ POST /orders
  orderId: null,
  orderMethod: "cash",

  // =========================================================
  // พนักงานที่รับออเดอร์ "ของออเดอร์ปัจจุบัน"
  // จะไม่เปลี่ยนตาม Dropdown หลังจากกดยืนยันออเดอร์แล้ว
  // =========================================================
  orderEmployee: {
    id: null,
    name: "-",
  },

  cat: "ทั้งหมด",

  // =========================================================
  // วาดตะกร้าปัจจุบันใหม่
  // =========================================================
  restoreCart() {
    this.updateUI();
  },

  // =========================================================
  // เซฟตะกร้าลง LocalStorage
  // =========================================================
  saveCart() {
    localStorage.setItem("pos_cart", JSON.stringify(this.cart));
  },

  // =========================================================
  // กลับมาแก้ไขรายการ
  // =========================================================
  editOrder() {
    if (confirm("คุณต้องการกลับไป 'แก้ไขรายการ' ใช่หรือไม่?")) {
      this.orderId = null;

      this.saveCart();
      this.updateUI();

      App.toast("ปลดล็อกรายการแล้ว สามารถเพิ่ม/ลดเมนูได้เลย");
    }
  },

  // =========================================================
  // ยกเลิกบิล / ล้างตะกร้า
  // =========================================================
  async clearCartConfirm() {
    const msg = this.orderId
      ? "คุณแน่ใจหรือไม่ว่าต้องการ 'ยกเลิกบิลนี้' และทิ้งรายการทั้งหมด?"
      : "คุณแน่ใจหรือไม่ว่าต้องการล้างรายการในตะกร้าทั้งหมด?";

    if (confirm(msg)) {
      this.cart = [];
      this.orderId = null;
      this.serverTotal = null;

      // ล้างพนักงานของออเดอร์เก่า
      this.orderEmployee = {
        id: null,
        name: "-",
      };

      this.saveCart();
      this.updateUI();

      App.toast("ยกเลิกและล้างตะกร้าเรียบร้อย");
    }
  },

  // =========================================================
  // แสดงหมวดหมู่
  // =========================================================
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
            `<button class="chip ${
              c === this.cat ? "on" : ""
            }" onclick="Pos.cat='${c}';Pos.renderChips();Pos.renderGrid()">${c}</button>`,
        )
        .join("") +
      `<input class="search" id="q" placeholder="ค้นหาเมนู (สแกนบาร์โค้ดได้เลย)..." value="${q}" oninput="Pos.renderGrid()">`;
  },

  // =========================================================
  // แสดงเมนู
  // =========================================================
  renderGrid() {
    const q = (document.getElementById("q")?.value || "").trim();

    document.getElementById("grid").innerHTML =
      App.MENU.filter(
        (m) =>
          (this.cat === "ทั้งหมด" || m.cat === this.cat) && m.name.includes(q),
      )
        .map((m) => {
          const n = this.cart
            .filter((i) => i.menuItemId === m.id)
            .reduce((sum, i) => sum + i.quantity, 0);

          const s =
            m.stock === 0
              ? ["out", "หมดชั่วคราว"]
              : m.stock <= 5
                ? ["low", "⚠ ใกล้หมด เหลือ " + m.stock]
                : ["", "เหลือ " + m.stock];

          return `
            <button
              class="item"
              ${m.stock ? "" : "disabled"}
              onclick="Pos.addToCart(${m.id})"
            >
              ${n ? `<span class="qty-badge">${n}</span>` : ""}

              <div
                class="pic"
                style="background:${m.bg}"
              >
                ${m.icon}
              </div>

              <h3>${m.name}</h3>

              <div class="row">
                <span class="price">${m.price}.-</span>
                <span class="tag ${s[0]}">${s[1]}</span>
              </div>
            </button>
          `;
        })
        .join("") || '<div class="empty">ไม่พบเมนูที่ค้นหา</div>';
  },

  // =========================================================
  // กดเมนู
  // ถ้าเป็นเครื่องดื่ม -> เปิดตัวเลือก
  // =========================================================
  addToCart(id) {
    if (this.orderId) {
      return App.toast("บิลถูกสร้างแล้ว กรุณากด 'แก้ไข' ก่อนเพิ่มเมนู", true);
    }

    const m = App.MENU.find((x) => x.id === id);

    if (!m) {
      return App.toast("ไม่พบเมนู", true);
    }

    if (m.stock <= 0) {
      return App.toast("เมนูนี้หมดชั่วคราว", true);
    }

    const isDrink = [1, 2, 5].includes(Number(m.catId));

    this.pendingItem = {
      menuItemId: id,
      name: m.name,
      price: m.price,
    };

    // ถ้าไม่ใช่เครื่องดื่ม
    if (!isDrink) {
      this.addConfiguredItem({
        sweet: "",
        ice: "",
        extras: [],
      });

      return;
    }

    // =========================================================
    // Modal ตัวเลือกเครื่องดื่ม
    // =========================================================
    document.getElementById("item-options-title").textContent =
      `เลือกตัวเลือก: ${m.name}`;

    document.getElementById("item-options-body").innerHTML = `
      <div class="item-option-group">
        <span class="item-option-label">
          ระดับความหวาน
        </span>

        <div class="item-option-grid">
          ${["100%", "75%", "50%", "25%", "0% ไม่หวาน"]
            .map(
              (v, i) =>
                `<button
                  type="button"
                  class="item-option ${i === 2 ? "selected" : ""}"
                  data-option="sweet"
                  data-value="${v}"
                  onclick="Pos.selectItemOption(this)"
                >
                  ${v}
                </button>`,
            )
            .join("")}
        </div>
      </div>

      <div class="item-option-group">
        <span class="item-option-label">
          ระดับน้ำแข็ง
        </span>

        <div class="item-option-grid">
          ${["ปกติ", "น้อย", "ไม่ใส่"]
            .map(
              (v, i) =>
                `<button
                  type="button"
                  class="item-option ${i === 0 ? "selected" : ""}"
                  data-option="ice"
                  data-value="${v}"
                  onclick="Pos.selectItemOption(this)"
                >
                  ${v}
                </button>`,
            )
            .join("")}
        </div>
      </div>

      <div class="item-option-group">
        <span class="item-option-label">
          เพิ่มเติม
        </span>

        <div class="item-option-grid">
          ${["เพิ่มช็อต", "เพิ่มไข่มุก", "เพิ่มวิปครีม"]
            .map(
              (v) =>
                `<button
                  type="button"
                  class="item-option"
                  data-option="extras"
                  data-value="${v}"
                  onclick="Pos.toggleItemExtra(this)"
                >
                  ${v}
                </button>`,
            )
            .join("")}

          <button
            type="button"
            class="item-option item-option-wide selected"
            data-option="extras"
            data-value=""
            onclick="Pos.clearItemExtras(this)"
          >
            ไม่เพิ่ม
          </button>
        </div>
      </div>
    `;

    document.getElementById("item-options").classList.add("show");
  },

  // =========================================================
  // เลือก Sweet / Ice
  // =========================================================
  selectItemOption(btn) {
    const group = btn.dataset.option;

    document
      .querySelectorAll(`#item-options .item-option[data-option="${group}"]`)
      .forEach((b) => b.classList.remove("selected"));

    btn.classList.add("selected");
  },

  // =========================================================
  // เพิ่ม Option
  // =========================================================
  toggleItemExtra(btn) {
    document
      .querySelector(
        '#item-options .item-option[data-option="extras"][data-value=""]',
      )
      ?.classList.remove("selected");

    btn.classList.toggle("selected");
  },

  // =========================================================
  // ไม่เพิ่ม Option
  // =========================================================
  clearItemExtras(btn) {
    document
      .querySelectorAll('#item-options .item-option[data-option="extras"]')
      .forEach((b) => b.classList.remove("selected"));

    btn.classList.add("selected");
  },

  // =========================================================
  // ยืนยันตัวเลือกเครื่องดื่ม
  // =========================================================
  confirmItemOptions() {
    const sweet =
      document.querySelector(
        '#item-options .item-option[data-option="sweet"].selected',
      )?.dataset.value || "";

    const ice =
      document.querySelector(
        '#item-options .item-option[data-option="ice"].selected',
      )?.dataset.value || "";

    const extras = [
      ...document.querySelectorAll(
        '#item-options .item-option[data-option="extras"].selected',
      ),
    ]
      .map((b) => b.dataset.value)
      .filter(Boolean);

    this.addConfiguredItem({
      sweet,
      ice,
      extras,
    });

    this.closeItemOptions();
  },

  // =========================================================
  // ปิด Modal ตัวเลือก
  // =========================================================
  closeItemOptions() {
    document.getElementById("item-options")?.classList.remove("show");

    this.pendingItem = null;
  },

  // =========================================================
  // เพิ่มสินค้าลงตะกร้าพร้อม Option
  // =========================================================
  addConfiguredItem(options) {
    const m = App.MENU.find(
      (x) =>
        x.id === this.pendingItem?.menuItemId || x.id === options.menuItemId,
    );

    const menuItemId = this.pendingItem?.menuItemId || options.menuItemId;

    if (!m || !menuItemId) {
      return;
    }

    const key = JSON.stringify({
      menuItemId,
      sweet: options.sweet || "",
      ice: options.ice || "",
      extras: options.extras || [],
    });

    const it = this.cart.find((i) => i.key === key);

    const totalForMenu = this.cart
      .filter((i) => i.menuItemId === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (totalForMenu >= m.stock) {
      return App.toast("สต็อก " + m.name + " เหลือ " + m.stock + " ชิ้น", true);
    }

    if (it) {
      it.quantity++;
    } else {
      this.cart.push({
        menuItemId,
        name: m.name,
        price: m.price,
        quantity: 1,
        sweet: options.sweet || "",
        ice: options.ice || "",
        extras: options.extras || [],
        key,
      });
    }

    this.saveCart();
    this.updateUI();
  },

  // =========================================================
  // เพิ่ม / ลดจำนวน
  // =========================================================
  changeQty(index, d) {
    const it = this.cart[index];

    if (!it) {
      return;
    }

    const m = App.MENU.find((x) => x.id === it.menuItemId);

    it.quantity += d;

    const totalForMenu = this.cart
      .filter((x) => x.menuItemId === it.menuItemId)
      .reduce((sum, x) => sum + x.quantity, 0);

    if (totalForMenu > m.stock) {
      it.quantity -= d;

      return App.toast("สต็อกไม่พอ", true);
    }

    if (it.quantity <= 0) {
      this.cart.splice(index, 1);
    }

    this.saveCart();
    this.updateUI();
  },

  // =========================================================
  // อัปเดตหน้าจอหลัก
  // =========================================================
  updateUI() {
    this.total = 0;

    const cartEl = document.getElementById("cart-list");

    if (this.cart.length) {
      cartEl.innerHTML = this.cart
        .map((i, index) => {
          const s = i.price * i.quantity;

          this.total += s;

          const d = this.orderId ? "disabled" : "";

          const opts = [
            i.sweet && `หวาน ${i.sweet}`,
            i.ice && `น้ำแข็ง ${i.ice}`,
            ...(i.extras || []),
          ].filter(Boolean);

          return `
            <div class="line">

              <div>
                <strong>
                  ${i.name}
                </strong>

                <br>

                <small>
                  ${i.price} x ${i.quantity}
                </small>

                ${
                  opts.length
                    ? `
                      <br>
                      <small class="cart-options">
                        ${opts.join(" · ")}
                      </small>
                    `
                    : ""
                }
              </div>

              <div class="step">
                <button
                  ${d}
                  aria-label="ลด"
                  onclick="Pos.changeQty(${index},-1)"
                >
                  −
                </button>

                <button
                  ${d}
                  aria-label="เพิ่ม"
                  onclick="Pos.changeQty(${index},1)"
                >
                  +
                </button>
              </div>

              <b>
                ${App.baht(s)}
              </b>

            </div>
          `;
        })
        .join("");
    } else {
      cartEl.innerHTML =
        '<div class="empty"><div>🛒</div>ตะกร้ายังว่าง<br>แตะเมนูทางซ้ายเพื่อเริ่มออเดอร์</div>';
    }

    // เมื่อมีบิลแล้ว
    // ใช้ยอดรวมจาก Server เป็นหลัก
    if (this.orderId && Number.isFinite(this.serverTotal)) {
      this.total = this.serverTotal;
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

    // =========================================================
    // ป้ายสถานะ + ปุ่ม
    // =========================================================
    const billTag = document.getElementById("bill-tag");

    const actionRow = document.getElementById("action-row");

    const btnClear = document.getElementById("btn-clear");

    if (this.orderId) {
      billTag.innerHTML = `
        <span
          class="tag warn"
          style="font-size:0.85rem;"
        >
          ⏳ รอชำระ
          (บิล #${this.orderId})
        </span>
      `;

      actionRow.style.display = "flex";

      btnClear.style.display = "none";
    } else if (this.cart.length) {
      billTag.innerHTML = `
        <span
          class="tag"
          style="
            background:#e3f1ec;
            color:var(--brand-d);
            font-size:0.85rem;
          "
        >
          🛒 กำลังจัดรายการ
        </span>
      `;

      actionRow.style.display = "none";

      btnClear.style.display = "block";
    } else {
      billTag.innerHTML = `<span>ยังไม่ยืนยัน</span>`;

      actionRow.style.display = "none";

      btnClear.style.display = "none";
    }

    this.renderGrid();
  },

  // =========================================================
  // ยืนยันออเดอร์
  // =========================================================
  async confirmOrder() {
    // ถ้ามี Order แล้ว
    // ให้ไปหน้าชำระเงิน
    if (this.orderId) {
      return this.openCheckout();
    }

    // ต้องเลือกพนักงานก่อน
    if (!App.EMPLOYEE.id) {
      return App.toast("กรุณาเลือกพนักงานผู้รับออเดอร์ก่อน", true);
    }

    // =========================================================
    // สำคัญ:
    // จำพนักงาน ณ ตอนกดยืนยันออเดอร์
    // =========================================================
    this.orderEmployee = {
      id: App.EMPLOYEE.id,
      name: App.EMPLOYEE.name,
    };

    const payload = {
      branchId: Number(document.getElementById("branchId").value),

      employeeId: this.orderEmployee.id,

      paymentMethod: document.querySelector('input[name="pay-method"]:checked')
        .value,

      items: this.cart,
    };

    // ส่ง Order ไป Server
    const { ok, data } = await Api.post("/orders", payload);

    // ถ้าสร้าง Order ไม่สำเร็จ
    if (!ok) {
      return App.toast(data.error || "ไม่สามารถสร้างออเดอร์ได้", true);
    }

    // ต้องได้เลข Order จาก Server
    if (!data.orderId) {
      return App.toast(
        "ไม่ได้รับเลขที่ออเดอร์จากเซิร์ฟเวอร์ กรุณาลองใหม่",
        true,
      );
    }

    // เก็บเลข Order
    this.orderId = data.orderId;

    // ยอดรวมจาก Server
    this.serverTotal = Number(data.totalAmount);

    // วิธีชำระเงิน
    this.orderMethod = payload.paymentMethod;

    this.updateUI();

    this.openCheckout();
  },

  // =========================================================
  // เปิดหน้าชำระเงิน
  // =========================================================
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
          `
            <div>
              <span>
                ${i.name} × ${i.quantity}
              </span>

              <span>
                ${App.baht(i.price * i.quantity)}
              </span>
            </div>
          `,
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
          `
            <button
              onclick="
                document.getElementById(
                  'cash-received'
                ).value=${v};
                Pos.showChange()
              "
            >
              ${v}
            </button>
          `,
      )
      .join("");

    document.getElementById("cash-received").value = "";

    this.showChange();

    this.setStep(2);

    document.getElementById("checkout").classList.add("show");

    if (!tr) {
      document.getElementById("cash-received").focus();
    }
  },

  // =========================================================
  // กลับมาแก้ไขรายการ
  // =========================================================
  backToEdit() {
    this.closeCheckout();

    if (this.orderId) {
      this.orderId = null;

      this.saveCart();
      this.updateUI();

      App.toast("กลับมาแก้ไขรายการได้แล้ว (ถ้าไม่ต้องการบิลนี้ให้กด 'ยกเลิก')");
    }
  },

  // =========================================================
  // ปิดหน้าชำระเงิน
  // =========================================================
  closeCheckout() {
    document.getElementById("checkout").classList.remove("show");
  },

  // =========================================================
  // คำนวณเงินทอน
  // =========================================================
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

  // =========================================================
  // ชำระเงิน
  // =========================================================
  async payOrder() {
    const isTransfer = this.orderMethod === "transfer";

    const cash = isTransfer
      ? this.total
      : parseFloat(document.getElementById("cash-received").value);

    if (!isTransfer && (isNaN(cash) || cash < this.total)) {
      return App.toast("ยอดเงินสดไม่เพียงพอ", true);
    }

    const { ok, data } = await Api.patch(
      `/orders/${this.orderId}/pay`,
      isTransfer
        ? {}
        : {
            cashReceived: cash,
          },
    );

    if (!ok) {
      return App.toast(data.error || "ไม่สามารถชำระเงินได้", true);
    }

    // =========================================================
    // สำคัญ:
    // เก็บพนักงานลง Receipt ก่อน reset order
    // =========================================================
    const receipt = {
      orderId: this.orderId,

      branch:
        document.getElementById("branchId").selectedOptions[0].textContent,

      time: new Date(),

      items: this.cart.map((i) => ({
        ...i,
      })),

      method: this.orderMethod,

      total: this.total,

      cash,

      change: Number(data.change ?? cash - this.total),

      // พนักงานของออเดอร์นี้
      employee: {
        id: this.orderEmployee.id,

        name: this.orderEmployee.name,
      },
    };

    // =========================================================
    // ล้างออเดอร์ปัจจุบัน
    // =========================================================
    this.cart = [];

    this.orderId = null;

    this.serverTotal = null;

    localStorage.removeItem("pos_cart");

    await App.initData();

    // แสดงใบเสร็จ
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

  // =========================================================
  // แสดงใบเสร็จ
  // =========================================================
  showReceipt(r) {
    const p = (n) => String(n).padStart(2, "0");

    const d = r.time;

    const when = `${p(d.getDate())}/${p(
      d.getMonth() + 1,
    )}/${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;

    const money = (n) => "฿" + App.baht(n);

    const tr = r.method === "transfer";

    // =========================================================
    // พนักงานของออเดอร์นี้
    // =========================================================
    const employeeName = r.employee?.name || this.orderEmployee?.name || "-";

    document.getElementById("slip").innerHTML = `
      <div class="slip-shop">
        <b>Brew Haven</b>
        <span>${r.branch}</span>
      </div>

      <hr>

      <div class="slip-info">
        <div>
          เลขที่ออเดอร์ #${r.orderId}
        </div>

        <div>
          วันที่ ${when}
        </div>

        <div>
          พนักงาน ${employeeName}
        </div>
      </div>

      <hr>

      <div class="slip-table">

        <div class="th">
          <span>รายการ</span>
          <span>จำนวน</span>
          <span>ราคา</span>
          <span>รวม</span>
        </div>

        ${r.items
          .map((i) => {
            const opts = [
              i.sweet && `หวาน ${i.sweet}`,

              i.ice && `น้ำแข็ง ${i.ice}`,

              ...(i.extras || []),
            ].filter(Boolean);

            return `
              <div class="slip-item-row">

                <span class="slip-item-name">

                  <strong>
                    ${i.name}
                  </strong>

                  ${
                    opts.length
                      ? `
                        <small class="slip-item-options">
                          ${opts.join(" · ")}
                        </small>
                      `
                      : ""
                  }

                </span>

                <span>
                  ${i.quantity}
                </span>

                <span>
                  ${i.price}
                </span>

                <span>
                  ${App.baht(i.price * i.quantity)}
                </span>

              </div>
            `;
          })
          .join("")}

      </div>

      <hr>

      <div class="slip-total">
        <span>ยอดรวม</span>

        <strong>
          ${money(r.total)}
        </strong>
      </div>

      <hr>

      <div class="slip-row">
        <span>ชำระโดย</span>

        <span>
          ${tr ? "โอนเงิน (QR Code)" : "เงินสด"}
        </span>
      </div>

      ${
        tr
          ? ""
          : `
            <div class="slip-row">
              <span>รับเงินสด</span>

              <span>
                ${money(r.cash)}
              </span>
            </div>

            <div class="slip-row">
              <span>เงินทอน</span>

              <b>
                ${money(r.change)}
              </b>
            </div>
          `
      }

      <hr>

      <div class="slip-thanks">
        ขอบคุณที่ใช้บริการ
      </div>
    `;

    this.setStep(3);

    window.currentReceiptData = r;
  },

  // =========================================================
  // ออเดอร์ใหม่
  // =========================================================
  newOrder() {
    this.closeCheckout();

    document.getElementById("slip").innerHTML = "";

    // ล้างข้อมูลออเดอร์เก่า
    this.orderId = null;
    this.serverTotal = null;
    this.orderMethod = "cash";

    this.orderEmployee = {
      id: null,
      name: "-",
    };

    document.getElementById("q").focus();
  },

  // =========================================================
  // เปลี่ยน Step
  // =========================================================
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

// =========================================================
// Keyboard shortcuts
// =========================================================
document.addEventListener("keydown", (e) => {
  const isCheckoutOpen = document
    .getElementById("checkout")
    .classList.contains("show");

  // ESC
  if (e.key === "Escape" && isCheckoutOpen) {
    return document.getElementById("co-pay").hidden
      ? Pos.closeCheckout()
      : Pos.backToEdit();
  }

  // Enter ตอนชำระเงิน
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

  // Enter ตอนค้นหาเมนู / Barcode
  if (
    e.key === "Enter" &&
    document.activeElement === document.getElementById("q")
  ) {
    const code = document.getElementById("q").value.trim();

    if (!code) {
      return;
    }

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
