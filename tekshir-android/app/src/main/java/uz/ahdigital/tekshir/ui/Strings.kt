// Ilova interfeysi matnlari: o'zbek (lotin) va rus. Tekshiruv natijasi matnlari — engine/Texts.kt (botdan).
package uz.ahdigital.tekshir.ui

object S {
    private val uz = mapOf(
        "tab_home" to "Himoya", "tab_check" to "Tekshirish", "tab_hist" to "Tarix", "tab_tips" to "Maslahat", "tab_set" to "Sozlama",
        "active" to "faol", "protected" to "Himoyadasiz", "hero_sub" to "Shubhali xabarni tekshirmasdan ochmang",
        "checked" to "tekshirildi", "dangers" to "xavfli", "tips" to "maslahat", "check_btn" to "🔍 Tekshirish",
        "modules" to "Avtomatik himoya", "soon" to "Tez orada",
        "m_notif" to "Xabarlarni kuzatish", "m_notif_s" to "SMS, Telegram, WhatsApp — kelishi bilan tekshiradi",
        "m_apps" to "Yangi ilovalar", "m_apps_s" to "Xavfli ruxsatli ilova o'rnatilsa — ogohlantiradi",
        "m_files" to "APK fayllar", "m_files_s" to "Yuklab olingan APK'larni tekshiradi",
        "m_calls" to "Qo'ng'iroqlar", "m_calls_s" to "Shikoyat qilingan raqamdan qo'ng'iroq bo'lsa",
        "m_family" to "Oila himoyasi", "m_family_s" to "Yaqiningizga xavfli xabar kelsa — sizga xabar",
        "m_score" to "Xavfsizlik bali", "m_score_s" to "Telefoningiz qanchalik himoyalangan (0–100)",
        "tip_day" to "💡 Kun maslahati",
        "check_title" to "Tekshirish", "hint" to "Shubhali xabar, havola yoki raqamni shu yerga qo'ying…",
        "paste" to "📋 Joylash", "checking" to "Tekshirilmoqda…", "online" to "⏳ Google va VirusTotal'da qo'shimcha tekshirilmoqda…",
        "online_done" to "🌐 Internet orqali ham tekshirildi", "online_fail" to "📴 Internetsiz tekshirildi (faqat qoidalar)",
        "empty" to "Avval xabar yoki havolani qo'ying.",
        "privacy" to "🔒 Tekshiruv telefoningizda bajariladi. Internetga faqat havolalar yuboriladi — xabar matni emas. Natija 100% kafolat emas.",
        "hist_title" to "Tekshiruvlar tarixi", "hist_empty" to "Hali tekshiruv yo'q.", "hist_note" to "Tarix faqat shu telefonda. Raqamlar yashirilgan.",
        "clear" to "🗑 Tarixni tozalash", "clear_q" to "Tarix o'chirilsinmi?", "yes" to "Ha", "no" to "Yo'q",
        "tips_title" to "Maslahatlar", "all" to "Barchasi",
        "set_title" to "Sozlamalar", "lang" to "Til", "about" to "Tekshir haqida",
        "about_p" to "Firibgarlikka qarshi bepul ilova. Shubhali xabar, havola va fayllarni tekshiradi va sodda tilda tushuntiradi.",
        "priv_link" to "🔒 Maxfiylik siyosati", "bot_link" to "✈️ Telegram bot: @tekshirbot_bot", "made" to "AHdigital tomonidan yaratilgan",
        "version" to "Versiya"
    )
    private val ru = mapOf(
        "tab_home" to "Защита", "tab_check" to "Проверка", "tab_hist" to "История", "tab_tips" to "Советы", "tab_set" to "Настройки",
        "active" to "активна", "protected" to "Вы под защитой", "hero_sub" to "Не открывайте подозрительное, не проверив",
        "checked" to "проверено", "dangers" to "опасных", "tips" to "советов", "check_btn" to "🔍 Проверить",
        "modules" to "Автоматическая защита", "soon" to "Скоро",
        "m_notif" to "Контроль сообщений", "m_notif_s" to "SMS, Telegram, WhatsApp — проверка сразу при получении",
        "m_apps" to "Новые приложения", "m_apps_s" to "Предупредит, если установлено опасное приложение",
        "m_files" to "APK-файлы", "m_files_s" to "Проверяет скачанные APK",
        "m_calls" to "Звонки", "m_calls_s" to "Если звонит номер с жалобами",
        "m_family" to "Защита семьи", "m_family_s" to "Близкому пришло опасное сообщение — вам уведомление",
        "m_score" to "Оценка безопасности", "m_score_s" to "Насколько защищён ваш телефон (0–100)",
        "tip_day" to "💡 Совет дня",
        "check_title" to "Проверка", "hint" to "Вставьте подозрительное сообщение, ссылку или номер…",
        "paste" to "📋 Вставить", "checking" to "Проверяем…", "online" to "⏳ Дополнительная проверка в Google и VirusTotal…",
        "online_done" to "🌐 Проверено и через интернет", "online_fail" to "📴 Проверено без интернета (только правила)",
        "empty" to "Сначала вставьте сообщение или ссылку.",
        "privacy" to "🔒 Проверка выполняется на телефоне. В интернет отправляются только ссылки — не текст сообщения. Результат не даёт 100% гарантии.",
        "hist_title" to "История проверок", "hist_empty" to "Пока нет проверок.", "hist_note" to "История — только на этом телефоне. Номера скрыты.",
        "clear" to "🗑 Очистить историю", "clear_q" to "Удалить историю?", "yes" to "Да", "no" to "Нет",
        "tips_title" to "Советы", "all" to "Все",
        "set_title" to "Настройки", "lang" to "Язык", "about" to "О приложении Tekshir",
        "about_p" to "Бесплатное приложение против мошенников. Проверяет подозрительные сообщения, ссылки и файлы и объясняет простым языком.",
        "priv_link" to "🔒 Политика конфиденциальности", "bot_link" to "✈️ Telegram-бот: @tekshirbot_bot", "made" to "Создано AHdigital",
        "version" to "Версия"
    )
    fun t(lang: String, key: String): String = (if (lang == "ru") ru else uz)[key] ?: uz[key] ?: key
}
