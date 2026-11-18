// 70 ta maslahat — 7 yo'nalish × 10 ta. AHdigital ilovasi va Tekshir ilovasi shu fayldan foydalanadi.
// Format: [yo'nalish, belgi, sarlavha, matn]. Raqam va statistika yo'q — faqat amaliy, tekshirilgan maslahatlar.
window.TIP_CATS = [
  ["firibgarlik", "🛡", "Firibgarlik"],
  ["parol", "🔐", "Parol va akkaunt"],
  ["telefon", "📱", "Telefon va internet"],
  ["oila", "👨‍👩‍👧", "Oila va bolalar"],
  ["biznes", "💼", "Kichik biznes"],
  ["instagram", "📸", "Instagram va kontent"],
  ["ai", "🤖", "AI bilan ishlash"]
];

window.TIPS = [
  // ---------- 🛡 Firibgarlik ----------
  ["firibgarlik", "🔐", "SMS kodni hech kimga aytmang", "Bank xodimi, operator yoki Click ham uni hech qachon so'ramaydi. SMS kod — sizning imzoingiz: uni aytsangiz, to'lovga o'zingiz ruxsat berasiz."],
  ["firibgarlik", "📞", "«Bankdan qo'ng'iroq qilyapmiz»", "Go'shakni qo'ying va kartangiz orqasidagi raqamga o'zingiz qo'ng'iroq qiling. Firibgar ismingizni va kartaning oxirgi raqamlarini bilishi mumkin — bu ishonch uchun emas."],
  ["firibgarlik", "🔗", "Manzilni harfma-harf o'qing", "click.uz va c1ick-uz.com — butunlay boshqa saytlar. To'lovni havola orqali emas, rasmiy ilova orqali qiling."],
  ["firibgarlik", "🎁", "«Siz yutdingiz!» — aldov", "Qatnashmagan tanlovda yutib bo'lmaydi. «Yutuqni olish uchun avval to'lang» deyilsa — bu doim firibgarlik."],
  ["firibgarlik", "📦", "Posilka uchun «bojxona to'lovi»", "Trek-raqamni rasmiy pochta saytida o'zingiz tekshiring — SMS'dagi havoladan emas. Kichik summa so'rashadi, lekin karta ma'lumoti o'g'irlanadi."],
  ["firibgarlik", "📎", "«Rasmlar.apk» — bu rasm emas", "Nomi .apk bilan tugasa — bu Android ilova. O'rnatsangiz, u SMS'laringizni o'qiydi. «Hujjat.jpg.apk» ham baribir ilova."],
  ["firibgarlik", "🗳", "«Ovoz bering» havolasi", "Tanishingizdan kelsa ham ehtiyot bo'ling — uning akkaunti o'g'irlangan bo'lishi mumkin. Telegram kodi so'ralsa — hech qayerga yozmang."],
  ["firibgarlik", "💸", "Oson daromad va'dasi", "«Like bosib pul ishlang», «1 haftada 2 baravar». Avval kichik pul berib ishontirishadi, keyin katta summa bilan yo'qolishadi."],
  ["firibgarlik", "🧳", "Ish uchun oldindan to'lov", "«Forma, hujjat yoki o'qish uchun avval to'lang» degan ish taklifi — aldov. Haqiqiy ish beruvchi sizdan pul so'ramaydi."],
  ["firibgarlik", "⏰", "Shoshiltirishsa — to'xtang", "«1 soat ichida», «hozir bloklanadi» — firibgarlarning asosiy usuli. Qo'rqqan odam tekshirmaydi. Haqiqiy bank sizni shoshiltirmaydi."],

  // ---------- 🔐 Parol va akkaunt ----------
  ["parol", "🛡", "Telegram'da ikki bosqichli himoya", "Sozlamalar → Maxfiylik va xavfsizlik → Ikki bosqichli tasdiqlash. SMS kodni bilib olishsa ham, parolsiz akkauntga kira olishmaydi."],
  ["parol", "🔑", "Har saytga boshqa parol", "Bitta parol hamma joyda bo'lsa, bitta sayt buzilganda hammasi ochiladi. Hech bo'lmasa pochta, bank va Telegram uchun alohida parol qo'ying."],
  ["parol", "📏", "Uzun parol — kuchli parol", "Uchta tasodifiy so'zdan iborat uzun ibora («olma-poyezd-bulut-7») qisqa «Abc123!» dan ancha kuchli va eslab qolish oson."],
  ["parol", "🧠", "Parol menejeridan foydalaning", "Telefon va brauzerdagi parol saqlagich (Google Password Manager, iCloud Keychain) har sayt uchun kuchli parol yaratadi va o'zi eslab qoladi."],
  ["parol", "📧", "Pochtangiz — asosiy kalit", "Boshqa akkauntlar parolini pochta orqali tiklashadi. Shuning uchun Gmail'ga eng kuchli parol va ikki bosqichli himoya qo'ying."],
  ["parol", "💻", "Faol seanslarni tekshiring", "Telegram: Sozlamalar → Qurilmalar. Tanimagan qurilma bo'lsa — «Boshqa seanslarni tugatish». Google akkauntida ham shunday bo'lim bor."],
  ["parol", "🚫", "Parolni xabarda yubormang", "Parol, PIN yoki kartaning orqasidagi 3 raqamni (CVV) chatga, SMS'ga yoki ovozli xabarga yozmang — hatto yaqinlaringizga ham."],
  ["parol", "🎂", "Tug'ilgan sana — parol emas", "Tug'ilgan sana, telefon raqam, ism — boshqalar bilishi yoki topishi oson. Bunday parolni birinchi navbatda sinab ko'rishadi."],
  ["parol", "🔔", "Kirish xabarnomalarini yoqing", "Yangi qurilmadan kirilganda Telegram va Google xabar beradi. Siz kirmagan bo'lsangiz — darhol parolni almashtiring."],
  ["parol", "🧾", "Zaxira kodlarini saqlang", "Ikki bosqichli himoya yoqilganda Google zaxira kodlar beradi. Ularni qog'ozga yozib, xavfsiz joyda saqlang — telefon yo'qolsa kerak bo'ladi."],

  // ---------- 📱 Telefon va internet ----------
  ["telefon", "🔄", "Telefonni yangilab turing", "Yangilanishlar xavfsizlik teshiklarini yopadi. Sozlamalar → Tizim yangilanishi. Ilovalarni ham Play Market'da yangilang."],
  ["telefon", "🏪", "Ilovalar — faqat rasmiy do'kondan", "Google Play yoki App Store. Telegram kanal yoki saytdan yuklangan ilova tekshirilmagan bo'ladi."],
  ["telefon", "🔍", "Ilova ruxsatlarini tekshiring", "Fonar ilovasiga SMS va kontaktlarga ruxsat nimaga kerak? Sozlamalar → Ilovalar → Ruxsatlar — keraksizlarini o'chiring."],
  ["telefon", "📶", "Ochiq Wi-Fi'da bank ishlarini qilmang", "Kafe yoki aeroportdagi parolsiz Wi-Fi'da bank ilovasiga kirmang. Mobil internet xavfsizroq."],
  ["telefon", "🔒", "Ekran qulfini qo'ying", "PIN, barmoq izi yoki yuz bilan. Telefon yo'qolsa ham, ichidagi xabar va bank ilovalari himoyalangan bo'ladi."],
  ["telefon", "📍", "Yo'qolgan telefonni topish", "Android: «Find My Device» (Qurilmani topish) yoqilgan bo'lsin. U orqali telefonni topish, qulflash yoki o'chirish mumkin."],
  ["telefon", "☁️", "Rasmlarning zaxira nusxasi", "Google Photos yoki iCloud'da zaxira yoqilsa, telefon buzilsa ham rasmlar yo'qolmaydi."],
  ["telefon", "📩", "Notanish raqamdan havola", "Bankdan kelgandek SMS'dagi havolani bosmang. Bankingiz haqiqatan yozgan bo'lsa — rasmiy ilovada ham xabar bo'ladi."],
  ["telefon", "🔌", "Begona zaryadlovchi kabeli", "Jamoat joylaridagi USB portlarga emas, rozetkaga o'z adapteringiz bilan ulang. Telefon «Ma'lumot uzatish» so'rasa — rad eting."],
  ["telefon", "🧹", "Keraksiz ilovalarni o'chiring", "Ishlatmayotgan ilova ham ruxsatlarga ega bo'lib turadi. Kam ilova — kam xavf va ko'proq bo'sh joy."],

  // ---------- 👨‍👩‍👧 Oila va bolalar ----------
  ["oila", "🗣", "Bolalar bilan gaplashing", "Onlayn biror narsa qo'rqitsa yoki g'alati bo'lsa, ota-onasiga aytishi mumkinligini bolaga ayting — urishmasligingizni ham."],
  ["oila", "👤", "Notanish odamga shaxsiy ma'lumot yo'q", "Manzil, maktab, telefon raqam va rasmlarni notanish odamlarga yubormaslikni bolaga tushuntiring."],
  ["oila", "🎮", "O'yin ichidagi xaridlar", "Bolalar telefonida Google Play'da xarid uchun parol so'ralishini yoqing: Play Market → Sozlamalar → Autentifikatsiya."],
  ["oila", "👨‍👩‍👧", "Google Family Link", "Bolaning telefonida ilovalar, ekran vaqti va yuklab olishlarni ota-ona boshqaradi. Bepul."],
  ["oila", "📸", "Bolaning rasmini o'ylab joylang", "Maktab formasi, uy manzili ko'rinadigan rasmlarni ochiq sahifaga qo'ymang. Yopiq oila guruhi xavfsizroq."],
  ["oila", "👵", "Kattalarga firibgarlikni tushuntiring", "Ota-ona va buvi-bobolarga «bank SMS kod so'ramaydi» degan bitta qoidani eslatib turing. Bu maslahatlarni ularga ulashing."],
  ["oila", "🔑", "Oila uchun «maxfiy so'z»", "Kimdir qarindosh nomidan yangi raqamdan pul so'rasa, faqat oilangiz biladigan so'zni so'rang. Firibgar uni bilmaydi."],
  ["oila", "⏱", "Ekran vaqtiga chegara", "Telefonda «Digital Wellbeing» (Raqamli farovonlik) bo'limida ilovalar uchun kunlik vaqt chegarasi qo'yish mumkin."],
  ["oila", "🎥", "Videochatda notanishlar", "Bolaga tanimagan odam bilan videoqo'ng'iroq qilmaslik va kamerani yoqmaslikni tushuntiring."],
  ["oila", "🤝", "Birga o'rganing", "Yangi ilovani bola bilan birga o'rnating va sozlamalarini birga ko'ring — bu taqiqlashdan ko'ra yaxshiroq ishlaydi."],

  // ---------- 💼 Kichik biznes ----------
  ["biznes", "🗺", "Google'da bepul chiqing", "business.google.com — nom, telefon, ish vaqti va rasmlar. «Kafe yaqinimda» deb qidirganlar sizni xaritada topadi."],
  ["biznes", "⭐", "Mijozdan sharh so'rang", "Har mamnun mijozdan Google'da sharh so'rang. Sharhlar ko'p bo'lsa, Google sizni yuqoriroq ko'rsatadi. Har sharhga javob yozing."],
  ["biznes", "💰", "Narxni yashirmang", "Narx ko'rinmasa, ko'p odam so'rashga erinadi va ketadi. Hech bo'lmasa «...dan boshlab» deb yozing."],
  ["biznes", "🕐", "Ish vaqti hamma joyda bir xil", "Google, Instagram, 2GIS va eshikdagi ish vaqti bir xil bo'lsin. Yopiq eshikka kelgan mijoz qaytib kelmaydi."],
  ["biznes", "🔳", "QR menyu — chop etish shart emas", "Narx o'zgarsa, qog'oz menyuni qayta chop etmaysiz — saytdagi narxni yangilaysiz, QR kod o'sha qoladi."],
  ["biznes", "📶", "Mehmonlar uchun Wi-Fi QR", "Mehmonlar parolni so'rab o'tirmaydi — stolga Wi-Fi QR kodini qo'ying. «Foydali → QR kod» bo'limida 10 soniyada yasaladi."],
  ["biznes", "💬", "Tez javob — ko'proq buyurtma", "Xabarga bir necha soat keyin javob bersangiz, mijoz boshqasidan olib bo'ladi. Ish vaqtida tez javob berishga harakat qiling."],
  ["biznes", "📒", "Mijozlar ro'yxatini yuriting", "Doimiy mijozlarning ismi va nima olganini yozib boring (roziligi bilan). Yangi mahsulot chiqqanda ularga birinchi xabar bering."],
  ["biznes", "🧾", "Kirim-chiqimni yozib boring", "Oddiy jadval ham bo'ladi: har kuni nima sotildi, nimaga pul ketdi. Oy oxirida haqiqiy foydani ko'rasiz."],
  ["biznes", "🎯", "Bitta narsada eng yaxshi bo'ling", "Hammasini qilishdan ko'ra, bitta mahsulot yoki xizmatni zo'r qiling — odamlar sizni shu bilan eslab qoladi va boshqalarga aytadi."],

  // ---------- 📸 Instagram va kontent ----------
  ["instagram", "📞", "Aloqa tugmasini qo'shing", "Profilni tahrirlash → Aloqa variantlari. «Qo'ng'iroq» yoki «Xabar» tugmasi 1 daqiqada qo'shiladi."],
  ["instagram", "🔗", "Bio'da bitta aniq havola", "Narx, manzil va rasmlar bir joyda bo'lsin — kichik sayt yoki menyu havolasi."],
  ["instagram", "⚡", "Birinchi 2 soniya — eng muhimi", "Reels'ning boshida savol yoki qiziq gap bo'lsin. Odam 2 soniyada qolish yoki o'tib ketishni hal qiladi."],
  ["instagram", "1️⃣", "Bitta video — bitta fikr", "Bir reels'ga hamma narsani tiqmang. Bitta foydali fikr, 20–40 soniya — tushunarli va oxirigacha ko'riladi."],
  ["instagram", "📅", "Muntazam joylang", "Haftada 2–3 ta post doim joylash — oyiga bir marta 10 ta joylashdan yaxshiroq. Odamlar sizni kutishni o'rganadi."],
  ["instagram", "💡", "Foydali kontent ulashiladi", "Reklama postini hech kim uzatmaydi. Maslahat va foydali ma'lumotni odamlar o'zi do'stlariga yuboradi."],
  ["instagram", "🗨", "Har izohga javob bering", "Izohlarga tez javob bersangiz, odamlar ko'proq yozadi va post ko'proq odamga ko'rsatiladi."],
  ["instagram", "🔤", "Videoga subtitr qo'ying", "Ko'p odam videoni ovozsiz ko'radi. Subtitr bo'lsa, ovozsiz ham tushunarli bo'ladi."],
  ["instagram", "🎵", "Musiqa — faqat ruxsat etilgan", "Instagram'ning o'z musiqa kutubxonasidan foydalaning. Boshqa joydan olingan qo'shiq bilan video o'chirilishi yoki ovozsiz qolishi mumkin."],
  ["instagram", "📊", "Statistikani kuzating", "Professional panel → Statistika. Qaysi post ko'proq saqlangan va ulashilganini ko'ring — shunga o'xshashini ko'proq qiling."],

  // ---------- 🤖 AI bilan ishlash ----------
  ["ai", "🎯", "Aniq so'rang — aniq javob", "«Matn yoz» emas, «Kafe uchun Instagram post yoz: 3 qator, iliq ohangda, oxirida savol bilan» — natija ancha yaxshi bo'ladi."],
  ["ai", "🎭", "AI'ga rol bering", "«Sen tajribali marketologsan» yoki «Sen sabrli o'qituvchisan» deb boshlang — javob uslubi shunga moslashadi."],
  ["ai", "📋", "Namuna ko'rsating", "O'zingizga yoqqan matndan bitta namuna bering va «shunga o'xshash yoz» deng. Bu uzun tushuntirishdan yaxshiroq ishlaydi."],
  ["ai", "🔁", "Birinchi javobda to'xtamang", "«Qisqaroq qil», «oddiyroq so'zlar bilan», «yana 3 ta variant ber» — AI bilan suhbatlashib natijani yaxshilang."],
  ["ai", "✅", "AI xato qilishi mumkin", "Raqam, sana, narx va faktlarni tekshiring. AI ishonch bilan noto'g'ri narsa aytishi ham mumkin."],
  ["ai", "🔒", "Maxfiy ma'lumotni yozmang", "Parol, karta raqami, pasport ma'lumotlarini AI chatga yozmang — u yerda ham ehtiyot bo'ling."],
  ["ai", "📚", "AI bilan o'rganing, ko'chirmang", "AI'dan javobni emas, tushuntirishni so'rang: «buni bosqichma-bosqich tushuntir». Kod yoki uy ishida ham shunday."],
  ["ai", "✍️", "Xat va arizalar uchun", "«Rasmiy ohangda ariza yoz: …» deng va o'zingiz tekshirib, ismlarni to'g'rilang. Vaqtni ancha tejaydi."],
  ["ai", "🌍", "Tarjima va tushuntirish", "Tushunmagan hujjat yoki inglizcha matnni AI'ga bering: «oddiy o'zbek tilida qisqacha tushuntir»."],
  ["ai", "🧩", "Katta ishni bo'laklarga bo'ling", "«Sayt yasab ber» o'rniga: avval reja, keyin har bir qism alohida. Kichik qadamlar bilan natija aniqroq bo'ladi."]
];
