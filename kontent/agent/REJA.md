# AHdigital agentlari — reja

Bu papka internetda ko'rinmaydi. ✅ — tayyor, 🔜 — keyinroq.

## 1. Telegram agentingizga qo'shildi ✅ (botga oddiy yozasiz)

| Nima | Qanday yozasiz | Narxi |
|---|---|---|
| 💰 **Moliya** — kirim/chiqim, oylik foyda | «Domen uchun 32 000 to'ladim», «Shu oy qancha foyda?» | oddiy xabar narxi |
| 🔔 **Obuna eslatmalari** — har oy/yil | «Claude obunasi har oy 13-sanada, 3 kun oldin eslat» | bepul (faqat eslatma) |
| 💡 **G'oyalar bazasi** | «G'oya: kafelar uchun menyu video» · «Shorts g'oyalarim qani?» | oddiy xabar |
| 🐞 **Xatolar kundaligi** | «Xato: CORS, yechim: cors() qo'shdim» · «CORS'ni qanday tuzatgandim?» | oddiy xabar |
| 📰 **Ertalabki dayjest** | «Har kuni 8:00 da AI va IT yangiliklaridan 5 ta punkt yubor» | ⚠️ har kuni token (internet qidiruvi bilan) |
| 📝 **TZ generatori** | «Lazzat kafe uchun menyu sayt TZ tuz: menyu 4 bo'lim, QR, Telegram tugma, logo bor» → havola mijozga | oddiy xabar |
| 💼 **Tijoriy taklif** | «Gul olami do'koniga taklif tuz: Instagram faol, sayti yo'q» → havola egasiga; ochilsa va «Qiziqaman» bosilsa xabar keladi | oddiy xabar |
| 🧠 **Kunlik mini-mashq** | «Har kuni 19:00 da JavaScript bo'yicha bitta masala ber» | ⚠️ har kuni token |

**Tuzatilgan xato:** 25 kundan uzoq eslatma (masalan, yillik domen to'lovi) oldin vaqtidan ancha erta kelib qolardi. Endi o'z vaqtida keladi.

**Pul haqida ochiq gap:** dayjest va mashq har kuni Claude'ni chaqiradi. Admin panel → «AI xarajatlari»da qancha ketayotganini ko'rib turing. Qimmat bo'lsa — «dayjest eslatmasini o'chir» deb yozing.

## 2. Kompyuterda ishlaydigan bepul skriptlar ✅ (AI'siz)

| Skript | Nima qiladi | Buyruq |
|---|---|---|
| `rasm-webp.js` | JPG/PNG → WebP (sayt tezroq). Asl rasmlar qoladi | `npm i sharp` (bir marta), keyin `node kontent/agent/rasm-webp.js ~/Desktop/rasmlar` |
| `papka-tartib.js` | Downloads/Desktop'ni Rasmlar, Videolar, Hujjatlar... ga ajratadi | `node kontent/agent/papka-tartib.js ~/Downloads` (reja) → oxiriga `--bajar` |
| `kontent-agent.js` | 1 mavzu → blog + Telegram post + Shorts ssenariy + YouTube sarlavhalar | `ANTHROPIC_API_KEY=... node kontent/agent/kontent-agent.js "mavzu"` (token sarflaydi) |

`papka-tartib.js` hech narsani o'chirmaydi va ustiga yozmaydi; birinchi marta doim `--bajar`siz ishga tushiring.

## 3. Kod shart emas — tayyor bepul xizmat
- **Sayt ishlayaptimi (uptime):** uptimerobot.com → bepul akkaunt (ota-onangiz bilan) → «New monitor» → HTTPS → `https://www.ah-digital.uz` → har 5 daqiqa → Alert: **Telegram**. Sayt tushib qolsa darrov xabar keladi. Buni o'zimiz yozishdan ishonchliroq: bizning server tushsa, u o'zini tekshira olmaydi.
- **README va mijoz qo'llanmalari:** menga «shu loyihaga README yoz» deng — shu yerda yozib beraman, alohida agent kerak emas.

## 4. Keyinroq 🔜 (tartib bo'yicha)

| # | Agent | Nima uchun foydali | Nima kerak |
|---|---|---|---|
| 1 | **Haftalik hisobot** (yakshanba 20:00) | Buyurtmalar, pul, AI xarajati, g'oyalar — bitta xabarda | Hozir ham ishlaydi: «Har yakshanba 20:00 da haftalik hisobot yubor» (vazifa) |
| 3 | **«Fikr qoldiring» eslatmasi** | Buyurtma «bajarildi» bo'lgach 2 kun o'tib mijozdan Google'da sharh so'rash matnini tayyorlaydi | Google Business tasdiqlangach |
| 5 | **YouTube/Telegram statistikasi** | Qaysi video/post yaxshi ketdi, izohlardan yangi mavzular | YouTube kanalida 5–10 video bo'lgach; YouTube API kaliti |
| 6 | **Jamoa boti** (do'stingiz bilan) | Vazifalarni bo'lish, guruhda eslatish | Haqiqatan sherik bilan ish boshlanganda |

**Maslahatim:** avval 1-bo'limdagilarni 2 hafta ishlating (ayniqsa moliya va g'oyalar). Ko'p agent yasashdan ko'ra, 2–3 tasini har kuni ishlatish foydaliroq.
