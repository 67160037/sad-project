const App = {
  // พนักงานที่กำลังใช้งาน — โหลดจากตาราง employee ใน MySQL (ดู loadEmployee)
  EMPLOYEE: { id: null, name: "-" },
  MENU: [],
  CATS: [],
  CAT_TH: { Coffee: "กาแฟ", Bakery: "เบเกอรี่" },

  // Utility Functions
  baht: (n) => Number(n).toFixed(2),
  fmt: (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 }),

  showLoader() {
    document.getElementById("global-loader").style.display = "flex";
  },
  hideLoader() {
    document.getElementById("global-loader").style.display = "none";
  },

  toast(msg, err = false) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast show" + (err ? " err" : "");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (t.className = "toast"), 3000);
  },

  // ไอคอน + สีพื้นหลัง ตามหมวดหมู่ (ไม่ดูจากชื่อเมนูแล้ว)
  CAT_STYLE: {
    1: { icon: "☕", bg: "#f6ead9" }, // กาแฟ
    2: { icon: "🥐", bg: "#faeacb" }, // เบเกอรี่
    3: { icon: "🥤", bg: "#fbe3d6" }, // เครื่องดื่มอื่นๆ
    4: { icon: "🍵", bg: "#e3f1ec" }, // ชา
  },
  CAT_STYLE_BY_NAME: {
    กาแฟ: 1,
    เบเกอรี่: 2,
    เครื่องดื่มอื่นๆ: 3,
    ชา: 4,
  },

  // หา style จากหมวดหมู่ (id ก่อน, ถ้าไม่เจอลองจากชื่อ)
  catStyle(catId, catName) {
    const key = this.CAT_STYLE_BY_NAME[catName] || Number(catId);
    return this.CAT_STYLE[key] || { icon: "☕", bg: "#e3f1ec" };
  },

  // แปลงข้อมูลแถวจาก Database ให้อยู่ในฟอร์แมต UI โดยไอคอนเปลี่ยนตามหมวดหมู่
  mapMenuRow(row) {
    const dbCat = App.CATS.find(
      (c) => Number(c.id) === Number(row.category_id),
    );
    const catName = dbCat ? dbCat.name : "";
    const style = this.catStyle(row.category_id, catName);
    return {
      id: row.id || row.menu_id,
      name: row.name,
      price: Number(row.price),
      catId: row.category_id,
      cat: catName || App.CAT_TH[row.cat] || row.cat || "-",
      icon: style.icon,
      bg: style.bg,
      stock: row.stock_quantity ?? row.stock,
    };
  },

  // โหลดพนักงานของสาขาที่เลือกจาก MySQL (ใช้พนักงานคนแรกของสาขา)
  async loadEmployee() {
    const branchId = Number(document.getElementById("branchId").value);
    const label = document.getElementById("emp-label");
    this.EMPLOYEE = { id: null, name: "-" };
    label.textContent = "พนักงาน: กำลังโหลด...";
    try {
      const res = await Api.get(`/employees?branchId=${branchId}`);
      if (res.ok && Array.isArray(res.data) && res.data.length) {
        const e = res.data[0];
        this.EMPLOYEE = { id: e.id, name: e.name };
        label.textContent = `พนักงาน: ${e.name} (${e.id})`;
        return;
      }
      console.error("employees API:", res);
      label.textContent = "พนักงาน: ไม่พบข้อมูลในสาขานี้";
      this.toast(res.data?.error || "โหลดข้อมูลพนักงานไม่สำเร็จ", true);
    } catch (err) {
      console.error(err);
      label.textContent = "พนักงาน: โหลดไม่สำเร็จ";
    }
  },

  // ดึงข้อมูลพื้นฐานตั้งต้นทั้งหมด
  async initData() {
    await this.loadEmployee();
    // โหลดหมวดหมู่จากพาท /categories ที่ถูกต้อง
    const resCat = await Api.get("/categories");
    if (resCat.ok && Array.isArray(resCat.data)) {
      this.CATS = resCat.data.map((c) => ({
        id: c.category_id || c.id, // รองรับทั้ง category_id และ id จาก DB
        name: c.name,
      }));
    } else {
      this.CATS = [];
    }

    // โหลดเมนูตามสาขา
    const branchId = Number(document.getElementById("branchId").value);
    const resMenu = await Api.get(`/menu?branchId=${branchId}`);

    if (!resMenu.ok) {
      this.toast("โหลดเมนูจาก Backend ไม่สำเร็จ", true);
    } else {
      this.MENU = resMenu.data.map((row) => this.mapMenuRow(row));
    }

    // สั่งเรนเดอร์ UI ทั้งหมด
    Pos.renderChips();
    Pos.restoreCart();
    Menu.renderTable();
    Report.render();
  },

  PAGES: ["pos", "menu", "report"],

  // อ่านชื่อหน้าจาก URL hash เช่น #/report (ถ้าไม่มีหรือไม่ถูกต้อง ใช้หน้า pos)
  pageFromHash() {
    const p = location.hash.replace(/^#\/?/, "");
    return this.PAGES.includes(p) ? p : "pos";
  },

  // แสดงหน้าที่ต้องการ และจัดการปุ่มย้อนกลับ (Back Button) บน Header
  showPage(p) {
    document
      .querySelectorAll(".nav[data-p], .page")
      .forEach((e) => e.classList.remove("on"));

    const targetPage = document.getElementById(p);
    const targetNav = document.querySelector(`.nav[data-p="${p}"]`);
    const btnBack = document.getElementById("btn-back");

    if (targetPage) targetPage.classList.add("on");
    if (targetNav) targetNav.classList.add("on");

    // จัดการแสดงผลปุ่มย้อนกลับ: แสดงเฉพาะเมื่อไม่ได้อยู่หน้า POS
    if (btnBack) {
      if (p === "pos") {
        btnBack.hidden = true;
      } else {
        btnBack.hidden = false;
      }
    }
  },

  setupNavigation() {
    // กดเมนู -> เปลี่ยน hash (เบราว์เซอร์เก็บเป็นประวัติ ปุ่มย้อนกลับ/ไปข้างหน้าใช้ได้)
    document.querySelectorAll(".nav[data-p]").forEach((btn) => {
      btn.onclick = () => {
        const target = "#/" + btn.dataset.p;
        if (location.hash !== target) location.hash = target;
      };
    });

    // ผูกการทำงานปุ่มย้อนกลับ (Back button) บน Header
    const btnBack = document.getElementById("btn-back");
    if (btnBack) {
      btnBack.onclick = () => {
        location.hash = "#/pos";
      };
    }

    // ย้อนกลับ/ไปข้างหน้า/แก้ URL เอง -> แสดงหน้าตาม hash
    window.addEventListener("hashchange", () =>
      this.showPage(this.pageFromHash()),
    );
    // รีเฟรชหน้า -> กลับมาหน้าเดิมตาม hash
    this.showPage(this.pageFromHash());
  },
};

// ดักจับการกดปุ่ม Enter ทั่วทั้งระบบเพื่อความสะดวกในการใช้งาน
document.addEventListener("DOMContentLoaded", () => {
  // 1. ช่องกรอกเงินสด (ใน Modal ชำระเงิน) - กด Enter เพื่อยืนยันชำระเงิน
  const cashInput = document.getElementById("cash-received");
  if (cashInput) {
    cashInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const btnPay = document.getElementById("btn-pay");
        // ถ้าปุ่มชำระเงินเปิดใช้งานอยู่ (ยอดเงินพอ) ให้กดชำระเงินทันที
        if (btnPay && !btnPay.disabled) {
          Pos.payOrder();
        }
      }
    });
  }

  // 2. ฟอร์มเพิ่ม/แก้ไขเมนู (ช่องชื่อ, ราคา, สต็อก) - กด Enter เพื่อบันทึก
  const menuInputs = ["mf-name", "mf-price", "mf-stock"];
  menuInputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          Menu.save();
        }
      });
    }
  });
});

window.onload = () => {
  App.setupNavigation();
  App.initData();
};
