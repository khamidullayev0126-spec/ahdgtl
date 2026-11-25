package uz.ahdigital.tekshir.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class HelpTest {
    private fun res(name: String) = javaClass.classLoader.getResource(name)!!.readText()
    private val engine = Engine(Rules(res("scam-keywords.json"), res("url-rules.json"), res("trusted-domains.json")))

    // ---------- 📸 Matndagi fayl nomi ----------
    @Test fun matndagiApk() {
        assertEquals("Rasmlar.apk", Scan.fileInText("Salom, bu rasmlarni ko'r 😂 Rasmlar.apk"))
        assertEquals("Foto_2026.APK", Scan.fileInText("Ochib ko'r: «Foto_2026.APK»"))
        assertEquals(null, Scan.fileInText("apk nima degani? .apk — fayl turi"))
        assertEquals(null, Scan.fileInText("Sayt: https://example.com/apkinfo"))
        assertEquals(Level.DANGER, Scan.check(engine, "Salom, bu rasmlarni ko'r 😂 Rasmlar.apk").level)
        assertEquals(Level.SAFE, Scan.check(engine, "Ertaga darsga kelasanmi?").level)
    }

    // ---------- 🔳 QR ----------
    @Test fun qrHavola() {
        val q = QrCheck.parse("  https://c1ick-uz.com/pay ")
        assertEquals(QrKind.URL, q.kind)
        assertEquals(Level.DANGER, engine.check(QrCheck.textToCheck(q)).level)
        assertTrue(QrCheck.notes(QrCheck.parse("http://example.com")).contains("qr_http"))
        assertTrue(QrCheck.notes(q).isEmpty())
    }

    @Test fun qrWifiParolKorinmaydi() {
        val q = QrCheck.parse("WIFI:T:WPA;S:Uy\\;tarmoq;P:juda-maxfiy;H:false;;")
        assertEquals(QrKind.WIFI, q.kind)
        assertEquals("Uy;tarmoq", q.fields["ssid"])
        assertEquals("wpa", q.fields["security"])
        assertFalse(q.toString().contains("juda-maxfiy"), "Wi-Fi paroli saqlanmasligi kerak")
        assertEquals("", QrCheck.textToCheck(q))
        assertEquals(listOf("qr_wifi"), QrCheck.notes(q))
        assertEquals(listOf("qr_wifi_open"), QrCheck.notes(QrCheck.parse("WIFI:S:Kafe;T:nopass;;")))
        assertEquals(listOf("qr_wifi_open"), QrCheck.notes(QrCheck.parse("WIFI:S:Kafe;;")))
    }

    @Test fun qrSmsVaTelefon() {
        val s = QrCheck.parse("SMSTO:+998901234567:Kartangiz bloklandi, SMS kodni ayting")
        assertEquals(QrKind.SMS, s.kind)
        assertEquals("+998901234567", s.fields["to"])
        assertNotEquals(Level.SAFE, engine.check(QrCheck.textToCheck(s)).level)
        val s2 = QrCheck.parse("sms:+998901234567?body=Salom%20do%27stim")
        assertEquals("Salom do'stim", s2.text)
        val t = QrCheck.parse("tel:+998 90 123 45 67")
        assertEquals(QrKind.TEL, t.kind)
        assertEquals(listOf("qr_tel"), QrCheck.notes(t))
        assertEquals(QrKind.EMPTY, QrCheck.parse("   ").kind)
        assertEquals(QrKind.TEXT, QrCheck.parse("Salom").kind)
    }

    @Test fun qrMatnlariIkkiTilda() {
        for (k in listOf("qr_wifi", "qr_wifi_open", "qr_tel", "qr_sms", "qr_geo", "qr_http")) {
            assertNotEquals(k, HelpTexts.t("uz-latn", k)); assertNotEquals(k, HelpTexts.t("ru", k))
            assertNotEquals(HelpTexts.t("uz-latn", k), HelpTexts.t("ru", k))
        }
    }

    // ---------- 🆘 Aldandim ----------
    @Test fun aldandimHarHolatTayyor() {
        for (lang in listOf("uz-latn", "ru")) {
            val list = Rescue.cases(lang)
            assertEquals(Rescue.ids, list.map { it.id })
            list.forEach { c -> assertTrue(c.steps.size >= 4, "${c.id}: kamida 4 qadam"); assertTrue(c.title.isNotBlank()) }
            // Pul bilan bog'liq holatlarda 102 bor
            listOf("code", "money", "apk").forEach { id -> assertTrue(Rescue.case(lang, id).steps.any { "102" in it }, "$id/$lang: 102") }
        }
        // Ikki tilda qadamlar soni bir xil
        Rescue.ids.forEach { assertEquals(Rescue.case("uz-latn", it).steps.size, Rescue.case("ru", it).steps.size) }
    }

    // ---------- ✈️ Telegram ----------
    @Test fun telegramRoyxati() {
        assertEquals(TgSafety.ids, TgSafety.items("uz-latn").map { it.id })
        assertEquals(TgSafety.ids, TgSafety.items("ru").map { it.id })
        assertEquals(Level.SAFE, TgSafety.level(7))
        assertEquals(Level.SUSPICIOUS, TgSafety.level(5))
        assertEquals(Level.DANGER, TgSafety.level(2))
        TgSafety.items("uz-latn").forEach { assertTrue(it.link.isEmpty() || it.link.startsWith("tg://")) }
    }

    // ---------- 🎓 Mashq ----------
    /** Mashqdagi javoblar Tekshir mexanizmining o'zi bilan mos bo'lishi shart: firibgar — ogohlantiradi, oddiy — xavfsiz. */
    @Test fun mashqMexanizmBilanMos() {
        for (lang in listOf("uz-latn", "ru")) {
            val qs = Quiz.questions(lang)
            assertEquals(10, qs.size)
            assertTrue(qs.count { it.scam } in 5..7, "aralash bo'lsin")
            val bad = qs.filter { q -> (Scan.check(engine, q.text).level != Level.SAFE) != q.scam }
                .map { "${it.text} → ${Scan.check(engine, it.text).level}" }
            assertTrue(bad.isEmpty(), "$lang: mexanizm boshqacha javob berdi:\n" + bad.joinToString("\n"))
        }
    }

    @Test fun mashqNatijasi() {
        assertEquals("quiz_r3", Quiz.result(10, 10))
        assertEquals("quiz_r3", Quiz.result(9, 10))
        assertEquals("quiz_r2", Quiz.result(7, 10))
        assertEquals("quiz_r1", Quiz.result(3, 10))
        assertEquals("quiz_r1", Quiz.result(0, 0))
    }
}
