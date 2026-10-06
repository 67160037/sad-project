// ถ้าเปิดผ่าน Express (พอร์ตเดียวกัน) ใช้ path สัมพัทธ์ ถ้าเปิดจาก Live Server ให้ชี้ไป :3000
const API_URL =
  location.port === "3000" || location.port === ""
    ? "/api"
    : "http://localhost:3000/api";

const Api = {
  // ฟังก์ชัน Fetch พร้อมระบบ Retry อัตโนมัติ (เช่น เน็ตหลุดตอนชำระเงิน)
  async fetchWithRetry(path, options = {}, retries = 2) {
    const config = {
      ...options,
      headers: { "Content-Type": "application/json" },
    };

    for (let i = 0; i <= retries; i++) {
      try {
        App.showLoader();
        const res = await fetch(`${API_URL}${path}`, config);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      } catch (error) {
        if (i === retries) {
          return {
            ok: false,
            data: { error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่" },
          };
        }
        console.warn(`เชื่อมต่อล้มเหลว กำลังลองใหม่ครั้งที่ ${i + 1}...`);
        await new Promise((res) => setTimeout(res, 1000)); // รอ 1 วิแล้วลองใหม่
      } finally {
        App.hideLoader();
      }
    }
  },

  get: (path) => Api.fetchWithRetry(path, { method: "GET" }),
  post: (path, body) =>
    Api.fetchWithRetry(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) =>
    Api.fetchWithRetry(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => Api.fetchWithRetry(path, { method: "DELETE" }),
  patch: (path, body) =>
    Api.fetchWithRetry(path, { method: "PATCH", body: JSON.stringify(body) }),
};
