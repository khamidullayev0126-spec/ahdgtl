// 3-bosqich: 📲 o'rnatilgan ilovani tekshirish — Android'ga bog'liq bo'lmagan qism (kompyuterda test qilinadi).
// Firibgarlarning asosiy usuli: Telegram'da «Rasmlar.apk», «Click.apk» yuborish. O'rnatilgach u SMS kodlarni o'qiydi
// yoki ekranni boshqaradi. Shuning uchun: Play Market'dan EMAS + xavfli ruxsatlar + taniqli nom = xavfli.
package uz.ahdigital.tekshir.engine

/** Ilova haqidagi ma'lumot (Android PackageManager'dan yig'iladi). */
data class AppInfo(
    val pkg: String,
    val label: String,
    val installer: String?,          // qaysi do'kon o'rnatgan (com.android.vending — Play Market)
    val from: String? = null,        // qaysi ilova orqali kelgan (masalan «Telegram») — ko'rsatish uchun
    val system: Boolean = false,
    val permissions: Set<String> = emptySet(),
    val accessibility: Boolean = false,   // «Maxsus imkoniyatlar» xizmati — ekranni ko'radi va bosadi
    val deviceAdmin: Boolean = false,     // «Qurilma administratori» — o'chirishni qiyinlashtiradi
    val notifListener: Boolean = false    // bildirishnomalarni (SMS kodlarni) o'qiydi
)

data class AppVerdict(val score: Int, val level: Level, val reasons: List<Reason>)

object AppCheck {
    /** Ishonchli do'konlar: Play Market, Galaxy Store, Huawei, Xiaomi, Oppo, Vivo, RuStore… */
    val TRUSTED_STORES = setOf(
        "com.android.vending", "com.google.android.feedback", "com.sec.android.app.samsungapps",
        "com.huawei.appmarket", "com.xiaomi.market", "com.xiaomi.mipicks", "com.heytap.market",
        "com.oppo.market", "com.vivo.appstore", "com.amazon.venezia", "ru.vk.store"
    )

    /** Firibgarlar ko'p soxtalashtiradigan nomlar: to'lov tizimlari, banklar, davlat xizmatlari. */
    private val BRANDS = listOf(
        "click", "payme", "uzum", "humo", "uzcard", "paynet", "apelsin", "kapitalbank", "ipak yo", "hamkor",
        "agrobank", "xalq bank", "anorbank", "tbc", "sqb", "nbu", "davr", "asaka", "infinbank", "aloqabank",
        "bank", "банк", "my.gov", "mygov", "soliq", "налог", "pochta", "uzpost", "почта", "госуслуг"
    )

    /** «Qiziqtiruvchi» nomlar: rasm, video, tabriknoma, posilka — odamni ochishga undaydi. */
    private val LURES = listOf(
        "rasm", "foto", "photo", "фото", "video", "видео", "tabrik", "открытк", "posilka", "посылк",
        "dostavka", "доставк", "yutuq", "приз", "kino", "apk"
    )

    private val SMS = setOf("android.permission.RECEIVE_SMS", "android.permission.READ_SMS")
    private val CALLS = setOf("android.permission.READ_CALL_LOG", "android.permission.CALL_PHONE",
        "android.permission.ANSWER_PHONE_CALLS", "android.permission.PROCESS_OUTGOING_CALLS")

    fun fromStore(a: AppInfo) = a.installer != null && a.installer in TRUSTED_STORES

    /** Tizim ilovalari va do'kondan o'rnatilganlar tekshirilmaydi (do'kon o'zi tekshiradi) — ortiqcha xavotir bo'lmasin. */
    fun analyze(a: AppInfo, ownPkg: String = "uz.ahdigital.tekshir"): AppVerdict {
        if (a.system || fromStore(a) || a.pkg == ownPkg) return AppVerdict(0, Level.SAFE, emptyList())
        val r = mutableListOf<Reason>()
        fun add(code: String, p: Int, v: Map<String, String> = emptyMap()) { r += Reason(code, p, v) }

        add("app_unknown_src", 30, mapOf("from" to (a.from ?: "")))
        val name = a.label.lowercase()
        BRANDS.firstOrNull { name.contains(it) }?.let { add("app_brand", 40, mapOf("name" to a.label)) }
            ?: LURES.firstOrNull { name.contains(it) }?.let { add("app_lure", 25, mapOf("name" to a.label)) }
        if (a.permissions.any { it in SMS }) add("app_sms", 30)
        if (a.accessibility) add("app_access", 30)
        if (a.deviceAdmin) add("app_admin", 20)
        if (a.notifListener) add("app_notif", 15)
        if ("android.permission.SYSTEM_ALERT_WINDOW" in a.permissions) add("app_overlay", 15)
        if ("android.permission.REQUEST_INSTALL_PACKAGES" in a.permissions) add("app_install", 10)
        if (a.permissions.any { it in CALLS }) add("app_calls", 10)

        val score = minOf(100, r.sumOf { it.points })
        return AppVerdict(score, Engine.levelOf(score), r.sortedByDescending { it.points })
    }
}
