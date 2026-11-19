// Ma'lumotlar: til, tekshiruvlar tarixi (faqat telefonda), maslahatlar va internet orqali qo'shimcha tekshiruv.
package uz.ahdigital.tekshir.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import uz.ahdigital.tekshir.engine.Engine
import uz.ahdigital.tekshir.engine.Rules
import java.net.HttpURLConnection
import java.net.URL

/** Tarixdagi bitta yozuv. Matn qisqartirilgan, raqamlar yashirilgan (•••). */
data class HistoryItem(val level: String, val title: String, val preview: String, val at: Long)

data class Tip(val cat: String, val icon: String, val title: String, val text: String)
data class TipCat(val id: String, val icon: String, val name: String)

class Store(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("tekshir", Context.MODE_PRIVATE)

    // ---------- Til ----------
    var lang: String
        get() = prefs.getString("lang", "uz-latn") ?: "uz-latn"
        set(v) { prefs.edit().putString("lang", v).apply() }

    // ---------- 2-bosqich: xabarlarni avtomatik kuzatish ----------
    /** Foydalanuvchi kuzatishni ilova ichida vaqtincha o'chirib qo'yishi mumkin (ruxsatni olib tashlamasdan). */
    var notifGuard: Boolean
        get() = prefs.getBoolean("notif_guard", true)
        set(v) { prefs.edit().putBoolean("notif_guard", v).apply() }

    /** Avtomatik ogohlantirishlar soni (bosh ekrandagi hisob uchun). */
    val warnedCount: Int get() = prefs.getInt("warned", 0)
    fun noteWarned() = prefs.edit().putInt("warned", warnedCount + 1).apply()

    // ---------- Tekshiruv mexanizmi (assets'dagi qoidalar bilan) ----------
    val engine: Engine by lazy {
        fun asset(n: String) = ctx.assets.open(n).bufferedReader().use { it.readText() }
        Engine(Rules(asset("scam-keywords.json"), asset("url-rules.json"), asset("trusted-domains.json")))
    }

    // ---------- Tarix (faqat shu telefonda) ----------
    fun history(): List<HistoryItem> {
        val a = JSONArray(prefs.getString("history", "[]"))
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            HistoryItem(o.getString("l"), o.getString("t"), o.getString("p"), o.getLong("at"))
        }
    }

    fun addHistory(level: String, title: String, text: String) {
        val list = listOf(HistoryItem(level, title, mask(text), System.currentTimeMillis())) + history()
        val a = JSONArray()
        list.take(50).forEach { a.put(JSONObject().put("l", it.level).put("t", it.title).put("p", it.preview).put("at", it.at)) }
        prefs.edit().putString("history", a.toString()).apply()
    }

    fun clearHistory() = prefs.edit().remove("history").apply()

    // ---------- Maslahatlar (assets/tips.json — saytdagi 70 ta maslahat) ----------
    val tips: Pair<List<TipCat>, List<Tip>> by lazy {
        val o = JSONObject(ctx.assets.open("tips.json").bufferedReader().use { it.readText() })
        val c = o.getJSONArray("cats"); val t = o.getJSONArray("tips")
        (0 until c.length()).map { c.getJSONArray(it).let { x -> TipCat(x.getString(0), x.getString(1), x.getString(2)) } } to
            (0 until t.length()).map { t.getJSONArray(it).let { x -> Tip(x.getString(0), x.getString(1), x.getString(2), x.getString(3)) } }
    }

    companion object {
        /** Raqamlarni yashirish: 8 va undan ko'p raqamli ketma-ketlik → •••. Matn 80 belgigacha. */
        fun mask(s: String): String = s.replace(Regex("\\d[\\d\\s-]{6,}\\d")) { m -> m.value.replace(Regex("\\d(?=[\\d\\s-]{2})"), "•") }
            .replace(Regex("\\s+"), " ").trim().take(80)
    }
}

/** Internet orqali qo'shimcha tekshiruv (Google Safe Browsing, VirusTotal) — Tekshir serveri orqali.
 *  MAXFIYLIK: xabarning matni emas, faqat undagi HAVOLALAR yuboriladi. */
object Online {
    private const val API = "https://tekshir.ah-digital.uz/api/check"

    data class Answer(val level: String, val title: String, val reasons: List<String>)

    /** Tarmoqda ishlaydi — faqat fon oqimidan (Dispatchers.IO) chaqiring. Xato bo'lsa — null. */
    fun checkLinks(urls: List<String>, lang: String): Answer? = try {
        val conn = (URL(API).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"; connectTimeout = 6000; readTimeout = 12000; doOutput = true
            setRequestProperty("Content-Type", "application/json")
        }
        val body = JSONObject().put("text", urls.joinToString("\n")).put("lang", lang).put("app", "tekshir-android").toString()
        conn.outputStream.use { it.write(body.toByteArray()) }
        if (conn.responseCode != 200) null else {
            val o = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            val r = o.getJSONArray("reasons")
            Answer(o.getString("level"), o.getString("title"), (0 until r.length()).map { r.getString(it) })
        }
    } catch (e: Exception) { null }
}
