const App = {
  // =========================================================
  // พนักงานที่กำลังใช้งาน
  // =========================================================
  EMPLOYEE: {
    id: null,
    name: "-",
  },

  MENU: [],
  CATS: [],

  // สาขาที่โหลดพนักงาน/เมนูล่าสุด (ใช้เทียบตอน route เปลี่ยน)
  loadedBranch: null,

  CAT_TH: {
    Coffee: "กาแฟ",
    Bakery: "เบเกอรี่",
  },

  // =========================================================
  // Utility Functions
  // =========================================================

  baht: (n) => Number(n).toFixed(2),

  fmt: (n) =>
    Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    }),

  showLoader() {
    const loader = document.getElementById("global-loader");

    if (loader) {
      loader.style.display = "flex";
    }
  },

  hideLoader() {
    const loader = document.getElementById("global-loader");

    if (loader) {
      loader.style.display = "none";
    }
  },

  toast(msg, err = false) {
    const t = document.getElementById("toast");

    if (!t) return;

    t.textContent = msg;
    t.className = "toast show" + (err ? " err" : "");

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      t.className = "toast";
    }, 3000);
  },

  // =========================================================
  // CATEGORY STYLE
  // =========================================================

  CAT_STYLE: {
    1: {
      icon: "☕",
      bg: "#F3E5D0",
    },

    2: {
      icon: "🥖",
      bg: "#f6e2af",
    },

    3: {
      icon: "🍰",
      bg: "#E8E1F7",
    },

    4: {
      icon: "🥤",
      bg: "#DDEEDC",
    },

    5: {
      icon: "🍵",
      bg: "#F8DCE5",
    },
  },

  CAT_STYLE_BY_NAME: {
    กาแฟ: 1,
    เบเกอรี่: 2,
    เค้ก: 3,
    เครื่องดื่มอื่นๆ: 4,
    ชา: 5,
  },

  catStyle(catId, catName) {
    const key = this.CAT_STYLE_BY_NAME[catName] || Number(catId);

    return (
      this.CAT_STYLE[key] || {
        icon: "☕",
        bg: "#e3f1ec",
      }
    );
  },

  // =========================================================
  // MAP MENU DATA
  // =========================================================

  mapMenuRow(row) {
    const dbCat = this.CATS.find(
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

  // =========================================================
  // LOAD EMPLOYEE
  // โหลดเฉพาะพนักงานของสาขาที่เลือก
  // =========================================================

  async loadEmployee() {
    const branchSelect = document.getElementById("branchId");

    const select = document.getElementById("emp-select");

    // หา branchId จาก dropdown
    const branchId = Number(branchSelect?.value || 0);

    // Reset พนักงานคนเดิมก่อนโหลดใหม่
    this.EMPLOYEE = {
      id: null,
      name: "-",
    };

    if (!select) {
      return;
    }

    if (!branchId) {
      select.innerHTML = '<option value="">กรุณาเลือกสาขา</option>';

      return;
    }

    // แสดงสถานะกำลังโหลด
    select.innerHTML = '<option value="">พนักงาน: กำลังโหลด...</option>';

    try {
      // =====================================================
      // ส่ง branchId ไป Backend
      // เช่น /employees?branchId=2
      // =====================================================

      const res = await Api.get(`/employees?branchId=${branchId}`);

      // ผู้ใช้เปลี่ยนสาขาไปแล้วระหว่างรอ -> ไม่ต้องอัปเดต dropdown
      if (branchId !== Number(branchSelect?.value || 0)) return;

      console.log(`Employees branch ${branchId}:`, res);

      // =====================================================
      // ถ้ามีพนักงาน
      // =====================================================

      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        select.innerHTML = res.data
          .map(
            (e) => `
              <option value="${e.id}">
                ${e.name} (${e.id})
              </option>
            `,
          )
          .join("");

        // เลือกพนักงานคนแรกของสาขานี้
        select.selectedIndex = 0;

        // เก็บพนักงานปัจจุบัน
        this.selectEmployee(select.value);

        return;
      }

      // =====================================================
      // ไม่พบพนักงาน
      // =====================================================

      console.error("employees API:", res);

      select.innerHTML = '<option value="">ไม่พบพนักงานในสาขานี้</option>';

      this.toast(res.data?.error || "ไม่พบพนักงานของสาขานี้", true);
    } catch (err) {
      console.error("loadEmployee error:", err);

      select.innerHTML = '<option value="">โหลดพนักงานไม่สำเร็จ</option>';

      this.toast("โหลดข้อมูลพนักงานไม่สำเร็จ", true);
    }
  },

  // =========================================================
  // SELECT EMPLOYEE
  // =========================================================

  selectEmployee(employeeId) {
    const select = document.getElementById("emp-select");

    if (!select || !employeeId) {
      this.EMPLOYEE = {
        id: null,
        name: "-",
      };

      return;
    }

    const opt = select.selectedOptions[0];

    this.EMPLOYEE = {
      id: Number(employeeId),

      name: opt?.textContent?.replace(/\s*\(\d+\)\s*$/, "").trim() || "-",
    };

    console.log("Current employee:", this.EMPLOYEE);
  },

  // =========================================================
  // INIT DATA
  // โหลดข้อมูลทั้งหมดตามสาขาปัจจุบัน
  // =========================================================

  async initData() {
    this.loadedBranch = Number(document.getElementById("branchId")?.value || 0);
    const branchAtStart = this.loadedBranch;
    try {
      // -----------------------------------------------------
      // 1. โหลดพนักงานตามสาขา
      // -----------------------------------------------------

      await this.loadEmployee();

      // -----------------------------------------------------
      // 2. โหลดหมวดหมู่
      // -----------------------------------------------------

      const resCat = await Api.get("/categories");

      if (resCat.ok && Array.isArray(resCat.data)) {
        this.CATS = resCat.data.map((c) => ({
          id: c.category_id || c.id,

          name: c.name,
        }));
      } else {
        this.CATS = [];
      }

      // -----------------------------------------------------
      // 3. หา branch ปัจจุบัน
      // -----------------------------------------------------

      const branchSelect = document.getElementById("branchId");

      const branchId = Number(branchSelect?.value || 0);

      if (!branchId) {
        this.toast("ไม่พบสาขาที่เลือก", true);

        return;
      }

      // -----------------------------------------------------
      // 4. โหลดเมนูตามสาขา
      // -----------------------------------------------------

      const resMenu = await Api.get(`/menu?branchId=${branchId}`);

      // ถ้าระหว่างรอผู้ใช้เปลี่ยนสาขาอีก ให้ทิ้งผลลัพธ์เก่า
      if (branchAtStart !== this.loadedBranch) return;

      if (!resMenu.ok) {
        this.toast("โหลดเมนูจาก Backend ไม่สำเร็จ", true);
      } else {
        this.MENU = Array.isArray(resMenu.data)
          ? resMenu.data.map((row) => this.mapMenuRow(row))
          : [];
      }

      // -----------------------------------------------------
      // 5. Render UI
      // -----------------------------------------------------

      if (typeof Pos !== "undefined") {
        Pos.renderChips();
        Pos.restoreCart();
      }

      if (typeof Menu !== "undefined") {
        Menu.renderTable();
      }

      if (typeof Report !== "undefined") {
        Report.render();
      }
    } catch (err) {
      console.error("initData error:", err);

      this.toast("โหลดข้อมูลระบบไม่สำเร็จ", true);
    }
  },

  // =========================================================
  // ROUTER
  // =========================================================

  PAGES: ["pos", "menu", "report"],

  // =========================================================
  // GET CURRENT BRANCH
  // =========================================================

  getBranchId() {
    return Number(document.getElementById("branchId")?.value || 1);
  },

  // =========================================================
  // GET ROUTE
  //
  // รูปแบบ:
  // #/branch/1/pos
  // #/branch/1/menu
  // #/branch/1/report
  // =========================================================

  getRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);

    // -------------------------------------------------------
    // Route ใหม่
    // -------------------------------------------------------

    if (parts[0] === "branch") {
      const branchId = Number(parts[1]);

      const page = parts[2];

      if (
        Number.isInteger(branchId) &&
        branchId > 0 &&
        this.PAGES.includes(page)
      ) {
        return {
          branchId,
          page,
        };
      }
    }

    // -------------------------------------------------------
    // รองรับ URL แบบเดิม
    //
    // #/pos
    // #/menu
    // #/report
    // -------------------------------------------------------

    if (this.PAGES.includes(parts[0])) {
      return {
        branchId: this.getBranchId(),

        page: parts[0],
      };
    }

    // -------------------------------------------------------
    // Default
    // -------------------------------------------------------

    return {
      branchId: this.getBranchId(),

      page: "pos",
    };
  },

  // =========================================================
  // GET PAGE
  // =========================================================

  pageFromHash() {
    return this.getRoute().page;
  },

  // =========================================================
  // CREATE BRANCH ROUTE
  // =========================================================

  branchRoute(branchId, page = "pos") {
    return `#/branch/${Number(branchId)}/${page}`;
  },

  // =========================================================
  // GO TO PAGE
  // =========================================================

  goTo(page) {
    const target = this.branchRoute(this.getBranchId(), page);

    if (location.hash !== target) {
      location.hash = target;
    } else {
      this.showPage(page);
    }
  },

  // =========================================================
  // CHANGE BRANCH
  //
  // เมื่อเปลี่ยนสาขา:
  // 1. URL เปลี่ยน
  // 2. hashchange ทำงาน
  // 3. initData()
  // 4. โหลดพนักงานใหม่
  // 5. โหลดเมนูใหม่
  // =========================================================

  async changeBranch(branchId) {
    const id = Number(branchId);

    if (!id) {
      return;
    }

    const currentRoute = this.getRoute();

    const page = currentRoute.page || "pos";

    const target = this.branchRoute(id, page);

    console.log("Change branch:", id);

    console.log("New route:", target);

    // -------------------------------------------------------
    // เปลี่ยน URL
    // hashchange จะเรียก initData() ให้อีกที
    // -------------------------------------------------------

    if (location.hash !== target) {
      location.hash = target;

      return;
    }

    // -------------------------------------------------------
    // กรณี URL เหมือนเดิม
    // โหลดข้อมูลใหม่เอง
    // -------------------------------------------------------

    await this.initData();
  },

  // =========================================================
  // SHOW PAGE
  // =========================================================

  showPage(p) {
    const route = this.getRoute();

    const branchSelect = document.getElementById("branchId");

    // -------------------------------------------------------
    // ให้ dropdown ตรงกับ branch ใน URL
    // -------------------------------------------------------

    if (branchSelect && String(branchSelect.value) !== String(route.branchId)) {
      branchSelect.value = String(route.branchId);
    }

    // -------------------------------------------------------
    // ปิดทุกหน้า
    // -------------------------------------------------------

    document.querySelectorAll(".nav[data-p], .page").forEach((e) => {
      e.classList.remove("on");
    });

    // -------------------------------------------------------
    // เปิดหน้าปัจจุบัน
    // -------------------------------------------------------

    const targetPage = document.getElementById(route.page);

    const targetNav = document.querySelector(`.nav[data-p="${route.page}"]`);

    const btnBack = document.getElementById("btn-back");

    if (targetPage) {
      targetPage.classList.add("on");
    }

    if (targetNav) {
      targetNav.classList.add("on");
    }

    if (btnBack) {
      btnBack.hidden = route.page === "pos";
    }
  },

  // =========================================================
  // SETUP NAVIGATION
  // =========================================================

  setupNavigation() {
    // -------------------------------------------------------
    // เมนูด้านซ้าย
    // -------------------------------------------------------

    document.querySelectorAll(".nav[data-p]").forEach((btn) => {
      btn.onclick = () => {
        this.goTo(btn.dataset.p);
      };
    });

    // -------------------------------------------------------
    // ปุ่มย้อนกลับ
    // -------------------------------------------------------

    const btnBack = document.getElementById("btn-back");

    if (btnBack) {
      btnBack.onclick = () => {
        this.goTo("pos");
      };
    }

    // -------------------------------------------------------
    // เมื่อ URL / Hash เปลี่ยน
    // -------------------------------------------------------

    window.addEventListener("hashchange", async () => {
      const route = this.getRoute();

      const branchSelect = document.getElementById("branchId");

      // ⭐ สำคัญ: เทียบกับสาขาที่โหลดข้อมูลล่าสุด
      // (ห้ามอ่านจาก dropdown เพราะตอนเลือกสาขา ค่าเปลี่ยนไปก่อน hashchange แล้ว)
      const oldBranch = this.loadedBranch;

      console.log("Old branch:", oldBranch);

      console.log("New branch:", route.branchId);

      // แสดงหน้าตาม route
      this.showPage(route.page);

      // ---------------------------------------------------
      // ถ้าสาขาเปลี่ยน
      // โหลดข้อมูลใหม่ทั้งหมด
      // ---------------------------------------------------

      if (oldBranch !== route.branchId) {
        console.log("Branch changed -> reload data");

        await this.initData();
      }
    });

    // -------------------------------------------------------
    // เปิดเว็บครั้งแรก
    // -------------------------------------------------------

    const route = this.getRoute();

    const canonical = this.branchRoute(route.branchId, route.page);

    // -------------------------------------------------------
    // ถ้า URL ยังเป็นแบบเก่า
    // เปลี่ยนเป็น route ใหม่
    // -------------------------------------------------------

    if (location.hash !== canonical) {
      history.replaceState(null, "", canonical);
    }

    // แสดงหน้าปัจจุบัน
    this.showPage(route.page);
  },
};

// ===========================================================
// ENTER KEY HANDLING
// ===========================================================

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------------------------------
  // 1. ช่องกรอกเงินสด
  // -------------------------------------------------------

  const cashInput = document.getElementById("cash-received");

  if (cashInput) {
    cashInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();

        const btnPay = document.getElementById("btn-pay");

        if (btnPay && !btnPay.disabled) {
          Pos.payOrder();
        }
      }
    });
  }

  // -------------------------------------------------------
  // 2. ฟอร์มเพิ่ม/แก้ไขเมนู
  // -------------------------------------------------------

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

// ===========================================================
// START APPLICATION
// ===========================================================

window.onload = async () => {
  // ตั้ง Router ก่อน
  App.setupNavigation();

  // โหลดข้อมูลครั้งแรก
  await App.initData();
};
