// Testlar uchun soxta Telegram: server haqiqiy Telegram'ga emas, shu yerga "yozadi".
// Yuborilgan har bir so'rov TG_LOG faylga yoziladi — testlar uni o'qib tekshiradi.
const fs = require("fs");
const realFetch = global.fetch;

global.fetch = async (url, options = {}) => {
  const u = String(url);
  if (u.includes("api.telegram.org")) {
    const method = u.split("/").pop();
    const body = typeof options.body === "string" ? JSON.parse(options.body) : options.body instanceof FormData ? Object.fromEntries([...options.body].map(([k, v]) => [k, typeof v === "string" ? v : `[fayl ${v.size} bayt]`])) : {};
    fs.appendFileSync(process.env.TG_LOG, JSON.stringify({ method, body }) + "\n");
    const result = method === "getMe" ? { username: "test_bot" } : { message_id: 1 };
    return new Response(JSON.stringify({ ok: true, result }), { headers: { "content-type": "application/json" } });
  }
  if (/anthropic|googleapis|brevo|upstash/.test(u)) throw new Error("Testda tashqi xizmatga ulanish taqiqlangan: " + u);
  return realFetch(url, options);
};
