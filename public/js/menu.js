const Menu = {
  // เปิดฟอร์มเพิ่ม/แก้ไขเมนู และโหลดหมวดหมู่จากระบบมาใส่ Dropdown
  async openForm(id = null) {
    const isEdit = id !== null;
    document.getElementById("mf-title").textContent = isEdit
      ? "แก้ไขเมนู"
      : "เพิ่มเมนูใหม่";

    // โหลดหมวดหมู่ใส่ Dropdown แบบไดนามิก
    const { ok: catOk, data: catData } = await Api.get("/categories");
    const catSelect = document.getElementById("mf-cat");

    if (catOk && catData) {
      catSelect.innerHTML = catData
        .map((c) => `<option value="${c.category_id}">${c.name}</option>`)
        .join("");
    } else {
      catSelect.innerHTML =
        '<option value="1">กาแฟ</option><option value="2">เบเกอรี่</option><option value="3">เครื่องดื่มอื่นๆ</option><option value="4">ชา</option>';
    }

    if (isEdit) {
      const item = App.MENU.find((m) => m.id === id);
      if (item) {
        document.getElementById("mf-name").value = item.name;
        document.getElementById("mf-cat").value = item.catId || 1;
        document.getElementById("mf-price").value = item.price;
        document.getElementById("mf-stock").value = item.stock;
        document.getElementById("menu-form").dataset.editId = id;
      }
    } else {
      document.getElementById("mf-name").value = "";
      document.getElementById("mf-price").value = "";
      document.getElementById("mf-stock").value = "20";
      delete document.getElementById("menu-form").dataset.editId;
    }

    document.getElementById("menu-form").classList.add("show");
  },

  closeForm() {
    document.getElementById("menu-form").classList.remove("show");
  },

  async save() {
    const form = document.getElementById("menu-form");
    const editId = form.dataset.editId;
    const name = document.getElementById("mf-name").value.trim();
    const categoryId = Number(document.getElementById("mf-cat").value);
    const price = parseFloat(document.getElementById("mf-price").value);
    const stock = parseInt(document.getElementById("mf-stock").value);

    if (!name || isNaN(price) || isNaN(stock)) {
      return App.toast("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง", true);
    }

    const payload = {
      branchId: Number(document.getElementById("branchId").value),
      categoryId,
      name,
      price,
      stockQuantity: stock,
      lowStockThreshold: 10,
    };

    let res;
    if (editId) {
      res = await Api.put(`/menu/${editId}`, payload);
    } else {
      res = await Api.post("/menu", payload);
    }

    if (!res.ok) {
      return App.toast(res.data.error || "เกิดข้อผิดพลาดในการบันทึก", true);
    }

    App.toast("บันทึกข้อมูลเมนูสำเร็จ");
    this.closeForm();
    await App.initData();
    this.renderTable();
  },

  async deleteItem(id) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?")) return;

    const { ok, data } = await Api.delete(
      `/menu/${id}?branchId=${Number(document.getElementById("branchId").value)}`,
    );
    if (!ok) {
      return App.toast(data.error || "ไม่สามารถลบเมนูได้", true);
    }

    App.toast("ลบเมนูเรียบร้อยแล้ว");
    await App.initData();
    this.renderTable();
  },

  renderTable() {
    const q = (document.getElementById("mq")?.value || "").trim().toLowerCase();
    const tbody = document.getElementById("mtable");

    const filtered = App.MENU.filter(
      (m) => String(m.id).includes(q) || m.name.toLowerCase().includes(q),
    );

    if (!filtered.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty">ไม่พบข้อมูลเมนู</td></tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (m) => `
      <tr>
        <td>#${m.id}</td>
        <td><div class="pic sm" style="background:${m.bg}">${m.icon}</div></td>
        <td><strong>${m.name}</strong></td>
        <td>${m.cat || "-"}</td>
        <td>${App.baht(m.price)} ฿</td>
        <td><span class="tag ${m.stock === 0 ? "out" : m.stock <= 5 ? "low" : ""}">${m.stock} ชิ้น</span></td>
        <td>
          <button class="btn sm ghost" onclick="Menu.openForm(${m.id})">แก้ไข</button>
          <button class="btn sm ghost danger" onclick="Menu.deleteItem(${m.id})">ลบ</button>
        </td>
      </tr>
    `,
      )
      .join("");
  },
};
