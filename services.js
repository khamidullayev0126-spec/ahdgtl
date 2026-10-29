// AHdigital — xizmatlar va narxlar ro'yxati.
// Narxni o'zgartirish uchun faqat shu faylni tahrirlang:
// u asosiy saytda, portfoliodagi kalkulyatorda va serverda bir xil ishlatiladi.
// group: "once" — bir martalik, "plan" — obuna, "course" — o'quv kursi

const SERVICES = [
  { id: "video", group: "once", kicker: "Bir martalik", name: "Claude Video", price: 20000, period: "video",
    desc: "Claude yordamida tayyorlangan bitta sifatli video — reklama, reels yoki tushuntirish uchun.",
    features: ["Reklama, reels yoki tushuntirish videosi", "Ssenariy va matn AI yordamida", "Telegram orqali topshiriladi"] },
  { id: "vizitka", group: "once", kicker: "Bir martalik · Sayt", name: "Vizitka va Menyu sayt", price: 25000, period: "sayt",
    desc: "Bir sahifali vizitka sayt yoki kafe, restoran va do'kon uchun menyu sayt.",
    features: ["Bir sahifali chiroyli sayt", "Telefon va kompyuterga moslashgan", "Telefon, Telegram va Instagram havolalari"] },
  { id: "slayd", group: "once", kicker: "Bir martalik", name: "Slayd va Postlar", price: 50000, period: "buyurtma",
    desc: "Taqdimot slaydlari va ijtimoiy tarmoqlar uchun tayyor dizayndagi postlar.",
    features: ["Taqdimot slaydlari", "Instagram va Telegram uchun postlar", "Brendingiz ranglarida"] },
  { id: "katta-sayt", group: "once", kicker: "Bir martalik · Sayt", name: "Katta haqiqiy sayt", price: 350000, period: "sayt",
    desc: "Ko'p sahifali to'liq sayt: buyurtma formasi, admin panel va backend bilan.",
    features: ["Bir nechta sahifa", "Buyurtma yoki aloqa formasi", "Admin panel va backend", "Internetga joylashda yordam"] },
  { id: "pro", group: "plan", kicker: "1 oylik obuna", name: "Pro", price: 100000, period: "oy", featured: true,
    desc: "Bir oy ichida 15 tagacha video, slayd va post yasatishingiz mumkin.",
    features: ["15 tagacha video, slayd va post", "Vizitka va menyu saytlar", "Katta haqiqiy saytlar"] },
  { id: "max", group: "plan", kicker: "1 yillik obuna", name: "Max", price: 1200000, period: "yil",
    desc: "Butun yil davomida cheksiz video, slayd va postlar — hech qanday limit yo'q.",
    features: ["Cheksiz video, slayd va postlar", "Vizitka va menyu saytlar", "Katta haqiqiy saytlar", "Butun yil davomida"] },
  { id: "legends", group: "course", kicker: "O'quv kursi", name: "AI LEGENDS", price: 400000, period: "oy", legend: true,
    desc: "AI bilan ishlashni shaxsan o'zim o'rgataman — amaliy darslar va qo'llab-quvvatlash.",
    features: ["Amaliy darslar", "Claude va AI vositalari bilan ishlash", "Shaxsiy qo'llab-quvvatlash"] }
];

// Brauzerda: window.SERVICES, Node.js serverda: require("./public/services.js")
if (typeof module !== "undefined") module.exports = SERVICES;
else window.SERVICES = SERVICES;
