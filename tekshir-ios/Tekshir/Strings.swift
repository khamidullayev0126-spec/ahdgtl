// Ilova interfeysi matnlari: o'zbek (lotin) va rus. Android ilova va veb-ilova bilan bir xil ohangda.
// Tekshiruv natijasi matnlari — engine.js'dan (botdagi bilan bir xil). 🆘 ✈️ 🎓 matnlari — yordam.js'dan.
import Foundation

enum S {
    static func t(_ lang: Lang, _ key: String, _ vars: [String: CustomStringConvertible] = [:]) -> String {
        var s = (lang == .ru ? ru[key] : nil) ?? uz[key] ?? key
        for (k, v) in vars { s = s.replacingOccurrences(of: "{\(k)}", with: v.description) }
        return s
    }

    private static let uz: [String: String] = [
        "tab_home": "Himoya", "tab_check": "Tekshirish", "tab_hist": "Tarix", "tab_tips": "Maslahat", "tab_set": "Sozlama",
        "active": "faol", "protected": "Himoyadasiz", "hero_sub": "Shubhali xabarni tekshirmasdan ochmang",
        "checked": "tekshirildi", "dangers": "xavfli", "tips": "maslahat", "check_btn": "🔍 Tekshirish",
        "help": "Yordam va o'rganish", "h_rescue": "Aldandim — nima qilay?", "h_rescue_s": "Pul, kod yoki akkaunt ketdimi? Qadam-baqadam yordam",
        "h_tg": "Telegram himoyasi", "h_quiz": "Firibgarni tani", "h_quiz_s": "10 ta savol — o'zingizni sinang", "h_quiz_best": "Eng yaxshi natija: {n}/10",
        "tg_score": "{n}/{k} bajarildi", "tip_day": "💡 Kun maslahati",
        // Tekshirish
        "check_title": "Tekshirish", "hint": "Shubhali xabar, havola yoki raqamni shu yerga qo'ying…",
        "paste": "📋 Joylash", "shot": "📸 Skrinshot", "qr_btn": "🔳 QR kod", "reading": "O'qilmoqda…",
        "img_fail": "Rasmni ochib bo'lmadi.", "img_empty": "Rasmda matn yoki QR kod topilmadi. Xabar aniq ko'ringan skrinshot tanlang.",
        "qr_fail": "Bu iPhone'da QR skaner ishlamaydi. QR kodning skrinshotini «📸 Skrinshot» orqali tekshiring.",
        "qr_denied": "Kameraga ruxsat berilmagan. Sozlamalar → Tekshir → Kamera.", "qr_title": "🔳 QR kod ichida", "qr_close": "Yopish",
        "empty": "Avval xabar yoki havolani qo'ying.",
        "on_1": "⏳ Havola va raqamlar internetda qo'shimcha tekshirilmoqda…", "on_2": "🌐 Google, VirusTotal va shikoyatlar bazasida ham tekshirildi",
        "on_3": "📴 Internetsiz tekshirildi (telefondagi qoidalar bilan)",
        "why": "Nima uchun", "what_to_do": "Nima qilish kerak", "nums": "Raqamlar", "reports": "ta shikoyat", "no_reports": "shikoyat yo'q",
        "rep_note": "Shikoyatlar soni — foydalanuvchilar fikri, rasmiy xulosa emas.",
        "privacy": "🔒 Xabar telefoningizda tekshiriladi. Internetga faqat havola va raqamlar yuboriladi — xabar matni emas. Natija 100% kafolat emas.",
        "img_priv": "📸 Skrinshot va QR telefonda o'qiladi, rasm hech qayerga yuborilmaydi.",
        "no_engine": "Tekshiruv fayli topilmadi — ilovani qayta o'rnating.",
        "done": "Tayyor", "share_empty": "Tekshiradigan matn, havola yoki rasm topilmadi.",
        // Tarix
        "hist_title": "Tekshiruvlar tarixi", "hist_empty": "Hali tekshiruv yo'q. Shubhali xabar kelsa — shu yerda ko'rinadi.",
        "hist_note": "Tarix faqat shu telefonda. Raqamlar yashirilgan.", "clear": "🗑 Tarixni tozalash", "clear_q": "Tarix o'chirilsinmi?",
        "yes": "Ha", "no": "Yo'q",
        // Maslahat
        "tips_title": "Maslahatlar", "all": "Barchasi",
        // Sozlama
        "set_title": "Sozlamalar", "lang": "Til", "about": "Tekshir haqida",
        "about_p": "Firibgarlikka qarshi bepul ilova. Shubhali xabar, havola, skrinshot va QR kodni tekshiradi va sodda tilda tushuntiradi.",
        "priv_link": "🔒 Maxfiylik siyosati", "bot_link": "✈️ Telegram bot: @tekshirbot_bot", "made": "AHdigital tomonidan yaratilgan", "version": "Versiya",
        // 🆘
        "r_title": "🆘 Aldandim", "r_p": "Vahima qilmang. Nima bo'lganini tanlang — qadamlarni tartib bilan bajaring:", "r_police": "📞 102 — politsiya",
        // ✈️
        "tg_title": "✈️ Telegram himoyasi",
        "tg_p": "«Ovoz bering», «Premium sovg'a» havolalari orqali har kuni akkauntlar o'g'irlanmoqda. Har bandni Telegram'da tekshiring va belgilang.",
        "tg_good": "Zo'r! Akkauntingiz yaxshi himoyalangan.", "tg_mid": "Yaxshi, lekin yana bir necha qadam qoldi.",
        "tg_bad": "Akkauntingiz xavf ostida — avval bulutli parolni yoqing.", "tg_open": "Telegram'ni ochish →",
        "tg_priv": "🔒 Belgilaringiz faqat shu telefonda saqlanadi. Tekshir Telegram'ingizga kira olmaydi va hech narsani o'qimaydi.",
        // 🎓
        "q_title": "🎓 Firibgarni tani", "q_p": "Xabarni o'qing: firibgarmi yoki oddiy xabarmi?",
        "q_scam": "🔴 Firibgar", "q_safe": "🟢 Oddiy", "q_right": "✅ To'g'ri!", "q_wrong": "❌ Noto'g'ri",
        "q_next": "Keyingi →", "q_finish": "Natijani ko'rish", "q_of": "{i}/{n}-savol", "q_score": "{c}/{n} to'g'ri",
        "quiz_r3": "🏆 Ajoyib! Firibgarlar sizni aldolmaydi.", "quiz_r2": "👍 Yaxshi! Ba'zi belgilarga yana e'tibor bering.",
        "quiz_r1": "⚠️ Ehtiyot bo'ling — «Maslahat» bo'limini o'qib, yana urinib ko'ring.",
        "q_again": "🔁 Yana o'ynash", "q_share": "📤 Yaqinlarga yuborish",
        "q_share_text": "Men Tekshir'dagi «Firibgarni tani» mashqida {c}/{n} oldim. Siz ham sinab ko'ring: https://tekshir.ah-digital.uz"
    ]

    private static let ru: [String: String] = [
        "tab_home": "Защита", "tab_check": "Проверка", "tab_hist": "История", "tab_tips": "Советы", "tab_set": "Настройки",
        "active": "активна", "protected": "Вы под защитой", "hero_sub": "Не открывайте подозрительное, не проверив",
        "checked": "проверено", "dangers": "опасных", "tips": "советов", "check_btn": "🔍 Проверить",
        "help": "Помощь и обучение", "h_rescue": "Меня обманули — что делать?", "h_rescue_s": "Ушли деньги, код или аккаунт? Пошаговая помощь",
        "h_tg": "Защита Telegram", "h_quiz": "Распознай мошенника", "h_quiz_s": "10 вопросов — проверьте себя", "h_quiz_best": "Лучший результат: {n}/10",
        "tg_score": "Выполнено {n}/{k}", "tip_day": "💡 Совет дня",
        "check_title": "Проверка", "hint": "Вставьте подозрительное сообщение, ссылку или номер…",
        "paste": "📋 Вставить", "shot": "📸 Скриншот", "qr_btn": "🔳 QR-код", "reading": "Читаем…",
        "img_fail": "Не удалось открыть изображение.", "img_empty": "На изображении нет текста или QR-кода. Выберите скриншот, где сообщение хорошо видно.",
        "qr_fail": "На этом iPhone сканер QR не работает. Проверьте скриншот QR-кода через «📸 Скриншот».",
        "qr_denied": "Нет доступа к камере. Настройки → Tekshir → Камера.", "qr_title": "🔳 Внутри QR-кода", "qr_close": "Закрыть",
        "empty": "Сначала вставьте сообщение или ссылку.",
        "on_1": "⏳ Дополнительно проверяем ссылки и номера в интернете…", "on_2": "🌐 Проверено также в Google, VirusTotal и базе жалоб",
        "on_3": "📴 Проверено без интернета (правилами на телефоне)",
        "why": "Почему", "what_to_do": "Что делать", "nums": "Номера", "reports": "жалоб", "no_reports": "жалоб нет",
        "rep_note": "Число жалоб — мнение пользователей, а не официальный вывод.",
        "privacy": "🔒 Сообщение проверяется на телефоне. В интернет отправляются только ссылки и номера — не текст сообщения. Результат не даёт 100% гарантии.",
        "img_priv": "📸 Скриншоты и QR распознаются на телефоне, изображение никуда не отправляется.",
        "no_engine": "Файл проверки не найден — переустановите приложение.",
        "done": "Готово", "share_empty": "Не найден текст, ссылка или изображение для проверки.",
        "hist_title": "История проверок", "hist_empty": "Пока нет проверок.",
        "hist_note": "История — только на этом телефоне. Номера скрыты.", "clear": "🗑 Очистить историю", "clear_q": "Удалить историю?",
        "yes": "Да", "no": "Нет",
        "tips_title": "Советы", "all": "Все",
        "set_title": "Настройки", "lang": "Язык", "about": "О приложении Tekshir",
        "about_p": "Бесплатное приложение против мошенников. Проверяет подозрительные сообщения, ссылки, скриншоты и QR-коды и объясняет простым языком.",
        "priv_link": "🔒 Политика конфиденциальности", "bot_link": "✈️ Telegram-бот: @tekshirbot_bot", "made": "Создано AHdigital", "version": "Версия",
        "r_title": "🆘 Меня обманули", "r_p": "Без паники. Выберите, что случилось, и выполняйте шаги по порядку:", "r_police": "📞 102 — полиция",
        "tg_title": "✈️ Защита Telegram",
        "tg_p": "Через ссылки «проголосуй» и «Premium в подарок» каждый день крадут аккаунты. Проверьте каждый пункт в Telegram и отметьте.",
        "tg_good": "Отлично! Аккаунт хорошо защищён.", "tg_mid": "Хорошо, но осталось несколько шагов.",
        "tg_bad": "Аккаунт под угрозой — сначала включите облачный пароль.", "tg_open": "Открыть Telegram →",
        "tg_priv": "🔒 Отметки хранятся только на этом телефоне. Tekshir не имеет доступа к вашему Telegram и ничего не читает.",
        "q_title": "🎓 Распознай мошенника", "q_p": "Прочитайте сообщение: мошенник или обычное сообщение?",
        "q_scam": "🔴 Мошенник", "q_safe": "🟢 Обычное", "q_right": "✅ Верно!", "q_wrong": "❌ Неверно",
        "q_next": "Дальше →", "q_finish": "Посмотреть результат", "q_of": "Вопрос {i}/{n}", "q_score": "Верно: {c}/{n}",
        "quiz_r3": "🏆 Отлично! Мошенникам вас не обмануть.", "quiz_r2": "👍 Хорошо! Обратите внимание на некоторые признаки.",
        "quiz_r1": "⚠️ Будьте осторожны — прочитайте «Советы» и попробуйте ещё раз.",
        "q_again": "🔁 Пройти ещё раз", "q_share": "📤 Отправить близким",
        "q_share_text": "Я прошёл упражнение «Распознай мошенника» в Tekshir: {c}/{n}. Попробуйте и вы: https://tekshir.ah-digital.uz"
    ]
}
