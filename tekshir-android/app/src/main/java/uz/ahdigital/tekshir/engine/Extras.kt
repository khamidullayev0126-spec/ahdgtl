// 5–7-bosqichlar: Android'ga bog'liq bo'lmagan qismlar (kompyuterda test qilinadi).
package uz.ahdigital.tekshir.engine

/** 5-bosqich: 🩺 telefon xavfsizlik bali (0–100). */
object SecurityScore {
    /** ok == null — bu telefonda tekshirib bo'lmaydi (ballga qo'shilmaydi). */
    data class Check(val id: String, val ok: Boolean?, val weight: Int)

    fun score(checks: List<Check>): Int {
        val known = checks.filter { it.ok != null }
        val total = known.sumOf { it.weight }
        if (total == 0) return 0
        return Math.round(known.filter { it.ok == true }.sumOf { it.weight } * 100.0 / total).toInt()
    }

    /** 80+ — yaxshi (yashil), 50–79 — o'rtacha (sariq), <50 — xavfli (qizil). */
    fun level(score: Int) = when { score >= 80 -> Level.SAFE; score >= 50 -> Level.SUSPICIOUS; else -> Level.DANGER }

    /** Xavfsizlik yangilanishi eskirganmi: "2025-10-05" → bugundan necha kun oldin. Noma'lum — null. */
    fun patchAgeDays(patch: String?, todayEpochDay: Long): Long? = try {
        if (patch.isNullOrBlank()) null else todayEpochDay - java.time.LocalDate.parse(patch.trim()).toEpochDay()
    } catch (_: Exception) { null }
}

/** 6-bosqich: 📞 qo'ng'iroq qilgan raqam. */
object CallCheck {
    private val UZ_CODES = setOf("20", "33", "50", "55", "61", "62", "65", "66", "67", "69", "70", "71", "72", "73", "74", "75",
        "76", "77", "78", "79", "88", "90", "91", "93", "94", "95", "97", "98", "99")

    /** O'zbekiston raqami → "998XXXXXXXXX" (botdagi bilan bir xil). Boshqa raqam — null (tekshirilmaydi). */
    fun normalizeUz(raw: String?): String? {
        var d = raw.orEmpty().filter { it.isDigit() }
        if (d.length == 9) d = "998$d"
        return if (d.length == 12 && d.startsWith("998") && d.substring(3, 5) in UZ_CODES) d else null
    }

    /** Shikoyat bor bo'lsa ogohlantiramiz. Shikoyat — dalil emas, shuning uchun «xavfli» emas, «diqqat». */
    fun shouldWarn(complaints: Int) = complaints >= 1

    fun mask(d: String) = "+998 ${d.substring(3, 5)} *** ** ${d.takeLast(2)}"
}

/** 7-bosqich: 👨‍👩‍👧 oila himoyasi — botga faqat xavf TURI yuboriladi. */
object Family {
    val KINDS = setOf("message", "app", "apk", "call")
    fun validCode(s: String) = Regex("^\\d{6}$").matches(s.trim())
    /** Faqat 🔴 xavfli holatlarda (qo'ng'iroq — shikoyat bo'lsa) yaqiniga xabar boradi — ortiqcha bezovta qilmaslik uchun. */
    fun shouldAlert(kind: String, level: Level) = kind in KINDS && (level == Level.DANGER || kind == "call")
}
