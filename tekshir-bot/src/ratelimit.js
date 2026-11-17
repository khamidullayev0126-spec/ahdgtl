// So'rovlar chegarasi (10-bosqich): bitta odam daqiqasiga ko'pi bilan N ta xabar tekshira oladi.
// Bu botni spam va ataylab "yuklab tashlash"dan himoya qiladi, tashqi API limitlarini ham tejaydi.
// "Sirpanuvchi oyna": oxirgi 60 soniyadagi so'rovlar sanaladi.

function createLimiter({ limit = 10, windowMs = 60 * 1000 } = {}) {
  const hits = new Map();          // kalit -> [vaqtlar]
  return {
    // Natija: ok — ruxsat; warn — chegaradan birinchi marta oshdi (faqat bir marta ogohlantiramiz)
    hit(key) {
      const now = Date.now();
      const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
      arr.push(now);
      hits.set(key, arr);
      if (hits.size > 10000) for (const [k, v] of hits) if (now - v[v.length - 1] >= windowMs) hits.delete(k);
      return { ok: arr.length <= limit, warn: arr.length === limit + 1 };
    },
    clear: () => hits.clear()
  };
}

module.exports = { createLimiter };
