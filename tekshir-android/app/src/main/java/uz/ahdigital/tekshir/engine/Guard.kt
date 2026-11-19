// 2-bosqich: xabarlarni avtomatik kuzatish — Android'ga bog'liq bo'lmagan qism (kompyuterda test qilinadi).
// Qaysi ilova kuzatiladi, bildirishnomadan qaysi matn olinadi, bir xabar ikki marta ogohlantirilmaydi.
package uz.ahdigital.tekshir.engine

object Guard {
    /** Kuzatiladigan ilovalar: SMS, messenjerlar, ijtimoiy tarmoqlar. */
    val WATCHED = setOf(
        "com.google.android.apps.messaging",   // Google Xabarlar (SMS)
        "com.samsung.android.messaging",        // Samsung Xabarlar (SMS)
        "com.android.mms", "com.android.messaging",
        "org.telegram.messenger", "org.telegram.messenger.web", "org.thunderdog.challegram",  // Telegram, Telegram X
        "com.whatsapp", "com.whatsapp.w4b",     // WhatsApp, WhatsApp Business
        "com.instagram.android", "com.facebook.orca", "com.facebook.katana",
        "com.viber.voip", "com.imo.android.imoim", "com.google.android.gm"
    )

    /** Bildirishnoma kuzatiladimi. category == "msg" — Android'ning «xabar» turi (boshqa messenjerlar ham). */
    fun watched(pkg: String, category: String?, ownPkg: String): Boolean =
        pkg != ownPkg && (pkg in WATCHED || category == "msg")

    /** Bildirishnomadagi matnni yig'adi: sarlavha (yuboruvchi) + eng to'liq matn + oxirgi xabarlar. */
    fun messageText(title: String?, text: String?, bigText: String?, lines: List<String> = emptyList()): String {
        val body = listOfNotNull(bigText, text).filter { it.isNotBlank() }.maxByOrNull { it.length }
        val parts = (listOfNotNull(title, body) + lines.takeLast(3)).map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        return parts.joinToString("\n").take(2000)
    }

    /** Juda qisqa matn (masalan «Rasm», «👍») tekshirilmaydi. */
    fun worthChecking(s: String) = s.count { it.isLetterOrDigit() } >= 8

    /** Ogohlantirish kerakmi: faqat shubhali yoki xavfli bo'lsa. */
    fun shouldWarn(r: Result) = r.level != Level.SAFE

    /** Bir xil xabar uchun ikki marta ogohlantirmaslik (messenjerlar bildirishnomani qayta-qayta yangilaydi). */
    class Dedupe(private val max: Int = 100) {
        private val seen = LinkedHashSet<Int>()
        fun firstTime(s: String): Boolean {
            val h = s.lowercase().replace(Regex("\\s+"), " ").trim().hashCode()
            if (!seen.add(h)) return false
            if (seen.size > max) seen.remove(seen.first())
            return true
        }
    }
}
