// Tekshir — yordam bo'limlari (9-bosqich). Android'siz ham ishlaydi, shuning uchun kompyuterda test qilinadi.
//   🔳 QrCheck   — QR kod ichidagini aniqlash (havola, Wi-Fi, telefon, SMS…) va tekshirishga tayyorlash
//   🆘 Rescue    — «Aldandim, nima qilay?»: holatga qarab qadam-baqadam yo'riqnoma
//   ✈️ TgSafety  — Telegram akkauntini himoyalash ro'yxati
//   🎓 Quiz      — «Firibgarni tani» mashqi
// Tillar: "uz-latn" (asosiy) va "ru".
package uz.ahdigital.tekshir.engine

// ======================= 📸 Matn ichidagi fayl nomi =======================
/**
 * Skrinshotdan o'qilgan yoki ko'chirilgan matnda «Rasmlar.apk» kabi fayl nomi bo'lsa — uni fayl sifatida ham tekshiradi.
 * Botdagi mexanizm (Engine) o'zgarmaydi: fayl nomi Engine.check(text, fileName) ga alohida beriladi.
 */
object Scan {
    private val fileRe = Regex("""[^\s/\\"'«»()<>]{1,80}\.(apk|xapk|apks|exe|msi|scr|bat|cmd|vbs|jar)(?![\p{L}\p{N}])""", RegexOption.IGNORE_CASE)

    fun fileInText(text: String): String? = fileRe.find(text)?.value

    fun check(engine: Engine, text: String): Result = engine.check(text, fileInText(text))
}

// ======================= 🔳 QR kod =======================
enum class QrKind { URL, WIFI, TEL, SMS, EMAIL, GEO, TEXT, EMPTY }

/** QR ichidagi ma'lumot. Wi-Fi paroli hech qachon saqlanmaydi va ko'rsatilmaydi. */
data class QrInfo(val kind: QrKind, val text: String, val fields: Map<String, String> = emptyMap())

object QrCheck {
    fun parse(raw: String): QrInfo {
        val s = raw.trim()
        if (s.isEmpty()) return QrInfo(QrKind.EMPTY, "")
        val low = s.lowercase()
        return when {
            low.startsWith("wifi:") -> wifi(s.substring(5))
            low.startsWith("tel:") -> QrInfo(QrKind.TEL, s.substring(4).trim())
            low.startsWith("smsto:") -> {
                val rest = s.substring(6)
                val i = rest.indexOf(':')
                if (i < 0) QrInfo(QrKind.SMS, rest.trim(), mapOf("to" to rest.trim()))
                else QrInfo(QrKind.SMS, rest.substring(i + 1).trim(), mapOf("to" to rest.substring(0, i).trim()))
            }
            low.startsWith("sms:") -> {
                val rest = s.substring(4)
                val to = rest.substringBefore('?').trim()
                val body = Regex("[?&]body=([^&]*)").find(rest)?.groupValues?.get(1)?.let(::decode) ?: ""
                QrInfo(QrKind.SMS, body, mapOf("to" to to))
            }
            low.startsWith("mailto:") || low.startsWith("matmsg:") -> QrInfo(QrKind.EMAIL, s)
            low.startsWith("geo:") -> QrInfo(QrKind.GEO, s)
            low.startsWith("http://") || low.startsWith("https://") || low.startsWith("www.") -> QrInfo(QrKind.URL, s)
            else -> QrInfo(QrKind.TEXT, s)
        }
    }

    /** Asosiy mexanizmga (Engine.check) beriladigan matn. Bo'sh bo'lsa — tekshiradigan matn yo'q (Wi-Fi, joylashuv). */
    fun textToCheck(q: QrInfo): String = when (q.kind) {
        QrKind.URL, QrKind.TEXT, QrKind.EMAIL -> q.text
        QrKind.SMS -> listOf(q.text, q.fields["to"].orEmpty()).filter { it.isNotBlank() }.joinToString("\n")
        QrKind.TEL -> q.text
        QrKind.WIFI, QrKind.GEO, QrKind.EMPTY -> ""
    }

    /** QR turiga qarab qo'shimcha eslatmalar (matnlari — HelpTexts). */
    fun notes(q: QrInfo): List<String> = buildList {
        when (q.kind) {
            QrKind.WIFI -> add(if (q.fields["security"] == "nopass") "qr_wifi_open" else "qr_wifi")
            QrKind.TEL -> add("qr_tel")
            QrKind.SMS -> add("qr_sms")
            QrKind.GEO -> add("qr_geo")
            QrKind.URL -> if (q.text.lowercase().startsWith("http://")) add("qr_http")
            else -> {}
        }
    }

    // WIFI:T:WPA;S:Uy tarmog'i;P:parol;H:false;;   (\; \: \, \\ — qochirilgan belgilar)
    private fun wifi(body: String): QrInfo {
        val f = mutableMapOf<String, String>()
        val cur = StringBuilder()
        var esc = false
        fun flush() {
            val p = cur.toString(); cur.clear()
            val i = p.indexOf(':')
            if (i > 0) f[p.substring(0, i).uppercase()] = p.substring(i + 1)
        }
        for (c in body) {
            when {
                esc -> { cur.append(c); esc = false }
                c == '\\' -> esc = true
                c == ';' -> flush()
                else -> cur.append(c)
            }
        }
        flush()
        val t = f["T"].orEmpty().uppercase()
        val security = when { t.isEmpty() || t == "NOPASS" -> "nopass"; t.startsWith("WPA") -> "wpa"; t == "WEP" -> "wep"; else -> t.lowercase() }
        // Parol (P) ataylab olinmaydi — u kerak emas va hech qayerda ko'rinmasligi kerak
        return QrInfo(QrKind.WIFI, f["S"].orEmpty(), mapOf("ssid" to f["S"].orEmpty(), "security" to security, "hidden" to (f["H"] ?: "false")))
    }

    private fun decode(s: String) = try { java.net.URLDecoder.decode(s, "UTF-8") } catch (_: Exception) { s }
}

// ======================= 🆘 «Aldandim, nima qilay?» =======================
data class RescueCase(val id: String, val icon: String, val title: String, val steps: List<String>)

object Rescue {
    val ids = listOf("code", "money", "apk", "telegram")

    fun cases(lang: String): List<RescueCase> = ids.map { case(lang, it) }

    fun case(lang: String, id: String): RescueCase {
        val ru = lang == "ru"
        return when (id) {
            "code" -> RescueCase(id, "💳",
                if (ru) "Сообщил данные карты, SMS-код или пароль" else "Karta ma'lumoti, SMS kod yoki parolni aytdim",
                if (ru) listOf(
                    "Сразу заблокируйте карту в приложении банка или позвоните по номеру на обороте карты.",
                    "Скажите банку: «Я сообщил код мошенникам» — попросите остановить подозрительные платежи.",
                    "Смените пароли от приложения банка, Click и Payme.",
                    "Сделайте скриншоты переписки, номера мошенника и списаний — это доказательства.",
                    "Позвоните 102 или подайте заявление в ближайший отдел внутренних дел.",
                    "Если снова звонят и обещают «вернуть деньги» — не верьте. Это вторая волна мошенничества."
                ) else listOf(
                    "Darhol bank ilovasida kartani bloklang yoki kartaning orqasidagi bank raqamiga qo'ng'iroq qiling.",
                    "Bankka ayting: «Firibgarlarga kod berdim» — shubhali to'lovlarni to'xtatishni so'rang.",
                    "Bank ilovasi, Click va Payme parollarini almashtiring.",
                    "Yozishmalar, firibgar raqami va yechilgan pullarni skrinshot qiling — bular dalil.",
                    "102 ga qo'ng'iroq qiling yoki yaqin ichki ishlar bo'limiga ariza bering.",
                    "Yana qo'ng'iroq qilib «pulingizni qaytaramiz» deyishsa — ishonmang. Bu ikkinchi firibgarlik."
                ))
            "money" -> RescueCase(id, "💸",
                if (ru) "Перевёл деньги мошеннику" else "Firibgarga pul o'tkazib yubordim",
                if (ru) listOf(
                    "Немедленно позвоните в свой банк (или в поддержку Click/Payme) и попросите остановить перевод. Чем быстрее — тем больше шансов.",
                    "Сохраните чек: время, сумму и номер карты получателя.",
                    "Позвоните 102 или подайте заявление в отдел внутренних дел — с чеком и скриншотами.",
                    "Не платите тем, кто обещает «вернуть деньги за комиссию» — это снова мошенники.",
                    "Отправьте номер мошенника боту @tekshirbot_bot как жалобу — это предупредит других."
                ) else listOf(
                    "Darhol bankingizga (yoki Click/Payme qo'llab-quvvatlash xizmatiga) qo'ng'iroq qilib, o'tkazmani to'xtatishni so'rang. Qancha tez bo'lsa, imkoniyat shuncha katta.",
                    "Chekni saqlang: vaqt, summa va qabul qiluvchi karta raqami.",
                    "102 ga qo'ng'iroq qiling yoki ichki ishlar bo'limiga chek va skrinshotlar bilan ariza bering.",
                    "«Komissiya to'lasangiz, pulingizni qaytaramiz» deganlarga pul bermang — bu yana firibgarlar.",
                    "Firibgar raqamini @tekshirbot_bot ga shikoyat sifatida yuboring — boshqalarni ogohlantiradi."
                ))
            "apk" -> RescueCase(id, "📲",
                if (ru) "Установил подозрительное приложение (APK)" else "Shubhali ilova (APK) o'rnatdim",
                if (ru) listOf(
                    "Отключите интернет на телефоне (Wi-Fi и мобильные данные).",
                    "Удалите приложение: Tekshir → «Новые приложения» поможет его найти. Не удаляется — Настройки → Безопасность → Администраторы устройства → снимите права, затем удалите.",
                    "С другого (чистого) телефона смените пароли банка, Click и Payme. Позвоните в банк и временно заблокируйте карты.",
                    "Telegram → Настройки → Устройства → «Завершить все другие сеансы».",
                    "Если приложение не удаляется — сохраните фото и сбросьте телефон до заводских настроек или обратитесь к мастеру.",
                    "Если пропали деньги — звоните 102."
                ) else listOf(
                    "Telefon internetini o'chiring (Wi-Fi va mobil internet).",
                    "Ilovani o'chiring: Tekshir → «Yangi ilovalar» uni topib beradi. O'chmasa — Sozlamalar → Xavfsizlik → Qurilma administratorlari → ruxsatni olib tashlang, keyin o'chiring.",
                    "Boshqa (toza) telefondan bank, Click va Payme parollarini almashtiring. Bankka qo'ng'iroq qilib, kartalarni vaqtincha bloklang.",
                    "Telegram → Sozlamalar → Qurilmalar → «Boshqa barcha seanslarni yakunlash».",
                    "Ilova o'chmasa — rasmlarni saqlab, telefonni zavod sozlamalariga qaytaring yoki ustaga murojaat qiling.",
                    "Pul yechilgan bo'lsa — 102 ga qo'ng'iroq qiling."
                ))
            else -> RescueCase("telegram", "✈️",
                if (ru) "Украли аккаунт Telegram" else "Telegram akkauntim o'g'irlandi",
                if (ru) listOf(
                    "Если ещё можете войти: Настройки → Устройства → «Завершить все другие сеансы».",
                    "Включите облачный пароль (двухэтапная аутентификация) и добавьте почту для восстановления.",
                    "Если не можете войти — войдите заново по своему номеру: код придёт вам по SMS. Если пароль тоже сменили — напишите в официальную поддержку: telegram.org/support",
                    "Предупредите близких: «Если от моего имени просят деньги или голос — не верьте».",
                    "Никому не сообщайте код Telegram. Сотрудники Telegram никогда не просят код."
                ) else listOf(
                    "Hali kira olsangiz: Sozlamalar → Qurilmalar → «Boshqa barcha seanslarni yakunlash».",
                    "Bulutli parolni (ikki bosqichli tasdiqlash) yoqing va tiklash uchun email qo'shing.",
                    "Kira olmasangiz — o'z raqamingiz bilan qayta kiring: SMS kod sizga keladi. Parol ham almashtirilgan bo'lsa — rasmiy yordam xizmatiga yozing: telegram.org/support",
                    "Yaqinlaringizni ogohlantiring: «Mening nomimdan pul yoki ovoz so'rashsa — ishonmang».",
                    "Telegram kodini hech kimga bermang. Telegram xodimlari hech qachon kod so'ramaydi."
                ))
        }
    }

    /** Har bir holat oxirida ko'rsatiladigan umumiy so'z. */
    fun footer(lang: String) = if (lang == "ru")
        "Не стыдитесь — такое может случиться с каждым. Расскажите близким: вместе действовать легче."
    else "Uyalmang — bu har kimning boshiga tushishi mumkin. Yaqinlaringizga ayting: birga harakat qilish osonroq."
}

// ======================= ✈️ Telegram himoyasi =======================
/** link — Telegram ichidagi sahifa (bo'lmasa — Telegram'ning o'zi ochiladi). */
data class TgItem(val id: String, val title: String, val how: String, val link: String)

object TgSafety {
    val ids = listOf("tg_2fa", "tg_email", "tg_sessions", "tg_phone", "tg_passcode", "tg_code", "tg_vote")

    fun items(lang: String): List<TgItem> {
        val ru = lang == "ru"
        return listOf(
            TgItem("tg_2fa",
                if (ru) "Облачный пароль включён" else "Bulutli parol (ikki bosqichli tasdiqlash) yoqilgan",
                if (ru) "Настройки → Конфиденциальность → Двухэтапная аутентификация. Даже если узнают SMS-код, без пароля не войдут."
                else "Sozlamalar → Maxfiylik va xavfsizlik → Ikki bosqichli tasdiqlash. SMS kodni bilib olishsa ham, parolsiz kira olmaydi.",
                "tg://settings"),
            TgItem("tg_email",
                if (ru) "Добавлена почта для восстановления" else "Tiklash uchun email qo'shilgan",
                if (ru) "В разделе облачного пароля — «Почта для восстановления». Поможет, если забудете пароль."
                else "Bulutli parol bo'limida — «Tiklash emaili». Parolni unutsangiz, shu yordam beradi.",
                "tg://settings"),
            TgItem("tg_sessions",
                if (ru) "В «Устройствах» нет чужих сеансов" else "«Qurilmalar»da begona seans yo'q",
                if (ru) "Настройки → Устройства. Не узнаёте устройство — «Завершить сеанс»."
                else "Sozlamalar → Qurilmalar. Tanimagan qurilmangiz bo'lsa — «Seansni yakunlash».",
                "tg://settings/devices"),
            TgItem("tg_phone",
                if (ru) "Номер телефона скрыт от чужих" else "Telefon raqamim begonalarga ko'rinmaydi",
                if (ru) "Конфиденциальность → Номер телефона → «Мои контакты» или «Никто»."
                else "Maxfiylik → Telefon raqami → «Kontaktlarim» yoki «Hech kim».",
                "tg://settings"),
            TgItem("tg_passcode",
                if (ru) "Код-пароль на приложение" else "Ilovaga kod-parol qo'yilgan",
                if (ru) "Конфиденциальность → Код-пароль. Если телефон попадёт в чужие руки, переписка закрыта."
                else "Maxfiylik → Kod-parol. Telefon begona qo'lga tushsa, yozishmalar yopiq qoladi.",
                "tg://settings"),
            TgItem("tg_code",
                if (ru) "Никому не сообщаю код Telegram" else "Telegram kodini hech kimga bermayman",
                if (ru) "Код приходит от официального аккаунта «Telegram». Его просят только мошенники — даже если пишет «друг»."
                else "Kod rasmiy «Telegram» akkauntidan keladi. Uni faqat firibgarlar so'raydi — hatto «do'stingiz» yozsa ham.",
                ""),
            TgItem("tg_vote",
                if (ru) "Не ввожу номер на «голосованиях» и «подарках»" else "«Ovoz bering», «Premium sovg'a» saytlariga raqam kiritmayman",
                if (ru) "Такие ссылки просят номер и код — и забирают аккаунт. Сначала проверьте ссылку в Tekshir."
                else "Bunday havolalar raqam va kodni so'raydi — va akkauntni o'g'irlaydi. Avval havolani Tekshir'da tekshiring.",
                "")
        )
    }

    /** Belgilangan bandlar soniga qarab daraja: 7/7 — yaxshi, 4–6 — o'rtacha, kam — xavf. */
    fun level(done: Int): Level = when { done >= ids.size -> Level.SAFE; done >= 4 -> Level.SUSPICIOUS; else -> Level.DANGER }
}

// ======================= 🎓 «Firibgarni tani» mashqi =======================
/** scam = true — firibgarlik, false — oddiy (xavfsiz) xabar. */
data class QuizQ(val text: String, val scam: Boolean, val why: String)

object Quiz {
    private class Q(val uz: String, val ru: String, val scam: Boolean, val whyUz: String, val whyRu: String)

    private val all = listOf(
        Q("Hurmatli mijoz, kartangiz bloklandi. Blokdan chiqarish uchun SMS kodni ayting.",
            "Уважаемый клиент, ваша карта заблокирована. Для разблокировки назовите код из SMS.",
            true, "Bank hech qachon SMS kodni so'ramaydi. Kodni so'rash — eng aniq firibgarlik belgisi.",
            "Банк никогда не просит код из SMS. Просьба назвать код — главный признак мошенничества."),
        Q("Ertaga soat 9:00 da ota-onalar majlisi bo'ladi. Sinf rahbari.",
            "Завтра в 9:00 родительское собрание. Классный руководитель.",
            false, "Oddiy xabar: havola yo'q, pul yoki kod so'ralmayapti.",
            "Обычное сообщение: нет ссылки, не просят денег или код."),
        Q("Tabriklaymiz! Siz iPhone 16 yutdingiz. Sovg'ani olish uchun karta raqamingizni yozing: https://yutuq-uz.click",
            "Поздравляем! Вы выиграли iPhone 16. Чтобы получить приз, напишите номер карты: https://yutuq-uz.click",
            true, "Siz qatnashmagan tanlovdagi «yutuq», karta raqami so'rash va notanish sayt — firibgarlik.",
            "«Выигрыш» в конкурсе, где вы не участвовали, просьба номера карты и незнакомый сайт — мошенничество."),
        Q("Salom, bu rasmlarni ko'r 😂 Rasmlar.apk",
            "Привет, посмотри фотки 😂 Foto.apk",
            true, "Rasm hech qachon .apk bo'lmaydi. Bu telefoningizni egallab oladigan zararli ilova.",
            "Фото не бывает в формате .apk. Это вредоносное приложение, которое захватит телефон."),
        Q("Oyi, darsdan keyin Alining uyiga boraman, soat 6 da qaytaman.",
            "Мама, после уроков зайду к Али, вернусь в 6.",
            false, "Tanish odamdan oddiy xabar — havola, pul yoki kod yo'q.",
            "Обычное сообщение от знакомого — без ссылок, денег и кодов."),
        Q("Iltimos, menga ovoz berib yuboring, tanlovda qatnashyapman: https://ovoz-berish.top",
            "Пожалуйста, проголосуй за меня, я участвую в конкурсе: https://golosovanie.top",
            true, "«Ovoz bering» havolalari Telegram raqam va kodingizni so'rab, akkauntni o'g'irlaydi.",
            "Ссылки «проголосуй» просят номер и код Telegram — и крадут аккаунт."),
        Q("Pochta: posilkangiz omborda qoldi. Yetkazish uchun 9 900 so'm to'lang: https://uzpost-delivery.com",
            "Почта: ваша посылка на складе. Оплатите доставку 9 900 сум: https://uzpost-delivery.com",
            true, "Soxta pochta sayti — kichik to'lov so'rab, karta ma'lumotingizni o'g'irlaydi.",
            "Поддельный сайт почты — просит небольшую оплату и крадёт данные карты."),
        Q("Bugun kechki ovqatga palov qilamiz, non olib kel.",
            "Сегодня на ужин плов, купи хлеба.",
            false, "Oddiy oilaviy xabar.", "Обычное семейное сообщение."),
        Q("Click: hisobingizga 2 500 000 so'm qaytarildi. Pulni olish uchun karta raqamingiz va SMS kodni yuboring.",
            "Click: вам возвращено 2 500 000 сум. Чтобы получить деньги, отправьте номер карты и код из SMS.",
            true, "Pul olish uchun kod kerak emas. Karta raqami va kod so'ralsa — bu firibgar.",
            "Чтобы получить деньги, код не нужен. Просят номер карты и код — это мошенник."),
        Q("Futbol mashg'uloti shanba kuni soat 10 da, stadionda.",
            "Тренировка по футболу в субботу в 10:00 на стадионе.",
            false, "Oddiy e'lon — hech narsa so'ralmayapti.", "Обычное объявление — ничего не просят.")
    )

    fun questions(lang: String): List<QuizQ> =
        all.map { if (lang == "ru") QuizQ(it.ru, it.scam, it.whyRu) else QuizQ(it.uz, it.scam, it.whyUz) }

    /** Natija kaliti: 9–10 — «quiz_r3», 6–8 — «quiz_r2», kam — «quiz_r1». */
    fun result(correct: Int, total: Int): String = when {
        total > 0 && correct * 10 >= total * 9 -> "quiz_r3"
        total > 0 && correct * 10 >= total * 6 -> "quiz_r2"
        else -> "quiz_r1"
    }
}

// ======================= Matnlar =======================
object HelpTexts {
    private val uz = mapOf(
        "qr_wifi" to "📶 Bu Wi-Fi tarmog'i QR kodi. Notanish joydagi tarmoqda bank ilovasiga kirmang.",
        "qr_wifi_open" to "📶 Parolsiz (ochiq) Wi-Fi tarmog'i. Bunday tarmoqda bank, Click va Payme'ga kirmang — ma'lumotlarni boshqalar ko'rishi mumkin.",
        "qr_tel" to "📞 QR kod telefon raqamini ochadi. Qo'ng'iroqda bank xodimi deb kod so'rashsa — ishonmang.",
        "qr_sms" to "✉️ QR kod tayyor SMS yuboradi. Pullik raqamga SMS ketishi mumkin — yuborishdan oldin raqamni tekshiring.",
        "qr_geo" to "📍 Bu xaritadagi joylashuv. O'zi xavfli emas.",
        "qr_http" to "🔓 Havola himoyalanmagan (https emas). Bunday saytga karta ma'lumotini kiritmang.",
        "qr_wifi_name" to "Tarmoq nomi"
    )
    private val ru = mapOf(
        "qr_wifi" to "📶 Это QR-код сети Wi-Fi. В незнакомом месте не заходите в приложение банка через такую сеть.",
        "qr_wifi_open" to "📶 Открытая сеть Wi-Fi без пароля. Не заходите в банк, Click и Payme — данные могут увидеть другие.",
        "qr_tel" to "📞 QR-код открывает номер телефона. Если при звонке «сотрудник банка» просит код — не верьте.",
        "qr_sms" to "✉️ QR-код отправляет готовое SMS. Оно может уйти на платный номер — проверьте номер перед отправкой.",
        "qr_geo" to "📍 Это место на карте. Само по себе не опасно.",
        "qr_http" to "🔓 Ссылка без защиты (не https). Не вводите на таком сайте данные карты.",
        "qr_wifi_name" to "Название сети"
    )
    fun t(lang: String, key: String): String = (if (lang == "ru") ru else uz)[key] ?: uz[key] ?: key
}
