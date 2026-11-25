// Tekshir veb-ilovasi: 🆘 «Aldandim», ✈️ Telegram himoyasi, 🎓 «Firibgarni tani».
// Matnlar Android ilovadagi bilan AYNAN bir xil (tekshir-android/.../engine/Help.kt) — tests/yordam.test.js tekshiradi.
window.YORDAM = {
  rescue: {
    uz: [
      { id: "code", icon: "💳", title: "Karta ma'lumoti, SMS kod yoki parolni aytdim", steps: [
        "Darhol bank ilovasida kartani bloklang yoki kartaning orqasidagi bank raqamiga qo'ng'iroq qiling.",
        "Bankka ayting: «Firibgarlarga kod berdim» — shubhali to'lovlarni to'xtatishni so'rang.",
        "Bank ilovasi, Click va Payme parollarini almashtiring.",
        "Yozishmalar, firibgar raqami va yechilgan pullarni skrinshot qiling — bular dalil.",
        "102 ga qo'ng'iroq qiling yoki yaqin ichki ishlar bo'limiga ariza bering.",
        "Yana qo'ng'iroq qilib «pulingizni qaytaramiz» deyishsa — ishonmang. Bu ikkinchi firibgarlik."] },
      { id: "money", icon: "💸", title: "Firibgarga pul o'tkazib yubordim", steps: [
        "Darhol bankingizga (yoki Click/Payme qo'llab-quvvatlash xizmatiga) qo'ng'iroq qilib, o'tkazmani to'xtatishni so'rang. Qancha tez bo'lsa, imkoniyat shuncha katta.",
        "Chekni saqlang: vaqt, summa va qabul qiluvchi karta raqami.",
        "102 ga qo'ng'iroq qiling yoki ichki ishlar bo'limiga chek va skrinshotlar bilan ariza bering.",
        "«Komissiya to'lasangiz, pulingizni qaytaramiz» deganlarga pul bermang — bu yana firibgarlar.",
        "Firibgar raqamini @tekshirbot_bot ga shikoyat sifatida yuboring — boshqalarni ogohlantiradi."] },
      { id: "apk", icon: "📲", title: "Shubhali ilova (APK) o'rnatdim", steps: [
        "Telefon internetini o'chiring (Wi-Fi va mobil internet).",
        "Ilovani o'chiring: Tekshir → «Yangi ilovalar» uni topib beradi. O'chmasa — Sozlamalar → Xavfsizlik → Qurilma administratorlari → ruxsatni olib tashlang, keyin o'chiring.",
        "Boshqa (toza) telefondan bank, Click va Payme parollarini almashtiring. Bankka qo'ng'iroq qilib, kartalarni vaqtincha bloklang.",
        "Telegram → Sozlamalar → Qurilmalar → «Boshqa barcha seanslarni yakunlash».",
        "Ilova o'chmasa — rasmlarni saqlab, telefonni zavod sozlamalariga qaytaring yoki ustaga murojaat qiling.",
        "Pul yechilgan bo'lsa — 102 ga qo'ng'iroq qiling."] },
      { id: "telegram", icon: "✈️", title: "Telegram akkauntim o'g'irlandi", steps: [
        "Hali kira olsangiz: Sozlamalar → Qurilmalar → «Boshqa barcha seanslarni yakunlash».",
        "Bulutli parolni (ikki bosqichli tasdiqlash) yoqing va tiklash uchun email qo'shing.",
        "Kira olmasangiz — o'z raqamingiz bilan qayta kiring: SMS kod sizga keladi. Parol ham almashtirilgan bo'lsa — rasmiy yordam xizmatiga yozing: telegram.org/support",
        "Yaqinlaringizni ogohlantiring: «Mening nomimdan pul yoki ovoz so'rashsa — ishonmang».",
        "Telegram kodini hech kimga bermang. Telegram xodimlari hech qachon kod so'ramaydi."] }
    ],
    ru: [
      { id: "code", icon: "💳", title: "Сообщил данные карты, SMS-код или пароль", steps: [
        "Сразу заблокируйте карту в приложении банка или позвоните по номеру на обороте карты.",
        "Скажите банку: «Я сообщил код мошенникам» — попросите остановить подозрительные платежи.",
        "Смените пароли от приложения банка, Click и Payme.",
        "Сделайте скриншоты переписки, номера мошенника и списаний — это доказательства.",
        "Позвоните 102 или подайте заявление в ближайший отдел внутренних дел.",
        "Если снова звонят и обещают «вернуть деньги» — не верьте. Это вторая волна мошенничества."] },
      { id: "money", icon: "💸", title: "Перевёл деньги мошеннику", steps: [
        "Немедленно позвоните в свой банк (или в поддержку Click/Payme) и попросите остановить перевод. Чем быстрее — тем больше шансов.",
        "Сохраните чек: время, сумму и номер карты получателя.",
        "Позвоните 102 или подайте заявление в отдел внутренних дел — с чеком и скриншотами.",
        "Не платите тем, кто обещает «вернуть деньги за комиссию» — это снова мошенники.",
        "Отправьте номер мошенника боту @tekshirbot_bot как жалобу — это предупредит других."] },
      { id: "apk", icon: "📲", title: "Установил подозрительное приложение (APK)", steps: [
        "Отключите интернет на телефоне (Wi-Fi и мобильные данные).",
        "Удалите приложение: Tekshir → «Новые приложения» поможет его найти. Не удаляется — Настройки → Безопасность → Администраторы устройства → снимите права, затем удалите.",
        "С другого (чистого) телефона смените пароли банка, Click и Payme. Позвоните в банк и временно заблокируйте карты.",
        "Telegram → Настройки → Устройства → «Завершить все другие сеансы».",
        "Если приложение не удаляется — сохраните фото и сбросьте телефон до заводских настроек или обратитесь к мастеру.",
        "Если пропали деньги — звоните 102."] },
      { id: "telegram", icon: "✈️", title: "Украли аккаунт Telegram", steps: [
        "Если ещё можете войти: Настройки → Устройства → «Завершить все другие сеансы».",
        "Включите облачный пароль (двухэтапная аутентификация) и добавьте почту для восстановления.",
        "Если не можете войти — войдите заново по своему номеру: код придёт вам по SMS. Если пароль тоже сменили — напишите в официальную поддержку: telegram.org/support",
        "Предупредите близких: «Если от моего имени просят деньги или голос — не верьте».",
        "Никому не сообщайте код Telegram. Сотрудники Telegram никогда не просят код."] }
    ],
    footer: {
      uz: "Uyalmang — bu har kimning boshiga tushishi mumkin. Yaqinlaringizga ayting: birga harakat qilish osonroq.",
      ru: "Не стыдитесь — такое может случиться с каждым. Расскажите близким: вместе действовать легче."
    }
  },

  tg: {
    uz: [
      { id: "tg_2fa", title: "Bulutli parol (ikki bosqichli tasdiqlash) yoqilgan", how: "Sozlamalar → Maxfiylik va xavfsizlik → Ikki bosqichli tasdiqlash. SMS kodni bilib olishsa ham, parolsiz kira olmaydi." },
      { id: "tg_email", title: "Tiklash uchun email qo'shilgan", how: "Bulutli parol bo'limida — «Tiklash emaili». Parolni unutsangiz, shu yordam beradi." },
      { id: "tg_sessions", title: "«Qurilmalar»da begona seans yo'q", how: "Sozlamalar → Qurilmalar. Tanimagan qurilmangiz bo'lsa — «Seansni yakunlash»." },
      { id: "tg_phone", title: "Telefon raqamim begonalarga ko'rinmaydi", how: "Maxfiylik → Telefon raqami → «Kontaktlarim» yoki «Hech kim»." },
      { id: "tg_passcode", title: "Ilovaga kod-parol qo'yilgan", how: "Maxfiylik → Kod-parol. Telefon begona qo'lga tushsa, yozishmalar yopiq qoladi." },
      { id: "tg_code", title: "Telegram kodini hech kimga bermayman", how: "Kod rasmiy «Telegram» akkauntidan keladi. Uni faqat firibgarlar so'raydi — hatto «do'stingiz» yozsa ham." },
      { id: "tg_vote", title: "«Ovoz bering», «Premium sovg'a» saytlariga raqam kiritmayman", how: "Bunday havolalar raqam va kodni so'raydi — va akkauntni o'g'irlaydi. Avval havolani Tekshir'da tekshiring." }
    ],
    ru: [
      { id: "tg_2fa", title: "Облачный пароль включён", how: "Настройки → Конфиденциальность → Двухэтапная аутентификация. Даже если узнают SMS-код, без пароля не войдут." },
      { id: "tg_email", title: "Добавлена почта для восстановления", how: "В разделе облачного пароля — «Почта для восстановления». Поможет, если забудете пароль." },
      { id: "tg_sessions", title: "В «Устройствах» нет чужих сеансов", how: "Настройки → Устройства. Не узнаёте устройство — «Завершить сеанс»." },
      { id: "tg_phone", title: "Номер телефона скрыт от чужих", how: "Конфиденциальность → Номер телефона → «Мои контакты» или «Никто»." },
      { id: "tg_passcode", title: "Код-пароль на приложение", how: "Конфиденциальность → Код-пароль. Если телефон попадёт в чужие руки, переписка закрыта." },
      { id: "tg_code", title: "Никому не сообщаю код Telegram", how: "Код приходит от официального аккаунта «Telegram». Его просят только мошенники — даже если пишет «друг»." },
      { id: "tg_vote", title: "Не ввожу номер на «голосованиях» и «подарках»", how: "Такие ссылки просят номер и код — и забирают аккаунт. Сначала проверьте ссылку в Tekshir." }
    ]
  },

  // 🔳 QR kod eslatmalari (Android HelpTexts bilan bir xil)
  qrNotes: {
    uz: {
      qr_wifi: "📶 Bu Wi-Fi tarmog'i QR kodi. Notanish joydagi tarmoqda bank ilovasiga kirmang.",
      qr_wifi_open: "📶 Parolsiz (ochiq) Wi-Fi tarmog'i. Bunday tarmoqda bank, Click va Payme'ga kirmang — ma'lumotlarni boshqalar ko'rishi mumkin.",
      qr_tel: "📞 QR kod telefon raqamini ochadi. Qo'ng'iroqda bank xodimi deb kod so'rashsa — ishonmang.",
      qr_sms: "✉️ QR kod tayyor SMS yuboradi. Pullik raqamga SMS ketishi mumkin — yuborishdan oldin raqamni tekshiring.",
      qr_geo: "📍 Bu xaritadagi joylashuv. O'zi xavfli emas.",
      qr_http: "🔓 Havola himoyalanmagan (https emas). Bunday saytga karta ma'lumotini kiritmang.",
      qr_wifi_name: "Tarmoq nomi"
    },
    ru: {
      qr_wifi: "📶 Это QR-код сети Wi-Fi. В незнакомом месте не заходите в приложение банка через такую сеть.",
      qr_wifi_open: "📶 Открытая сеть Wi-Fi без пароля. Не заходите в банк, Click и Payme — данные могут увидеть другие.",
      qr_tel: "📞 QR-код открывает номер телефона. Если при звонке «сотрудник банка» просит код — не верьте.",
      qr_sms: "✉️ QR-код отправляет готовое SMS. Оно может уйти на платный номер — проверьте номер перед отправкой.",
      qr_geo: "📍 Это место на карте. Само по себе не опасно.",
      qr_http: "🔓 Ссылка без защиты (не https). Не вводите на таком сайте данные карты.",
      qr_wifi_name: "Название сети"
    }
  },

  // scam: true — firibgarlik, false — oddiy xabar
  quiz: [
    { scam: true,
      uz: "Hurmatli mijoz, kartangiz bloklandi. Blokdan chiqarish uchun SMS kodni ayting.",
      ru: "Уважаемый клиент, ваша карта заблокирована. Для разблокировки назовите код из SMS.",
      whyUz: "Bank hech qachon SMS kodni so'ramaydi. Kodni so'rash — eng aniq firibgarlik belgisi.",
      whyRu: "Банк никогда не просит код из SMS. Просьба назвать код — главный признак мошенничества." },
    { scam: false,
      uz: "Ertaga soat 9:00 da ota-onalar majlisi bo'ladi. Sinf rahbari.",
      ru: "Завтра в 9:00 родительское собрание. Классный руководитель.",
      whyUz: "Oddiy xabar: havola yo'q, pul yoki kod so'ralmayapti.",
      whyRu: "Обычное сообщение: нет ссылки, не просят денег или код." },
    { scam: true,
      uz: "Tabriklaymiz! Siz iPhone 16 yutdingiz. Sovg'ani olish uchun karta raqamingizni yozing: https://yutuq-uz.click",
      ru: "Поздравляем! Вы выиграли iPhone 16. Чтобы получить приз, напишите номер карты: https://yutuq-uz.click",
      whyUz: "Siz qatnashmagan tanlovdagi «yutuq», karta raqami so'rash va notanish sayt — firibgarlik.",
      whyRu: "«Выигрыш» в конкурсе, где вы не участвовали, просьба номера карты и незнакомый сайт — мошенничество." },
    { scam: true,
      uz: "Salom, bu rasmlarni ko'r 😂 Rasmlar.apk",
      ru: "Привет, посмотри фотки 😂 Foto.apk",
      whyUz: "Rasm hech qachon .apk bo'lmaydi. Bu telefoningizni egallab oladigan zararli ilova.",
      whyRu: "Фото не бывает в формате .apk. Это вредоносное приложение, которое захватит телефон." },
    { scam: false,
      uz: "Oyi, darsdan keyin Alining uyiga boraman, soat 6 da qaytaman.",
      ru: "Мама, после уроков зайду к Али, вернусь в 6.",
      whyUz: "Tanish odamdan oddiy xabar — havola, pul yoki kod yo'q.",
      whyRu: "Обычное сообщение от знакомого — без ссылок, денег и кодов." },
    { scam: true,
      uz: "Iltimos, menga ovoz berib yuboring, tanlovda qatnashyapman: https://ovoz-berish.top",
      ru: "Пожалуйста, проголосуй за меня, я участвую в конкурсе: https://golosovanie.top",
      whyUz: "«Ovoz bering» havolalari Telegram raqam va kodingizni so'rab, akkauntni o'g'irlaydi.",
      whyRu: "Ссылки «проголосуй» просят номер и код Telegram — и крадут аккаунт." },
    { scam: true,
      uz: "Pochta: posilkangiz omborda qoldi. Yetkazish uchun 9 900 so'm to'lang: https://uzpost-delivery.com",
      ru: "Почта: ваша посылка на складе. Оплатите доставку 9 900 сум: https://uzpost-delivery.com",
      whyUz: "Soxta pochta sayti — kichik to'lov so'rab, karta ma'lumotingizni o'g'irlaydi.",
      whyRu: "Поддельный сайт почты — просит небольшую оплату и крадёт данные карты." },
    { scam: false,
      uz: "Bugun kechki ovqatga palov qilamiz, non olib kel.",
      ru: "Сегодня на ужин плов, купи хлеба.",
      whyUz: "Oddiy oilaviy xabar.", whyRu: "Обычное семейное сообщение." },
    { scam: true,
      uz: "Click: hisobingizga 2 500 000 so'm qaytarildi. Pulni olish uchun karta raqamingiz va SMS kodni yuboring.",
      ru: "Click: вам возвращено 2 500 000 сум. Чтобы получить деньги, отправьте номер карты и код из SMS.",
      whyUz: "Pul olish uchun kod kerak emas. Karta raqami va kod so'ralsa — bu firibgar.",
      whyRu: "Чтобы получить деньги, код не нужен. Просят номер карты и код — это мошенник." },
    { scam: false,
      uz: "Futbol mashg'uloti shanba kuni soat 10 da, stadionda.",
      ru: "Тренировка по футболу в субботу в 10:00 на стадионе.",
      whyUz: "Oddiy e'lon — hech narsa so'ralmayapti.", whyRu: "Обычное объявление — ничего не просят." }
  ]
};
