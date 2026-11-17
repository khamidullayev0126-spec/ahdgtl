// Kanal postlari tarixi: takroriy mavzular aniqlanadi
const test = require("node:test");
const assert = require("node:assert");
const { createChannelHistory, similarity } = require("../kanal-tarix");

function makeStore() { const m = new Map(); return { get: (k, d) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : d), set: (k, v) => m.set(k, v) }; }
const DUCK1 = "🦆 AI bilan \"Rubber duck\" usuli: Xatolarni tezroq toping. Dasturlashda qadimiy usul bor: kodingiz ishlamay qolganda muammoni o'rdakchaga tushuntirasiz. Sun'iy intellekt bilan bu usul yanada kuchli.";
const DUCK2 = "🦆 AI bilan \"Rezina o'rdak\" usuli: kodni tezroq tuzatish siri. Dasturchilar qadimiy usuldan foydalanadi: muammoni o'rdakchaga tushuntirish. Sun'iy intellektga xatoni bosqichma-bosqich tushuntiring.";
const GIT = "🔄 Git nima va u dasturchiga nega kerak? Tasavvur qiling, katta loyiha ustida ishlayapsiz va kecha yozgan kodingiz yo'qoldi. Git versiyalarni saqlaydi, commit va branch tushunchalari.";

test("o'xshash mavzu yuqori, boshqa mavzu past ball oladi", () => {
  assert.ok(similarity(DUCK1, DUCK2) >= 0.38, `duck: ${similarity(DUCK1, DUCK2)}`);
  assert.ok(similarity(DUCK1, GIT) < 0.35, `git: ${similarity(DUCK1, GIT)}`);
  assert.strictEqual(similarity("Salom", DUCK1), 0, "qisqa matn solishtirilmaydi");
});

test("tarix: eksportdan yuklanadi, qo'shiladi, takror yozilmaydi, qidiriladi", () => {
  const store = makeStore();
  const h = createChannelHistory(store);
  h.seed();
  const seeded = h.all().length;
  assert.ok(seeded > 20, "eksport tarixi yuklanishi kerak");
  h.add(GIT, "agent"); h.add(GIT, "kanal"); h.add("qisqa");
  assert.strictEqual(h.all().length, seeded + 1);
  assert.ok(h.similar(DUCK2).length >= 1, "eksportdagi Rubber duck postlari topilishi kerak");
  assert.ok(h.recent(10, "git").some(l => /Git nima/.test(l)));
  h.seed();                                           // ikkinchi marta — ustidan yozmaydi
  assert.strictEqual(h.all().length, seeded + 1);
});
