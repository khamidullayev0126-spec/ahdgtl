// AI LEGENDS: admin havola yaratadi, o'quvchi kiradi, admin bekor qilsa — havola ishlamay qoladi
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, ADMIN_PASSWORD } = require("./helpers");

let srv, base;
const ADMIN = { "Content-Type": "application/json", "x-admin-password": ADMIN_PASSWORD };
before(async () => { srv = await startServer(); base = srv.base; });
after(async () => { await srv.stop(); });

test("kurs havolasi: bekor qilinsa yopiladi, tiklansa yana ochiladi", async () => {
  const inv = await (await fetch(base + "/api/legends/invite", { method: "POST", headers: ADMIN, body: JSON.stringify({ ism: "Test O'quvchi", guruh: "A", kun: 30 }) })).json();
  const enter = await fetch(inv.link, { redirect: "manual" });
  const cookie = enter.headers.get("set-cookie").split(";")[0];
  const me = () => fetch(base + "/api/legends/me", { headers: { cookie } }).then(r => r.status);
  assert.equal(await me(), 200);

  const bekor = v => fetch(base + "/api/legends/bekor", { method: "POST", headers: ADMIN, body: JSON.stringify({ id: inv.id, bekor: v }) });
  assert.equal((await bekor(true)).status, 200);
  assert.equal(await me(), 401);
  const list = await (await fetch(base + "/api/legends/oquvchilar", { headers: ADMIN })).json();
  assert.equal(list.find(x => x.id === inv.id).bekor, true);

  assert.equal((await bekor(false)).status, 200);
  assert.equal(await me(), 200);
});

test("kurs havolasi: admin bo'lmagan odam bekor qila olmaydi", async () => {
  const r = await fetch(base + "/api/legends/bekor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "x" }) });
  assert.equal(r.status, 401);
});
