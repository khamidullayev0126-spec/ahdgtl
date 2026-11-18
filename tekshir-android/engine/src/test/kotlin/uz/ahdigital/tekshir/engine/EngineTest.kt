package uz.ahdigital.tekshir.engine

import org.json.JSONArray
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EngineTest {
    private fun res(name: String) = javaClass.classLoader.getResource(name)!!.readText()
    private val engine = Engine(Rules(res("scam-keywords.json"), res("url-rules.json"), res("trusted-domains.json")))

    /** Asosiy test: Telegram botdagi mexanizm bilan BIR XIL natija (42 ta holat — parity.json botdan yaratilgan). */
    @Test fun botBilanBirXil() {
        val cases = JSONArray(res("parity.json"))
        val errors = mutableListOf<String>()
        for (i in 0 until cases.length()) {
            val c = cases.getJSONObject(i)
            val text = c.getString("text")
            val file = if (c.isNull("file")) null else c.getString("file")
            val r = engine.check(text, file)
            val codes = c.getJSONArray("codes").let { a -> (0 until a.length()).map { a.getString(it) } }
            val got = r.reasons.map { it.code }
            if (r.level.name.lowercase() != c.getString("level") || r.score != c.getInt("score") || got != codes)
                errors += "«${text.ifEmpty { file }}»: bot=${c.getString("level")}/${c.getInt("score")} $codes, kotlin=${r.level}/${r.score} $got"
        }
        assertTrue(errors.isEmpty(), "Farqlar:\n" + errors.joinToString("\n"))
    }

    @Test fun matnlarTayyor() {
        assertEquals("🔴 XAVFLI", Texts.t("uz-latn", "level_danger"))
        assertTrue(Texts.t("ru", "url_brand", mapOf("name" to "Click", "real" to "click.uz")).contains("click.uz"))
        assertTrue(Texts.t("uz-cyrl", "level_safe").isNotEmpty())
    }

    @Test fun maslahatlar() {
        val r = engine.check("Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com")
        val adv = engine.adviceKeys(r)
        assertEquals(listOf("adv_no_open", "adv_no_code", "adv_call_bank"), adv)
        assertEquals(listOf("adv_safe"), engine.adviceKeys(engine.check("Salom")))
    }

    @Test fun internetKerakmi() {
        assertTrue(engine.needsOnline("https://bit.ly/abc"))
        assertTrue(!engine.needsOnline("https://click.uz"))
        assertTrue(!engine.needsOnline("Salom, qalaysan"))
    }
}
