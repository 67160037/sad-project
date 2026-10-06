const API_URL = "http://localhost:3000/api"; // ปรับพอร์ตให้ตรงกับ Backend
const EMPLOYEE = { id: 67160037, name: "พิชชาพร" };

let MENU = [];
let CATS = []; // หมวดหมู่จาก Backend: [{ id, name }]
let editingId = null; // null = กำลังเพิ่มเมนูใหม่, มีค่า = กำลังแก้ไขเมนูนั้น
let CURRENT_REPORT = []; // เก็บข้อมูลรายงานสำหรับ Export CSV
const CAT_TH = { Coffee: "กาแฟ", Bakery: "เบเกอรี่" }; // แปลชื่อหมวดใน DB เป็นภาษาไทย

// ฟังก์ชันแปลงข้อมูลเมนูและกำหนดไอคอน/สีพื้นหลังอัตโนมัติตามชื่อ
function mapMenuRow(row) {
  const name = row.name || "";
  let cat = "กาแฟ";
  let bg = "#e3f1ec";
  let icon = "☕";

  if (name.includes("ลาเต้") || name.includes("เย็น") || name.includes("ชา")) {
    icon = "🧋";
    bg = "#e3f1ec";
    cat = "กาแฟ";
  } else if (
    name.includes("มอคค่า") ||
    name.includes("กาแฟ") ||
    name.includes("อเมริกาโน่") ||
    name.includes("เอสเพรสโซ่")
  ) {
    icon = "☕";
    bg = "#f6ead9";
    cat = "กาแฟ";
  } else if (name.includes("ครัวซองต์") || name.includes("ขนมปัง")) {
    icon = "🥐";
    bg = "#faeacb";
    cat = "เบเกอรี่";
  } else if (
    name.includes("เค้ก") ||
    name.includes("ส้ม") ||
    name.includes("เบเกอรี่")
  ) {
    icon = "🍰";
    bg = "#fbe3d6";
    cat = "เบเกอรี่";
  }

  const dbCat = CATS.find((c) => c.id === row.category_id);

  return {
    id: row.id || row.menu_id,
    name: row.name,
    price: Number(row.price),
    catId: row.category_id,
    cat: row.cat || (dbCat ? dbCat.name : cat),
    icon: row.icon || icon,
    bg: row.bg || bg,
    stock: row.stock_quantity ?? row.stock,
  };
}

async function loadCategories() {
  try {
    const { ok, data } = await api("/menu/categories", "GET");
    if (ok && Array.isArray(data))
      CATS = data.map((c) => ({ id: c.id, name: CAT_TH[c.name] || c.name }));
  } catch (e) {
    CATS = []; // ถ้าโหลดไม่ได้ จะใช้การเดาหมวดจากชื่อเมนูสำรอง
  }
}

async function loadMenu() {
  const branchId = Number($("branchId").value);
  try {
    const { ok, data } = await api(`/menu?branchId=${branchId}`, "GET");
    if (!ok) return toast(data.error || "โหลดเมนูไม่สำเร็จ", true);
    MENU = data.map(mapMenuRow);
  } catch (e) {
    return toast(
      "โหลดเมนูจาก Backend ไม่ได้\nตรวจสอบว่า Backend รันอยู่ที่ " + API_URL,
      true,
    );
  }
  renderChips();
  renderGrid();
  renderMenuTable();
  renderReport();
}

let cart = [],
  total = 0,
  orderId = null,
  cat = "ทั้งหมด";
let orderMethod = "cash"; // วิธีชำระของบิลปัจจุบัน (cash | transfer)
const payMethod = () =>
  document.querySelector('input[name="pay-method"]:checked').value;
const $ = (id) => document.getElementById(id),
  baht = (n) => n.toFixed(2),
  fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });
const stockTag = (m) =>
  m.stock === 0
    ? ["out", "หมดชั่วคราว"]
    : m.stock <= 5
      ? ["low", "⚠ ใกล้หมด เหลือ " + m.stock]
      : ["", "เหลือ " + m.stock];

function toast(msg, err) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (err ? " err" : "");
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (t.className = "toast"), 3600);
}

/* ---------- สลับหน้า (จำหน้าไว้ใน URL เช่น #/report) ---------- */
const PAGES = ["pos", "menu", "report"];
const pageFromHash = () => {
  const id = location.hash.replace(/^#\/?/, "");
  return PAGES.includes(id) ? id : "pos";
};

function showPage(id) {
  document
    .querySelectorAll(".nav,.page")
    .forEach((e) => e.classList.remove("on"));
  $(id).classList.add("on");
  document.querySelector(`.nav[data-p="${id}"]`).classList.add("on");
  $("btn-back").hidden = id === "pos";
}

function goPage(id) {
  if (id === pageFromHash()) return;
  history.pushState({ depth: (history.state?.depth || 0) + 1 }, "", "#/" + id);
  showPage(id);
}
document
  .querySelectorAll(".nav")
  .forEach((n) => (n.onclick = () => goPage(n.dataset.p)));

window.addEventListener("popstate", () => showPage(pageFromHash()));
$("btn-back").onclick = () => {
  if ((history.state?.depth || 0) > 0) history.back();
  else {
    history.replaceState({ depth: 0 }, "", "#/pos");
    showPage("pos");
  }
};

history.replaceState(history.state || { depth: 0 }, "", "#/" + pageFromHash());
showPage(pageFromHash());

/* ---------- POS ---------- */
function renderChips() {
  const q = $("q")?.value || "";
  $("chips").innerHTML =
    [
      "ทั้งหมด",
      ...(CATS.length ? CATS.map((c) => c.name) : ["กาแฟ", "เบเกอรี่"]),
    ]
      .map(
        (c) =>
          `<button class="chip ${c === cat ? "on" : ""}" onclick="cat='${c}';renderChips();renderGrid()">${c}</button>`,
      )
      .join("") +
    `<input class="search" id="q" placeholder="ค้นหาเมนู..." value="${q}" oninput="renderGrid()">`;
}

function renderGrid() {
  const q = ($("q")?.value || "").trim();
  $("grid").innerHTML =
    MENU.filter(
      (m) => (cat === "ทั้งหมด" || m.cat === cat) && m.name.includes(q),
    )
      .map((m) => {
        const n = (cart.find((i) => i.menuItemId === m.id) || {}).quantity || 0,
          s = stockTag(m);
        return `<button class="item" ${m.stock ? "" : "disabled"} onclick="addToCart(${m.id})">${n ? `<span class="qty-badge">${n}</span>` : ""}
<div class="pic" style="background:${m.bg}">${m.icon}</div><h3>${m.name}</h3>
<div class="row"><span class="price">${m.price}.-</span><span class="tag ${s[0]}">${s[1]}</span></div></button>`;
      })
      .join("") || '<div class="empty">ไม่พบเมนูที่ค้นหา</div>';
}

function addToCart(id) {
  if (orderId) return toast("กรุณาชำระบิลปัจจุบันให้เสร็จก่อน", true);
  const m = MENU.find((x) => x.id === id),
    it = cart.find((i) => i.menuItemId === id);
  if (it) {
    if (it.quantity >= m.stock)
      return toast("สต็อก " + m.name + " เหลือ " + m.stock + " ชิ้น", true);
    it.quantity++;
  } else
    cart.push({
      menuItemId: id,
      name: m.name,
      price: m.price,
      quantity: 1,
    });
  updateUI();
}

function changeQty(id, d) {
  const it = cart.find((i) => i.menuItemId === id),
    m = MENU.find((x) => x.id === id);
  it.quantity += d;
  if (it.quantity > m.stock) {
    it.quantity = m.stock;
    toast("สต็อกไม่พอ", true);
  }
  if (it.quantity <= 0) cart = cart.filter((i) => i !== it);
  updateUI();
}

function clearCart() {
  cart = [];
  updateUI();
}

function updateUI() {
  total = 0;
  $("cart-list").innerHTML = cart.length
    ? cart
        .map((i) => {
          const s = i.price * i.quantity;
          total += s;
          const d = orderId ? "disabled" : "";
          return `<div class="line"><div><strong>${i.name}</strong><br><small>${i.price} x ${i.quantity}</small></div>
    <div class="step"><button ${d} aria-label="ลด" onclick="changeQty(${i.menuItemId},-1)">−</button><button ${d} aria-label="เพิ่ม" onclick="changeQty(${i.menuItemId},1)">+</button></div><b>${baht(s)}</b></div>`;
        })
        .join("")
    : '<div class="empty"><div>🛒</div>ตะกร้ายังว่าง<br>แตะเมนูทางซ้ายเพื่อเริ่มออเดอร์</div>';
  $("sub-price").textContent = baht(total);
  $("total-price").textContent = baht(total) + " ฿";
  $("btn-create").disabled = !cart.length;
  $("btn-create").textContent = orderId ? "ไปชำระเงิน" : "ยืนยันออเดอร์";
  // ล็อกวิธีชำระเมื่อสร้างบิลแล้ว (บันทึกลงบิลตอนสร้างออเดอร์)
  document
    .querySelectorAll('input[name="pay-method"]')
    .forEach((r) => (r.disabled = !!orderId));
  $("btn-clear").style.display = cart.length && !orderId ? "block" : "none";
  renderGrid();
}

/* ---------- API & Checkout ---------- */
const DEMO_MODE = false;

async function api(path, method, body, demo) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json() };
  } catch (e) {
    if (DEMO_MODE) return { ok: true, data: demo() };
    throw e;
  }
}

async function confirmOrder() {
  if (orderId) return openCheckout();
  const payload = {
    branchId: Number($("branchId").value),
    employeeId: EMPLOYEE.id,
    paymentMethod: payMethod(),
    items: cart,
  };
  try {
    const { ok, data } = await api("/orders", "POST", payload, () => ({
      orderId: Date.now().toString().slice(-6),
    }));
    if (!ok) return toast(data.error, true);
    orderId = data.orderId;
    orderMethod = payload.paymentMethod;
    $("bill-tag").textContent = "บิล #" + orderId;
    updateUI();
    openCheckout();
  } catch (e) {
    toast(
      "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้\nตรวจสอบว่า Backend รันอยู่ที่ " + API_URL,
      true,
    );
  }
}

function setStep(n) {
  document
    .querySelectorAll("#steps li")
    .forEach(
      (li, i) => (li.className = i + 1 < n ? "done" : i + 1 === n ? "on" : ""),
    );
  $("co-pay").hidden = n !== 2;
  $("co-receipt").hidden = n !== 3;
}

function openCheckout() {
  $("display-order-id").textContent = orderId;
  const tr = orderMethod === "transfer";
  $("cash-box").hidden = tr;
  $("tr-box").hidden = !tr;
  $("co-title").textContent = tr ? "ชำระเงินโอน (QR Code)" : "ชำระเงินสด";
  $("btn-pay").textContent = tr ? "ยืนยันได้รับเงินโอนแล้ว" : "ยืนยันชำระเงิน";
  $("co-lines").innerHTML = cart
    .map(
      (i) =>
        `<div><span>${i.name} × ${i.quantity}</span><span>${baht(i.price * i.quantity)}</span></div>`,
    )
    .join("");
  $("co-total").textContent = baht(total) + " ฿";
  const b = Math.ceil(total / 100) * 100;
  $("quick").innerHTML = [total, b, b + 100, b + 400]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(
      (v) =>
        `<button onclick="$('cash-received').value=${v};showChange()">${v}</button>`,
    )
    .join("");
  $("cash-received").value = "";
  showChange();
  setStep(2);
  $("checkout").classList.add("show");
  if (!tr) $("cash-received").focus();
}

function closeCheckout() {
  $("checkout").classList.remove("show");
}

function showChange() {
  if (orderMethod === "transfer") {
    $("btn-pay").disabled = false;
    return;
  }
  const c = parseFloat($("cash-received").value),
    enough = !isNaN(c) && c >= total;
  $("change-preview").textContent = isNaN(c)
    ? "-"
    : enough
      ? baht(c - total) + " ฿"
      : "เงินไม่พอ";
  $("btn-pay").disabled = !enough;
}

async function payOrder() {
  const isTransfer = orderMethod === "transfer";
  const cash = isTransfer ? total : parseFloat($("cash-received").value);
  if (!isTransfer && (isNaN(cash) || cash < total))
    return toast("ยอดเงินสดไม่เพียงพอ", true);
  try {
    const { ok, data } = await api(
      `/orders/${orderId}/pay`,
      "PATCH",
      isTransfer ? {} : { cashReceived: cash },
      () => ({ change: cash - total }),
    );
    if (!ok) return toast(data.error, true);

    const receipt = {
      orderId,
      branch: $("branchId").selectedOptions[0].textContent,
      time: new Date(),
      items: cart.map((i) => ({ ...i })),
      method: orderMethod,
      total,
      cash,
      change: Number(data.change ?? cash - total),
    };

    cart = [];
    orderId = null;
    $("bill-tag").textContent = "ยังไม่ยืนยัน";

    await loadMenu();
    updateUI();
    renderReport();
    showReceipt(receipt);

    if (data.lowStockMenuIds?.length)
      toast(
        "⚠ ใกล้หมด: " +
          data.lowStockMenuIds
            .map((i) => (MENU.find((m) => m.id === i) || {}).name || "ID " + i)
            .join(", "),
      );
  } catch (e) {
    toast("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", true);
  }
}

function showReceipt(r) {
  const p = (n) => String(n).padStart(2, "0"),
    d = r.time,
    when = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`,
    num = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2)),
    money = (n) => "฿" + num(n),
    tr = r.method === "transfer";
  $("slip").innerHTML = `
    <div class="slip-shop"><b>ร้านกาแฟ</b><span>${r.branch}</span></div>
    <hr>
    <div class="slip-info">
      <div>เลขที่ออเดอร์ #${r.orderId}</div>
      <div>วันที่ ${when}</div>
      <div>พนักงาน ${EMPLOYEE.name}</div>
    </div>
    <hr>
    <div class="slip-table">
      <div class="th"><span>รายการ</span><span>จำนวน</span><span>ราคา</span><span>รวม</span></div>
      ${r.items
        .map(
          (i) =>
            `<div><span>${i.name}</span><span>${i.quantity}</span><span>${num(i.price)}</span><span>${num(i.price * i.quantity)}</span></div>`,
        )
        .join("")}
    </div>
    <hr>
    <div class="slip-total"><span>ยอดรวม</span><strong>${money(r.total)}</strong></div>
    <hr>
    <div class="slip-row"><span>ชำระโดย</span><span>${tr ? "โอนเงิน (QR Code)" : "เงินสด"}</span></div>
    ${
      tr
        ? ""
        : `<div class="slip-row"><span>รับเงินสด</span><span>${money(r.cash)}</span></div>
    <div class="slip-row"><span>เงินทอน</span><b>${money(r.change)}</b></div>`
    }
    <hr>
    <div class="slip-thanks">ขอบคุณที่ใช้บริการ</div>`;
  setStep(3);
  $("checkout").classList.add("show");
}

function newOrder() {
  $("checkout").classList.remove("show");
  $("slip").innerHTML = "";
}

/* ---------- เมนู & จัดการเมนู (CRUD) ---------- */
function renderMenuTable() {
  const q = ($("mq")?.value || "").trim();
  $("mtable").innerHTML = MENU.filter(
    (m) => String(m.id).includes(q) || m.name.includes(q),
  )
    .map((m) => {
      const s = stockTag(m);
      return `<tr><td>${m.id}</td><td><div class="thumb" style="background:${m.bg}">${m.icon}</div></td><td>${m.name}</td><td>${m.cat}</td><td>${baht(m.price)}</td>
    <td><span class="tag ${s[0]}">${m.stock}${s[0] === "low" ? " · ใกล้หมด" : s[0] === "out" ? " · หมด" : ""}</span></td>
    <td><button class="edit" onclick="openMenuForm(${m.id})">แก้ไข</button></td></tr>`;
    })
    .join("");
}

function openMenuForm(id) {
  if (!CATS.length)
    return toast(
      "โหลดหมวดหมู่ไม่ได้\nตรวจสอบว่าอัปเดตไฟล์ Backend ของเมนูครบแล้ว",
      true,
    );
  const m = id == null ? null : MENU.find((x) => x.id === id);
  editingId = m ? m.id : null;
  $("mf-title").textContent = m ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่";
  $("mf-cat").innerHTML = CATS.map(
    (c) => `<option value="${c.id}">${c.name}</option>`,
  ).join("");
  $("mf-name").value = m ? m.name : "";
  $("mf-cat").value = m && m.catId ? m.catId : CATS[0].id;
  $("mf-price").value = m ? m.price : "";
  $("mf-stock").value = m ? m.stock : 0;
  $("menu-form").classList.add("show");
  $("mf-name").focus();
}

function closeMenuForm() {
  $("menu-form").classList.remove("show");
}

async function saveMenu() {
  const name = $("mf-name").value.trim(),
    price = Number($("mf-price").value),
    stock = Number($("mf-stock").value),
    categoryId = Number($("mf-cat").value);
  if (!name) return toast("กรุณากรอกชื่อเมนู", true);
  if (!(price > 0)) return toast("ราคาต้องมากกว่า 0", true);
  if (!Number.isInteger(stock) || stock < 0)
    return toast("สต็อกต้องเป็นจำนวนเต็ม 0 ขึ้นไป", true);

  const body = {
    branchId: Number($("branchId").value),
    categoryId,
    name,
    price,
    stockQuantity: stock,
  };
  $("mf-save").disabled = true;
  try {
    const { ok, data } =
      editingId == null
        ? await api("/menu", "POST", body)
        : await api(`/menu/${editingId}`, "PUT", body);
    if (!ok) return toast(data.error || "บันทึกเมนูไม่สำเร็จ", true);
    toast(editingId == null ? "เพิ่มเมนูแล้ว" : "บันทึกการแก้ไขแล้ว");
    closeMenuForm();
    await loadMenu();
    updateUI();
  } catch (e) {
    toast("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", true);
  } finally {
    $("mf-save").disabled = false;
  }
}

/* ---------- รายงานยอดขาย (ดึงจาก Backend จริง) ---------- */
async function renderReport() {
  const period = $("period")?.value === "week" ? "week" : "today";
  const cur = Number($("branchId").value);

  try {
    const { ok, data } = await api(
      `/orders/reports/sales?period=${period}`,
      "GET",
    );
    if (!ok) {
      toast("โหลดรายงานยอดขายไม่สำเร็จ", true);
      return;
    }
    CURRENT_REPORT = data;

    const sum = CURRENT_REPORT.reduce((a, r) => a + Number(r.sales), 0);
    const ord = CURRENT_REPORT.reduce((a, r) => a + Number(r.orders), 0);
    const low = MENU.filter((m) => m.stock <= 5).length;

    $("kpis").innerHTML = `
      <div class="kpi main"><small>ยอดขายรวมทั้งหมด (บาท)</small><b>${fmt(sum)}</b></div>
      <div class="kpi"><small>จำนวนออเดอร์ (บิล)</small><b>${ord}</b></div>
      <div class="kpi warn"><small>สินค้าใกล้หมด/หมด</small><b>${low} รายการ</b></div>
    `;

    $("rtable").innerHTML = CURRENT_REPORT.map((r) => {
      const salesVal = Number(r.sales);
      const shareWidth = sum > 0 ? Math.round((salesVal / sum) * 120) : 0;
      return `
        <tr class="${r.id === cur ? "me" : ""}">
          <td>${r.name}${r.id === cur ? ' <span class="tag">สาขาที่เลือก</span>' : ""}</td>
          <td>${r.orders}</td>
          <td>${r.cash_count} / ${r.transfer_count}</td>
          <td><div class="share"><b>${fmt(salesVal)}</b><i style="width:${shareWidth}px"></i></div></td>
        </tr>
      `;
    }).join("");
  } catch (e) {
    console.error(e);
    toast("เชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดรายงานไม่ได้", true);
  }
}

function exportCsv() {
  const periodName = $("period")?.selectedOptions[0]?.textContent || "วันนี้";
  const csv =
    `\ufeffรายงานยอดขาย (${periodName})\nสาขา,ออเดอร์,สด,โอน,ยอดขาย\n` +
    CURRENT_REPORT.map((r) =>
      [r.name, r.orders, r.cash_count, r.transfer_count, r.sales].join(","),
    ).join("\n");

  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  a.download = `sales-summary-${periodName}.csv`;
  a.click();
  toast("ส่งออกรายงานแล้ว");
}

/* ---------- ส่งออกรายงานเป็นเอกสาร (พิมพ์ / บันทึกเป็น PDF) ---------- */
const esc = (v) =>
  String(v).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function thDate(d, withTime) {
  const p = (n) => String(n).padStart(2, "0");
  const day = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
  return withTime ? `${day} ${p(d.getHours())}:${p(d.getMinutes())}` : day;
}

function buildReportHtml({ period, branchName, menuRows }) {
  const now = new Date(),
    money = (n) => fmt(Number(n)) + " บาท",
    isWeek = period === "week";
  const title = `รายงานสรุปยอดขาย${isWeek ? "สัปดาห์นี้" : "ประจำวัน"} - ${esc(branchName)}`;

  let menuHtml;
  if (menuRows) {
    const qty = menuRows.reduce((a, r) => a + Number(r.qty), 0),
      sum = menuRows.reduce((a, r) => a + Number(r.sales), 0);
    menuHtml = `
      <tr><th>เมนู<br>Menu</th><th>จำนวนที่ขาย<br>Qty Sold</th><th>ราคาต่อหน่วย<br>Unit Price</th><th>ยอดขายรวม (บาท)<br>Total Sales (Baht)</th></tr>
      ${
        menuRows.length
          ? menuRows
              .map(
                (r) =>
                  `<tr><td>${esc(r.name)}</td><td class="c">${r.qty}</td><td class="c">${money(r.unit_price)}</td><td class="r">${money(r.sales)}</td></tr>`,
              )
              .join("")
          : '<tr><td colspan="4" class="c">ไม่มียอดขายในช่วงเวลานี้</td></tr>'
      }
      <tr class="gt"><td>รวมทั้งหมด<br>Grand Total</td><td class="c">${qty}</td><td class="c">--</td><td class="r">${money(sum)}</td></tr>`;
  } else {
    menuHtml =
      '<tr><td colspan="4" class="c">ไม่สามารถโหลดยอดขายรายเมนูได้</td></tr>';
  }

  const tot = CURRENT_REPORT.reduce(
    (a, r) => ({
      o: a.o + Number(r.orders),
      c: a.c + Number(r.cash_count),
      t: a.t + Number(r.transfer_count),
      s: a.s + Number(r.sales),
    }),
    { o: 0, c: 0, t: 0, s: 0 },
  );
  const branchHtml = CURRENT_REPORT.map(
    (r) =>
      `<tr><td>${esc(r.name)}</td><td class="c">${r.orders}</td><td class="c">${r.cash_count} / ${r.transfer_count}</td><td class="r">${money(r.sales)}</td></tr>`,
  ).join("");

  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:14mm}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Prompt','Sarabun','Loma',sans-serif;color:#111;margin:0}
h1{text-align:center;font-size:22px;margin:0 0 14px}
h2{font-size:16px;margin:20px 0 8px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{border:1.5px solid #333;padding:6px 10px;vertical-align:middle}
th{background:#d9d9d9;text-align:center;line-height:1.3}
.sec td{background:#d9d9d9;font-weight:700}
.c{text-align:center}.r{text-align:right}
.gt td{background:#f1f1f1;font-weight:700}
.foot{margin-top:10px;font-size:11px;color:#666}
</style></head><body>
<h1>${title}</h1>
<table>
 <tr class="sec"><td colspan="4">ข้อมูลเบื้องต้น / Base Information</td></tr>
 <tr><td colspan="2">${isWeek ? "ช่วงเวลา: สัปดาห์นี้ (ถึงวันที่ " + thDate(now) + ")" : "วันที่: " + thDate(now)}</td><td colspan="2">พนักงาน: ${esc(EMPLOYEE.name)} (${EMPLOYEE.id})</td></tr>
 ${menuHtml}
</table>
<h2>เปรียบเทียบยอดขายรายสาขา (GROUP BY branch_id)</h2>
<table>
 <tr><th>สาขา</th><th>จำนวนออเดอร์</th><th>ชำระเงิน (สด / โอน)</th><th>ยอดขายรวม (บาท)</th></tr>
 ${branchHtml}
 <tr class="gt"><td>รวมทั้งหมด<br>Grand Total</td><td class="c">${tot.o}</td><td class="c">${tot.c} / ${tot.t}</td><td class="r">${money(tot.s)}</td></tr>
</table>
<div class="foot">พิมพ์เมื่อ ${thDate(now, true)}</div>
</body></html>`;
}

// พิมพ์ผ่าน iframe ที่ซ่อนไว้ (ไม่โดนบล็อก popup) แล้วเลือก "บันทึกเป็น PDF" ในหน้าต่างพิมพ์ได้
function printHtml(html) {
  const f = document.createElement("iframe");
  f.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(f);
  const w = f.contentWindow;
  w.document.open();
  w.document.write(html);
  w.document.close();
  const go = () => {
    w.focus();
    w.print();
    setTimeout(() => f.remove(), 60000);
  };
  (w.document.fonts?.ready || Promise.resolve()).then(() =>
    setTimeout(go, 300),
  );
}

async function exportReport() {
  if (!CURRENT_REPORT.length)
    return toast("ยังไม่มีข้อมูลรายงานให้ส่งออก", true);
  const period = $("period")?.value === "week" ? "week" : "today",
    branchId = Number($("branchId").value),
    branchName = $("branchId").selectedOptions[0].textContent;
  let menuRows = null;
  try {
    const { ok, data } = await api(
      `/orders/reports/menu-sales?branchId=${branchId}&period=${period}`,
      "GET",
    );
    if (ok && Array.isArray(data)) menuRows = data;
  } catch (e) {}
  if (!menuRows)
    toast("โหลดยอดขายรายเมนูไม่ได้\nส่งออกเฉพาะตารางเปรียบเทียบรายสาขา", true);
  printHtml(buildReportHtml({ period, branchName, menuRows }));
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("co-pay").hidden) closeCheckout();
});

const cashInput = $("cash-received");
if (cashInput) {
  cashInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("btn-pay").disabled) payOrder();
  });
}

// เริ่มต้นโหลดหมวดหมู่และเมนูจาก Backend ทันทีที่เปิดหน้าเว็บ
loadCategories()
  .then(loadMenu)
  .then(() => {
    updateUI();
  });
