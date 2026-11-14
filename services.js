// AHdigital — xizmatlar va narxlar ro'yxati.
// Narxni o'zgartirish uchun faqat shu faylni tahrirlang:
// u asosiy saytda, portfoliodagi kalkulyatorda va serverda bir xil ishlatiladi.
// group: "once" — bir martalik, "plan" — obuna, "course" — o'quv kursi
// time — muddat (shartlar.html bilan bir xil bo'lsin!), result — mijoz nima oladi, sample — namuna havolasi

const SERVICES = [
  { id: "video", time: "1–2 ish kuni", result: "Joylashga tayyor reels yoki reklama videosi", sample: "index.html#ishlar", sampleText: "Videolarni ko'rish", group: "once", kicker: "Bir martalik", name: "Claude Video", price: 25000, period: "video",
    desc: "Claude yordamida tayyorlangan bitta sifatli video — reklama, reels yoki tushuntirish uchun.",
    features: ["Reklama, reels yoki tushuntirish videosi", "Ssenariy va matn AI yordamida", "Telegram orqali topshiriladi"] },
  { id: "vizitka", time: "2–3 ish kuni", result: "Telefonda chiroyli ochiladigan, mijoz bir bosishda qo'ng'iroq qiladigan sayt", sample: "index.html#sinov", sampleText: "Hoziroq sinab ko'rish", group: "once", kicker: "Bir martalik · Sayt", name: "Vizitka va Menyu sayt", price: 30000, period: "sayt",
    desc: "Bir sahifali vizitka sayt yoki kafe, restoran va do'kon uchun menyu sayt.",
    features: ["Bir sahifali chiroyli sayt", "Telefon va kompyuterga moslashgan", "Telefon, Telegram va Instagram havolalari"] },
  { id: "slayd", time: "1 ish kuni", result: "Brendingiz ranglarida tayyor slaydlar va postlar", group: "once", kicker: "Bir martalik", name: "Slayd va Postlar", price: 60000, period: "buyurtma",
    desc: "Taqdimot slaydlari va ijtimoiy tarmoqlar uchun tayyor dizayndagi postlar.",
    features: ["Taqdimot slaydlari", "Instagram va Telegram uchun postlar", "Brendingiz ranglarida"] },
  { id: "katta-sayt", time: "7–14 ish kuni", result: "Buyurtma, admin panel va backend bilan to'liq ishlaydigan sayt", sample: "ishlar/ahdigital.html", sampleText: "Namunani ko'rish", group: "once", kicker: "Bir martalik · Sayt", name: "Katta haqiqiy sayt", price: 700000, period: "sayt",
    desc: "Ko'p sahifali to'liq sayt: buyurtma formasi, admin panel va backend bilan.",
    features: ["Bir nechta sahifa", "Buyurtma yoki aloqa formasi", "Admin panel va backend", "Internetga joylashda yordam"] },
  { id: "pro", time: "1–14 ish kuni (ish turiga qarab)", result: "Bir oy davomida kontent va sayt ishlari bir joyda", group: "plan", kicker: "1 oylik obuna", name: "Pro", price: 1000000, period: "oy", featured: true,
    desc: "Bir oy ichida 15 tagacha video, slayd va post yasatishingiz mumkin.",
    features: ["15 tagacha video, slayd va post", "Vizitka va menyu saytlar", "Oyiga 1 ta katta sayt"] },
  { id: "max", time: "1–14 ish kuni (ish turiga qarab)", result: "Butun yil kontent va saytlar — bitta to'lov bilan", group: "plan", kicker: "1 yillik obuna", name: "Max", price: 7000000, period: "yil",
    desc: "Butun yil davomida cheksiz video, slayd va postlar — bir vaqtda 2 tagacha buyurtma.",
    features: ["Cheksiz video, slayd va postlar", "Vizitka va menyu saytlar", "Yiliga 2 tagacha katta sayt", "Butun yil davomida"] },
  { id: "legends", time: "1 oy, 12 ta dars", result: "AI vositalari bilan mustaqil ishlay olasiz", group: "course", kicker: "O'quv kursi", name: "AI LEGENDS", price: 500000, period: "oy", legend: true,
    soon: "Darslar hali boshlanmagan — hozir oldindan yozilish ochiq. Boshlanish sanasini Telegram kanalda e'lon qilaman.", cta: "Oldindan yozilish",
    desc: "AI bilan ishlashni shaxsan o'zim o'rgataman — amaliy darslar va qo'llab-quvvatlash.",
    features: ["Amaliy darslar", "Claude va AI vositalari bilan ishlash", "Shaxsiy qo'llab-quvvatlash"] }
];

// Brauzerda: window.SERVICES, Node.js serverda: require("./public/services.js")
if (typeof module !== "undefined") module.exports = SERVICES;
else window.SERVICES = SERVICES;
