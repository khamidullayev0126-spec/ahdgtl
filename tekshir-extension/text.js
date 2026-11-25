// Kengaytma interfeysi matnlari: o'zbek (lotin) va rus. Tekshiruv sabablari matni — engine.js (botdan).
(function (g) {
  const uz = {
    active: "faol", current: "Shu sayt", not_checked: "Bu sahifa tekshirilmaydi (brauzerning o'z sahifasi).",
    check_title: "Xabar yoki havolani tekshirish", hint: "Shubhali xabar yoki havolani shu yerga qo'ying…",
    check_btn: "🔍 Tekshirish", empty: "Avval xabar yoki havolani qo'ying.",
    settings: "Sozlamalar", s_warn: "Xavfli saytda ogohlantirish", s_badges: "Telegram va WhatsApp Web'da havolalarni belgilash", s_lang: "Til",
    privacy: "🔒 Hammasi kompyuteringizda tekshiriladi — hech narsa internetga yuborilmaydi. Natija 100% kafolat emas.",
    bot: "✈️ Telegram bot", app: "📱 Android ilova",
    pending: "Qisqartirilgan havola — haqiqiy manzili noma'lum. Ochishdan oldin @tekshirbot_bot orqali tekshiring.",
    wall_kicker: "TEKSHIR OGOHLANTIRADI", wall_title: "Bu sayt xavfli bo'lishi mumkin",
    wall_do: "Bu saytga karta raqami, SMS kod yoki parol KIRITMANG.",
    wall_back: "← Orqaga, xavfsiz joyga", wall_go: "Baribir ochish", wall_go2: "Ha, xavfni tushunaman — ochish",
    wall_go_note: "Ishonchingiz komilmi? Rasmiy saytlar manzilini o'zingiz yozib kiring.",
    banner: "Tekshir: bu sayt shubhali", banner_do: "Karta ma'lumotini kiritishdan oldin manzilni tekshiring.",
    ok: "Tushundim", quiet: "Bu saytda ko'rsatmaslik",
    badge_danger: "🔴 Tekshir: xavfli", badge_susp: "🟡 Tekshir: shubhali",
    link_confirm: "Tekshir: bu havola XAVFLI!\n\n{why}\n\nBaribir ochilsinmi?",
    menu_link: "🛡 Tekshir: havolani tekshirish", menu_text: "🛡 Tekshir: matnni tekshirish",
    result_title: "Tekshiruv natijasi", checked_text: "Tekshirilgan matn"
  };
  const ru = {
    active: "активна", current: "Этот сайт", not_checked: "Эта страница не проверяется (служебная страница браузера).",
    check_title: "Проверить сообщение или ссылку", hint: "Вставьте подозрительное сообщение или ссылку…",
    check_btn: "🔍 Проверить", empty: "Сначала вставьте сообщение или ссылку.",
    settings: "Настройки", s_warn: "Предупреждать на опасных сайтах", s_badges: "Отмечать ссылки в Telegram и WhatsApp Web", s_lang: "Язык",
    privacy: "🔒 Всё проверяется на вашем компьютере — ничего не отправляется в интернет. Результат не даёт 100% гарантии.",
    bot: "✈️ Telegram-бот", app: "📱 Android-приложение",
    pending: "Короткая ссылка — настоящий адрес неизвестен. Проверьте её через @tekshirbot_bot перед открытием.",
    wall_kicker: "TEKSHIR ПРЕДУПРЕЖДАЕТ", wall_title: "Этот сайт может быть опасен",
    wall_do: "НЕ вводите на этом сайте номер карты, код из SMS или пароль.",
    wall_back: "← Назад, в безопасное место", wall_go: "Всё равно открыть", wall_go2: "Да, понимаю риск — открыть",
    wall_go_note: "Вы уверены? Адрес официальных сайтов лучше вводить вручную.",
    banner: "Tekshir: подозрительный сайт", banner_do: "Проверьте адрес, прежде чем вводить данные карты.",
    ok: "Понятно", quiet: "Не показывать на этом сайте",
    badge_danger: "🔴 Tekshir: опасно", badge_susp: "🟡 Tekshir: подозрительно",
    link_confirm: "Tekshir: эта ссылка ОПАСНА!\n\n{why}\n\nВсё равно открыть?",
    menu_link: "🛡 Tekshir: проверить ссылку", menu_text: "🛡 Tekshir: проверить текст",
    result_title: "Результат проверки", checked_text: "Проверенный текст"
  };
  const T = { "uz-latn": uz, ru };
  g.TekshirText = {
    defaultLang: () => (/^ru\b/i.test((g.navigator && navigator.language) || "") ? "ru" : "uz-latn"),
    s: (lang, key, vars = {}) => {
      let s = (T[lang] || uz)[key] ?? uz[key] ?? key;
      for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    DEFAULTS: { lang: "", warn: true, badges: true, quiet: [] }
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
