const Report = {
  data: [],

  async render() {
    const period = document.getElementById("period").value;
    const cur = Number(document.getElementById("branchId").value);

    const { ok, data } = await Api.get(
      `/orders/reports/sales?period=${period}`,
    );
    if (!ok) return App.toast("โหลดรายงานยอดขายไม่สำเร็จ", true);

    this.data = data;
    const sum = data.reduce((a, r) => a + Number(r.sales), 0);
    const ord = data.reduce((a, r) => a + Number(r.orders), 0);
    const low = App.MENU.filter((m) => m.stock <= 5).length;

    document.getElementById("kpis").innerHTML = `
      <div class="kpi main"><small>ยอดขายรวมทั้งหมด (บาท)</small><b>${App.fmt(sum)}</b></div>
      <div class="kpi"><small>จำนวนออเดอร์ (บิล)</small><b>${ord}</b></div>
      <div class="kpi warn"><small>สินค้าใกล้หมด/หมด</small><b>${low} รายการ</b></div>
    `;

    document.getElementById("rtable").innerHTML = data
      .map((r) => {
        const salesVal = Number(r.sales);
        const shareWidth = sum > 0 ? Math.round((salesVal / sum) * 120) : 0;
        return `
          <tr class="${r.id === cur ? "me" : ""}" style="cursor: pointer;" onclick="Report.openBranchModal(${r.id}, '${r.name}')" title="คลิกเพื่อดูรายการของสาขานี้">
            <td>${r.name}${r.id === cur ? ' <span class="tag">สาขาที่เลือก</span>' : ""} <small style="color:var(--mute); display:block;">(คลิกเพื่อดูรายการ)</small></td>
            <td>${r.orders}</td>
            <td>${r.cash_count} / ${r.transfer_count}</td>
            <td><div class="share"><b>${App.fmt(salesVal)}</b><i style="width:${shareWidth}px"></i></div></td>
          </tr>
        `;
      })
      .join("");
  },

  // ฟังก์ชันเปิด Modal ดูรายละเอียดออเดอร์รายสาขา
  async openBranchModal(branchId, branchName) {
    const period = document.getElementById("period")?.value || "today";
    App.showLoader();
    try {
      const { ok, data } = await Api.get(
        `/orders/reports/branch-details?branchId=${branchId}&period=${period}`,
      );
      if (!ok) {
        App.toast("ไม่สามารถโหลดรายละเอียดได้", true);
        return;
      }

      document.getElementById("branch-modal-title").textContent =
        `รายการขาย: ${branchName}`;
      const tbody = document.getElementById("branch-detail-table");

      if (!data.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="empty">ไม่มีรายการขายในช่วงเวลานี้</td></tr>';
      } else {
        tbody.innerHTML = data
          .map(
            (item) => `
          <tr>
            <td>#${item.order_id}</td>
            <td>${new Date(item.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.</td>
            <td><strong>${item.menu_name}</strong></td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">${App.baht(item.subtotal)} ฿</td>
          </tr>
        `,
          )
          .join("");
      }

      document.getElementById("branch-modal").classList.add("show");
    } catch (e) {
      console.error(e);
      App.toast("เกิดข้อผิดพลาดในการเชื่อมต่อ", true);
    } finally {
      App.hideLoader();
    }
  },

  // ฟังก์ชันปิด Modal รายละเอียด
  closeBranchModal() {
    document.getElementById("branch-modal").classList.remove("show");
  },

  exportCsv() {
    if (!this.data.length)
      return App.toast("ยังไม่มีข้อมูลรายงานให้ส่งออก", true);
    const periodName =
      document.getElementById("period").selectedOptions[0].textContent;
    const csv =
      `\ufeffรายงานยอดขาย (${periodName})\nสาขา,ออเดอร์,สด,โอน,ยอดขาย\n` +
      this.data
        .map((r) =>
          [r.name, r.orders, r.cash_count, r.transfer_count, r.sales].join(","),
        )
        .join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    a.download = `sales-summary-${periodName}.csv`;
    a.click();
    App.toast("ส่งออกรายงานแบบย่อ (CSV) แล้ว");
  },

  // สร้างไฟล์ HTML เสมือนสำหรับสั่งพิมพ์เป็นรายงานเต็มรูปแบบ (PDF)
  buildReportHtml({ period, branchName, menuRows }) {
    const esc = (v) =>
      String(v).replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
      );
    const thDate = (d, withTime) => {
      const p = (n) => String(n).padStart(2, "0");
      const day = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
      return withTime ? `${day} ${p(d.getHours())}:${p(d.getMinutes())}` : day;
    };

    const now = new Date(),
      money = (n) => App.fmt(Number(n)) + " บาท",
      isWeek = period === "week";
    const title = `รายงานสรุปยอดขาย${isWeek ? "สัปดาห์นี้" : "ประจำวัน"} - ${esc(branchName)}`;

    let menuHtml =
      '<tr><td colspan="4" class="c">ไม่สามารถโหลดยอดขายรายเมนูได้</td></tr>';
    if (menuRows) {
      const qty = menuRows.reduce((a, r) => a + Number(r.qty), 0),
        sum = menuRows.reduce((a, r) => a + Number(r.sales), 0);
      menuHtml = `<tr><th>เมนู<br>Menu</th><th>จำนวนที่ขาย<br>Qty Sold</th><th>ราคาต่อหน่วย<br>Unit Price</th><th>ยอดขายรวม (บาท)<br>Total Sales (Baht)</th></tr>
        ${menuRows.length ? menuRows.map((r) => `<tr><td>${esc(r.name)}</td><td class="c">${r.qty}</td><td class="c">${money(r.unit_price)}</td><td class="r">${money(r.sales)}</td></tr>`).join("") : '<tr><td colspan="4" class="c">ไม่มียอดขายในช่วงเวลานี้</td></tr>'}
        <tr class="gt"><td>รวมทั้งหมด<br>Grand Total</td><td class="c">${qty}</td><td class="c">--</td><td class="r">${money(sum)}</td></tr>`;
    }

    const tot = this.data.reduce(
      (a, r) => ({
        o: a.o + Number(r.orders),
        c: a.c + Number(r.cash_count),
        t: a.t + Number(r.transfer_count),
        s: a.s + Number(r.sales),
      }),
      { o: 0, c: 0, t: 0, s: 0 },
    );
    const branchHtml = this.data
      .map(
        (r) =>
          `<tr><td>${esc(r.name)}</td><td class="c">${r.orders}</td><td class="c">${r.cash_count} / ${r.transfer_count}</td><td class="r">${money(r.sales)}</td></tr>`,
      )
      .join("");

    return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>@page{size:A4;margin:14mm} *{-webkit-print-color-adjust:exact;print-color-adjust:exact} body{font-family:'Prompt','Sarabun',sans-serif;color:#111;margin:0} h1{text-align:center;font-size:22px;margin:0 0 14px} h2{font-size:16px;margin:20px 0 8px} table{width:100%;border-collapse:collapse;font-size:14px} th,td{border:1.5px solid #333;padding:6px 10px;vertical-align:middle} th{background:#d9d9d9;text-align:center;line-height:1.3} .sec td{background:#d9d9d9;font-weight:700} .c{text-align:center}.r{text-align:right} .gt td{background:#f1f1f1;font-weight:700} .foot{margin-top:10px;font-size:11px;color:#666}</style></head><body>
    <h1>${title}</h1>
    <table><tr class="sec"><td colspan="4">ข้อมูลเบื้องต้น / Base Information</td></tr>
    <tr><td colspan="2">${isWeek ? "ช่วงเวลา: สัปดาห์นี้ (ถึงวันที่ " + thDate(now) + ")" : "วันที่: " + thDate(now)}</td><td colspan="2">พนักงาน: ${esc(App.EMPLOYEE.name)} (${App.EMPLOYEE.id})</td></tr>${menuHtml}</table>
    <h2>เปรียบเทียบยอดขายรายสาขา (GROUP BY branch_id)</h2>
    <table><tr><th>สาขา</th><th>จำนวนออเดอร์</th><th>ชำระเงิน (สด / โอน)</th><th>ยอดขายรวม (บาท)</th></tr>${branchHtml}
    <tr class="gt"><td>รวมทั้งหมด<br>Grand Total</td><td class="c">${tot.o}</td><td class="c">${tot.c} / ${tot.t}</td><td class="r">${money(tot.s)}</td></tr></table>
    <div class="foot">พิมพ์เมื่อ ${thDate(now, true)}</div></body></html>`;
  },

  async exportPDF() {
    if (!this.data.length)
      return App.toast("ยังไม่มีข้อมูลรายงานให้ส่งออก", true);
    const period = document.getElementById("period").value;
    const branchId = Number(document.getElementById("branchId").value);
    const branchName =
      document.getElementById("branchId").selectedOptions[0].textContent;
    let menuRows = null;

    try {
      const { ok, data } = await Api.get(
        `/orders/reports/menu-sales?branchId=${branchId}&period=${period}`,
      );
      if (ok && Array.isArray(data)) menuRows = data;
    } catch (e) {}

    if (!menuRows)
      App.toast(
        "โหลดยอดขายรายเมนูไม่ได้\nส่งออกเฉพาะตารางเปรียบเทียบรายสาขา",
        true,
      );

    const html = this.buildReportHtml({ period, branchName, menuRows });
    const f = document.createElement("iframe");
    f.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    const w = f.contentWindow;
    w.document.open();
    w.document.write(html);
    w.document.close();

    (w.document.fonts?.ready || Promise.resolve()).then(() =>
      setTimeout(() => {
        w.focus();
        w.print();
        setTimeout(() => f.remove(), 60000);
      }, 300),
    );
  },

  printThermalReceipt() {
    const r = window.currentReceiptData;
    if (!r) return App.toast("ไม่มีข้อมูลใบเสร็จ", true);
    App.toast("ส่งคำสั่งไปเครื่องพิมพ์...");

    if (navigator.usb) {
      console.log("ส่งข้อมูลใบเสร็จ Order:", r.orderId, "ออกทาง WebUSB...");
    }

    setTimeout(() => window.print(), 300);
  },
};
