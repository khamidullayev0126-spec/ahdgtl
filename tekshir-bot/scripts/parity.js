// Android ilovasidagi Kotlin mexanizmi (tekshir-android/engine) bot bilan BIR XIL ishlashini tekshirish uchun
// namuna natijalar: parity.json. EngineTest.botBilanBirXil shu fayldagi har bir holatni Kotlin'da qayta tekshiradi.
//
// Ishga tushirish (tekshir-bot papkasida):  node scripts/parity.js
// Qoidalar (data/*.json) yoki scoring.js o'zgarsa — qayta yarating va Android testini ishga tushiring.
//
// Faqat internetsiz qoidalar (fast: true) — Android'dagi mexanizm ham internetsiz ishlaydi.
// Bu yerdagi matnlar — sinov uchun o'ylab topilgan namunalar, foydalanuvchi xabarlari EMAS.

const fs = require("fs");
const path = require("path");
const { analyzeText } = require("../src/checkers/text");
const { extractUrls, checkUrls } = require("../src/checkers/url");
const { checkFile } = require("../src/checkers/file");
const { combineAll } = require("../src/scoring");

const OUT = path.join(__dirname, "../../tekshir-android/engine/src/test/resources/parity.json");

// [matn, fayl nomi]
const CASES = [
  ["https://click.uz"],
  ["https://my.click.uz/pay"],
  ["https://c1ick-uz.com/bonus"],
  ["paymee.uz"],
  ["https://clock.uz"],
  ["http://192.168.1.10/login"],
  ["https://click.uz@yomon.top/login"],
  ["https://сlick.uz/login"],
  ["Kirish: https://pаyme.uz"],
  ["https://payme-uz.top/karta"],
  ["https://secure-click-uz-bonus.xyz/sms"],
  ["https://login.click.uz.secure.top"],
  ["https://kun.uz/news/2026"],
  ["https://olx.uz/item"],
  ["https://0lx-uz.com"],
  ["https://uzum.uz"],
  ["https://uzurn-market.uz/aksiya"],
  ["https://bit.ly/abc123"],
  ["Narxi 5.000 so'm"],
  ["Hurmatli mijoz! Kartangiz bloklandi. SMS kodni yuboring"],
  ["SMS kodni hech kimga aytmang!"],
  ["Tabriklaymiz! Siz iPhone yutib oldingiz"],
  ["Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com"],
  ["Срочно! Ваша карта заблокирована, сообщите SMS-код"],
  ["Посылка задержана на таможне, оплатите пошлину"],
  ["Iltimos ovoz bering, jiyanim tanlovda"],
  ["Kuniga 500 000 so'm daromad, tajriba shart emas"],
  ["Posilkangiz bojxonada. 25 000 so'm to'lang"],
  ["8600 1234 ga 50 000 tashlang"],
  ["Assalomu alaykum, ertaga soat 10 da uchrashamiz"],
  ["Ilovani o'rnating: rasmlar.apk"],
  ["CVV kodini yozing"],
  ["Ertaga majlis"],
  ["Шошилинг! Картангиз блокланди, SMS кодни юборинг"],
  ["", "Rasmlar.apk"],
  ["", "Hujjat.jpg.apk"],
  ["", "hisobot.pdf"],
  ["", "dastur.exe"],
  ["", "jadval.xlsm"],
  ["", "arxiv.zip"],
  ["Mana rasm", "photo.jpg"],
  ["", "faktura.pdf          .exe"],
  ["Yutuq! https://prize-uz.top", "sovga.apk"],
  // Firibgar matn guruhi + shubhali havola (url_combo)
  ["Tabriklaymiz! Siz iPhone 16 yutdingiz. Sovg'ani olish uchun https://yutuq-uz.click saytiga kiring"],
  ["Поздравляем! Вы выиграли iPhone 16. Заберите приз на https://yutuq-uz.click"],
  ["Posilkangiz keldi: https://mening-saytim.click"],
  ["Bonus yutdingiz! Batafsil: https://click.uz"],
  ["Mana mening saytim: https://mening-saytim.click"],
  ["Sovg'a: https://bit.ly/abc123"],
  // 2026-noyabr: yangi turlar — ish taklifi, yaqin odam yangi raqamdan, bayram aksiyasi, kuryer
  ["Uydan ishlash! Layk bosib kuniga 300 000 so'm. Boshlash uchun 50 000 so'm oldindan to'lov qiling"],
  ["Удалённая работа: ставить лайки, ежедневные выплаты. Для начала переведите 100 000 сум"],
  ["Telegramda ish! Topshiriq bajarib pul toping: https://ish-topish.click"],
  ["Assalomu alaykum, bu mening yangi raqamim. Telefonim buzildi, tezda 500 ming kartaga tashlang"],
  ["Мама, это мой новый номер. Скинь 300 000 на карту, срочно"],
  ["Bu mening yangi raqamim, saqlab qo'ying"],
  ["Yangi yil aksiyasi! Atigi 99 000 so'm to'lang va iPhone oling"],
  ["Новогодняя акция! Заберите подарок: https://yangi-yil.click"],
  ["Yangi yil bilan tabriklayman! Baxt tilayman"],
  ["Kuryer sizni topa olmadi. Manzilingizni tasdiqlang va yetkazib berish haqini to'lang"],
];

async function main() {
  const out = [];
  for (const [text, file = null] of CASES) {
    const urls = await checkUrls(extractUrls(text), { fast: true });
    const r = combineAll(urls, analyzeText(text), file ? await checkFile({ name: file, mime: "", size: 0 }, null, { fast: true }) : null);
    out.push({ text, file, level: r.level, score: r.score, codes: r.reasons.map(x => x.code) });
  }
  fs.writeFileSync(process.argv[2] || OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`${out.length} ta holat → ${path.relative(process.cwd(), process.argv[2] || OUT)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
