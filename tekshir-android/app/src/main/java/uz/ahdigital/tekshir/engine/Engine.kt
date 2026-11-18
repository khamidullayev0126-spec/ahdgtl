// Tekshir — tekshiruv mexanizmi (telefonning o'zida, internetsiz).
// Bu Telegram botdagi qoidalarning (tekshir-bot/src/checkers/*.js) Kotlin'dagi nusxasi.
// Bir xil qoidalar → bir xil natija: testlar (EngineTest.kt) botdagi testlar bilan bir xil holatlarni tekshiradi.
//
// MUHIM: bu fayl Android'ga bog'liq emas (faqat Kotlin + java.net + org.json).
// Shuning uchun uni kompyuterda ham sinab ko'rsa bo'ladi. Qoidalar JSON fayllardan o'qiladi (assets).

package uz.ahdigital.tekshir.engine

import org.json.JSONObject
import java.net.IDN
import java.net.URI
import java.net.URLDecoder

/** Bitta sabab: code — matn kaliti (Texts), points — xavf bali, vars — matndagi {joylar}. */
data class Reason(val code: String, val points: Int, val vars: Map<String, String> = emptyMap(), val host: String = "")

/** Bitta tekshiruv bo'lagi (havola, matn yoki fayl) natijasi. */
data class Part(val reasons: List<Reason>, val host: String = "", val trusted: Boolean = false, val pending: Boolean = false)

enum class Level { SAFE, SUSPICIOUS, DANGER }

/** Yakuniy natija. */
data class Result(
    val score: Int,
    val level: Level,
    val reasons: List<Reason>,
    val hasUrl: Boolean,
    val hasFile: Boolean,
    val groups: List<String>,
    val hosts: List<String>
)

/** Qoidalar: botdagi data papkasidagi JSON fayllar. Android'da assets'dan, testda resources'dan o'qiladi. */
class Rules(keywordsJson: String, urlRulesJson: String, trustedJson: String) {
    class Group(val id: String, val points: Int, val neg: Boolean, val regex: Regex)
    class Combo(val need: List<String>, val points: Int)
    class Trusted(val domain: String, val brand: String?, val name: String)

    val groups: List<Group>
    val negation: List<String>
    val combos: List<Combo>
    val shorteners: Set<String>
    val suspiciousTlds: Set<String>
    val pathWords: List<String>
    val secondLevel: Set<String>
    val trusted: List<Trusted>

    init {
        val k = JSONObject(keywordsJson)
        val g = k.getJSONArray("groups")
        groups = (0 until g.length()).map { i ->
            val o = g.getJSONObject(i)
            val words = o.getJSONArray("p").let { a -> (0 until a.length()).map { Regex.escape(a.getString(it)) } }
            // So'z boshidan qidiramiz: oldida harf bo'lmasin ("bonus" topiladi, "sabonus" ichidan emas)
            Group(o.getString("id"), o.getInt("points"), o.optBoolean("neg", false),
                Regex("(?iu)(?<![\\p{L}])(" + words.joinToString("|") + ")"))
        }
        negation = k.getJSONArray("negation").let { a -> (0 until a.length()).map { a.getString(it) } }
        combos = k.getJSONArray("combos").let { a ->
            (0 until a.length()).map { i ->
                val o = a.getJSONObject(i)
                Combo(o.getJSONArray("need").let { n -> (0 until n.length()).map { n.getString(it) } }, o.getInt("points"))
            }
        }
        val u = JSONObject(urlRulesJson)
        fun list(name: String) = u.getJSONArray(name).let { a -> (0 until a.length()).map { a.getString(it) } }
        shorteners = list("shorteners").toSet()
        suspiciousTlds = list("suspicious_tlds").toSet()
        pathWords = list("path_words")
        secondLevel = list("second_level").toSet()
        val t = JSONObject(trustedJson).getJSONArray("domains")
        trusted = (0 until t.length()).map { i ->
            val o = t.getJSONObject(i)
            Trusted(o.getString("domain"), if (o.has("brand") && !o.isNull("brand")) o.getString("brand") else null, o.getString("name"))
        }
    }
}

class Engine(private val rules: Rules) {

    // ================= 1. Matn =================
    /** Kichik harf, apostroflar bir xil, ё → е, ortiqcha bo'shliqlar → bitta. */
    fun normalizeText(s: String): String = s.lowercase()
        .replace(Regex("[ʻʼ‘’`´]"), "'")
        .replace("ё", "е")
        .replace(Regex("\\s+"), " ")
        .trim()

    /** «SMS kodni hech kimga aytmang» — ogohlantirish, firibgarlik emas: atrofdagi 40 belgida inkor bo'lsa — hisoblanmaydi. */
    private fun negated(text: String, index: Int, length: Int): Boolean {
        val around = text.substring(maxOf(0, index - 40), minOf(text.length, index + length + 40))
        return rules.negation.any { around.contains(it) }
    }

    fun analyzeText(raw: String): Part {
        val text = normalizeText(raw)
        val found = LinkedHashMap<String, Pair<Int, String>>()      // guruh → (ball, topilgan so'z)
        for (g in rules.groups) {
            val m = g.regex.find(text) ?: continue
            if (g.neg && negated(text, m.range.first, m.value.length)) continue
            found[g.id] = g.points to m.groupValues[1]
        }
        val reasons = found.map { (id, x) -> Reason("txt_$id", x.first, mapOf("word" to x.second)) }.toMutableList()
        for (c in rules.combos) if (c.need.all { found.containsKey(it) }) reasons += Reason("txt_combo", c.points)
        return Part(reasons).also { lastGroups = found.keys.toList() }
    }
    private var lastGroups: List<String> = emptyList()

    // ================= 2. Havolalar =================
    private val urlRe = Regex(
        "\\b((?:https?://(?:[^\\s/@]+@)?)?(?:(?:[a-z0-9\\u00a1-\\uffff](?:[a-z0-9\\u00a1-\\uffff-]*[a-z0-9\\u00a1-\\uffff])?\\.)+[a-z\\u00a1-\\uffff]{2,}|\\d{1,3}(?:\\.\\d{1,3}){3})(?::\\d{2,5})?(?:[/?#][^\\s<>\"'«»]*)?)",
        RegexOption.IGNORE_CASE
    )

    /** Matndagi havolalar (http:// bilan yoki usiz). Ko'pi bilan 10 ta. */
    fun extractUrls(text: String): List<String> {
        val found = LinkedHashSet<String>()
        for (m in urlRe.findAll(text)) {
            var u = m.groupValues[1].replace(Regex("[.,!?;:)\\]]+$"), "")
            if (Regex("^[\\d.]+$").matches(u) && !Regex("^\\d{1,3}(\\.\\d{1,3}){3}$").matches(u)) continue   // "5.000" — son, havola emas
            if (!Regex("^https?://", RegexOption.IGNORE_CASE).containsMatchIn(u)) u = "http://$u"
            found += u
        }
        return found.take(10)
    }

    private class Parsed(val host: String, val userInfo: String?, val pathAndQuery: String)

    /** Havolani bo'laklarga ajratamiz. O'zbekcha/kirillcha domen → "xn--..." (punycode), xuddi brauzerdagidek. */
    private fun parse(url: String): Parsed? = try {
        val m = Regex("^(https?)://([^/?#]*)([^#]*)", RegexOption.IGNORE_CASE).find(url) ?: throw IllegalArgumentException()
        var authority = m.groupValues[2]
        var userInfo: String? = null
        val at = authority.lastIndexOf('@')
        if (at >= 0) { userInfo = authority.substring(0, at); authority = authority.substring(at + 1) }
        val hostRaw = authority.substringBefore(':').trimEnd('.')
        if (hostRaw.isEmpty()) null
        else Parsed(IDN.toASCII(hostRaw, IDN.ALLOW_UNASSIGNED).lowercase().removePrefix("www."), userInfo, m.groupValues[3])
    } catch (e: Exception) { null }

    /** Asosiy domen: "login.click.uz.secure.top" → "secure.top";  "my.gov.uz" → "gov.uz". */
    fun registrable(host: String): String {
        val p = host.split(".")
        val last2 = p.takeLast(2).joinToString(".")
        return if (last2 in rules.secondLevel) p.takeLast(3).joinToString(".") else last2
    }
    private fun isIp(h: String) = Regex("^\\d{1,3}(\\.\\d{1,3}){3}$").matches(h)
    private fun trustedFor(h: String) = rules.trusted.firstOrNull { h == it.domain || h.endsWith("." + it.domain) }
    fun isShortener(h: String) = h in rules.shorteners

    /** Levenshtein: bir so'zni ikkinchisiga aylantirish uchun nechta harf o'zgartirish kerak ("c1ick" → "click" = 1). */
    fun levenshtein(a: String, b: String): Int {
        val dp = Array(a.length + 1) { IntArray(b.length + 1) }
        for (i in 0..a.length) dp[i][0] = i
        for (j in 0..b.length) dp[0][j] = j
        for (i in 1..a.length) for (j in 1..b.length)
            dp[i][j] = minOf(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + if (a[i - 1] == b[j - 1]) 0 else 1)
        return dp[a.length][b.length]
    }

    /** O'xshash belgilar: "l" o'rniga "1", "o" o'rniga "0" (c1ick, paym0). */
    fun homoglyph(s: String) = s.replace("rn", "m").replace("vv", "w").replace("0", "o").replace("1", "l")
        .replace("3", "e").replace("4", "a").replace("5", "s").replace("7", "t").replace("@", "a")

    fun analyzeUrl(url: String, offline: Boolean = true): Part {
        val u = parse(url) ?: return Part(emptyList())
        val host = u.host
        trustedFor(host)?.let { return Part(listOf(Reason("url_trusted", 0, mapOf("name" to it.name), host)), host, trusted = true) }

        // Qisqartirilgan havola: internetsiz qayerga olib borishini bilib bo'lmaydi
        if (offline && isShortener(host)) return Part(listOf(Reason("url_shortener_wait", 15, emptyMap(), host)), host, pending = true)

        val r = mutableListOf<Reason>()
        fun add(code: String, p: Int, v: Map<String, String> = emptyMap()) { r += Reason(code, p, v, host) }
        if (isIp(host)) add("url_ip", 45)
        if (host.split(".").any { it.startsWith("xn--") }) add("url_punycode", 60)
        if (!u.userInfo.isNullOrEmpty()) add("url_at", 50)                // https://click.uz@yomon.top — aldov

        val tld = host.substringAfterLast('.')
        if (tld in rules.suspiciousTlds) add("url_tld", 25, mapOf("tld" to ".$tld"))

        // Brendga o'xshatish: domen bo'laklarini rasmiy nomlar bilan solishtiramiz
        if (!isIp(host)) {
            val reg = registrable(host)
            val label = reg.substringBefore('.')
            val sub = host.removeSuffix(reg).split(".").filter { it.isNotEmpty() }
            val tokens = (listOf(label, label.replace(Regex("[-_]"), "")) + label.split(Regex("[-_]")) + sub + sub.flatMap { it.split(Regex("[-_]")) })
                .filter { it.isNotEmpty() }.toCollection(LinkedHashSet())
            var hit: Triple<String, Int, Rules.Trusted>? = null
            outer@ for (raw in tokens) {
                val tok = homoglyph(raw)
                for (d in rules.trusted) {
                    val brand = d.brand ?: continue
                    if (tok == brand) { hit = Triple("url_brand", 70, d); break@outer }
                    // Qisqa nomlar (xb, nbu…) faqat to'liq mos kelsa — aks holda xato signal ko'p bo'ladi
                    if (brand.length >= 5 && tok.length >= 4) {
                        val dist = levenshtein(tok, brand)
                        if (dist > 0 && dist <= (if (brand.length >= 8) 2 else 1)) {
                            // Harf qo'shilgan/tushirilgan (paymee) — 70; uzunligi bir xil (clock ↔ click) — 45
                            val p = if (tok.length != brand.length) 70 else 45
                            if (hit == null || p > hit.second) hit = Triple("url_lookalike", p, d)
                        }
                    }
                }
            }
            hit?.let { add(it.first, it.second, mapOf("name" to it.third.name, "real" to it.third.domain)) }
        }

        // Manzilda "bonus", "karta", "sms" kabi so'zlar
        val pathLow = try { URLDecoder.decode(u.pathAndQuery.lowercase().replace("+", "%2B"), "UTF-8") } catch (e: Exception) { u.pathAndQuery.lowercase() }
        rules.pathWords.firstOrNull { pathLow.contains(it) }?.let { add("url_words", 15, mapOf("word" to it)) }

        if (host.count { it == '-' } >= 3) add("url_hyphens", 10)
        return Part(r, host)
    }

    // ================= 3. Fayllar =================
    private val apk = setOf("apk", "xapk", "apks", "apkm")
    private val exec = setOf("exe", "scr", "bat", "cmd", "com", "pif", "msi", "vbs", "vbe", "js", "jse", "wsf", "hta", "jar", "ps1", "lnk", "reg")
    private val macro = setOf("docm", "xlsm", "pptm", "dotm", "xlam")
    private val archive = setOf("zip", "rar", "7z", "tar", "gz")
    private val innocent = setOf("jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt", "mp4", "mp3", "heic", "webp")

    fun analyzeFileName(name: String, mime: String = ""): Part {
        val r = mutableListOf<Reason>()
        val parts = name.lowercase().trim().split(".").toMutableList()
        val ext = if (parts.size > 1) parts.removeAt(parts.size - 1) else ""
        val prev = if (parts.size > 1) parts.last() else ""
        when {
            ext in apk -> r += Reason("file_apk", 80, mapOf("ext" to ".$ext"))
            mime == "application/vnd.android.package-archive" -> r += Reason("file_apk_hidden", 85, mapOf("ext" to if (ext.isNotEmpty()) ".$ext" else "?"))
            ext in exec -> r += Reason("file_exe", 75, mapOf("ext" to ".$ext"))
            ext in macro -> r += Reason("file_macro", 40, mapOf("ext" to ".$ext"))
            ext in archive -> r += Reason("file_archive", 15, mapOf("ext" to ".$ext"))
        }
        // "rasm.jpg.apk" — oxirgisi xavfli, oldingisi ishonch uyg'otish uchun
        if (prev.isNotEmpty() && prev in innocent && (ext in apk || ext in exec)) r += Reason("file_double", 20, mapOf("name" to name))
        if (Regex("\\s{5,}").containsMatchIn(name)) r += Reason("file_spaces", 20)
        return Part(r)
    }

    // ================= 4. Ball va daraja =================
    companion object {
        fun levelOf(score: Int) = when { score >= 70 -> Level.DANGER; score >= 30 -> Level.SUSPICIOUS; else -> Level.SAFE }
        private fun sum(p: Part) = minOf(100, p.reasons.sumOf { it.points })
    }

    /** Botdagi combineAll: eng xavfli bo'lak ball beradi; havola VA matn ikkalasi shubhali bo'lsa +20. */
    fun combine(urlParts: List<Part>, text: Part?, file: Part?, groups: List<String> = emptyList()): Result {
        val parts = urlParts + listOfNotNull(text?.takeIf { it.reasons.isNotEmpty() }, file)
        var score = 0
        val reasons = mutableListOf<Reason>()
        val seen = HashSet<String>()
        for (p in parts) {
            score = maxOf(score, sum(p))
            for (x in p.reasons) if (seen.add(x.code + x.vars.toString())) reasons += x.copy(host = p.host)
        }
        val urlMax = urlParts.maxOfOrNull { sum(it) } ?: 0
        val textScore = text?.let { sum(it) } ?: 0
        if (urlMax >= 30 && textScore >= 30) score = minOf(100, score + 20)
        val risky = reasons.filter { it.points > 0 }.sortedByDescending { it.points }
        return Result(score, levelOf(score), if (risky.isNotEmpty()) risky else reasons,
            urlParts.isNotEmpty(), file != null, groups, urlParts.map { it.host }.filter { it.isNotEmpty() })
    }

    /** Asosiy funksiya: xabar (va ixtiyoriy fayl nomi) → natija. Internetsiz. */
    fun check(text: String, fileName: String? = null, mime: String = ""): Result {
        val urls = extractUrls(text).map { analyzeUrl(it) }
        val t = analyzeText(text)
        val groups = lastGroups
        val f = fileName?.let { analyzeFileName(it, mime) }
        return combine(urls, t, f, groups)
    }

    /** Maslahatlar (botdagi reply.js → advice): natijaga qarab qaysi maslahat kalitlari ko'rsatiladi. */
    fun adviceKeys(r: Result): List<String> {
        if (r.level == Level.SAFE) return listOf("adv_safe")
        val out = mutableListOf<String>()
        if (r.level == Level.DANGER) {
            if (r.hasFile) out += "adv_no_install"
            if (r.hasUrl) out += "adv_no_open"
            out += "adv_no_code"
            if (r.groups.any { it in setOf("transfer", "money", "prize", "parcel") }) out += "adv_no_money"
            out += if (r.hasFile) "adv_installed" else "adv_call_bank"
        } else {
            if (r.hasFile) out += "adv_file_wait"
            if (r.hasUrl) out += "adv_wait"
            out += "adv_check_official"
            out += "adv_no_code"
        }
        return out
    }

    /** Tashqi tekshiruv (internet) kerakmi: qisqartirilgan havola yoki rasmiy bo'lmagan sayt. */
    fun needsOnline(text: String) = extractUrls(text).map { analyzeUrl(it) }.any { it.pending || (!it.trusted && it.host.isNotEmpty()) }
}
