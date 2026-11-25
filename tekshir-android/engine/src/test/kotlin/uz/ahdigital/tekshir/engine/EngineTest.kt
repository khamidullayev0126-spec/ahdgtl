package uz.ahdigital.tekshir.engine

import org.json.JSONArray
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EngineTest {
    private fun res(name: String) = javaClass.classLoader.getResource(name)!!.readText()
    private val engine = Engine(Rules(res("scam-keywords.json"), res("url-rules.json"), res("trusted-domains.json")))

    /** Asosiy test: Telegram botdagi mexanizm bilan BIR XIL natija (parity.json botdan yaratilgan: tekshir-bot → node scripts/parity.js). */
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

    /** Xato edi: «yutdingiz» (25) + «.click» (25) alohida 30 ga yetmasdi → SAFE chiqardi. Endi — kamida SUSPICIOUS. */
    @Test fun sovrinVaShubhaliHavola() {
        for (msg in listOf(
            "Tabriklaymiz! Siz iPhone 16 yutdingiz. Sovg'ani olish uchun https://yutuq-uz.click saytiga kiring",
            "Поздравляем! Вы выиграли iPhone 16. Заберите приз на https://yutuq-uz.click",
            "Posilkangiz keldi: https://mening-saytim.click",
            "Pul o'tkazing: https://mening-saytim.click"
        )) assertTrue(engine.check(msg).score >= 30, msg)
        // Rasmiy sayt, havolasiz xabar va firibgar matnsiz havola — xavfsiz qoladi
        assertEquals(Level.SAFE, engine.check("Bonus yutdingiz! Batafsil: https://click.uz").level)
        assertEquals(Level.SAFE, engine.check("Tabriklaymiz! Siz iPhone 16 yutdingiz").level)
        assertEquals(Level.SAFE, engine.check("Mana mening saytim: https://mening-saytim.click").level)
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
