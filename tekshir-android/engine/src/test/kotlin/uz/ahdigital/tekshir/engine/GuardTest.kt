package uz.ahdigital.tekshir.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** 2-bosqich: bildirishnomalarni kuzatish mantig'i. */
class GuardTest {
    private fun res(name: String) = javaClass.classLoader.getResource(name)!!.readText()
    private val engine = Engine(Rules(res("scam-keywords.json"), res("url-rules.json"), res("trusted-domains.json")))
    private val own = "uz.ahdigital.tekshir"

    @Test fun qaysiIlovaKuzatiladi() {
        assertTrue(Guard.watched("org.telegram.messenger", null, own))
        assertTrue(Guard.watched("com.samsung.android.messaging", null, own))
        assertTrue(Guard.watched("com.noma.lum.chat", "msg", own))      // boshqa messenjer, lekin «xabar» turi
        assertFalse(Guard.watched("com.android.vending", "status", own)) // Play Market — kuzatilmaydi
        assertFalse(Guard.watched(own, "msg", own))                     // o'zimizning ogohlantirish — yo'q
    }

    @Test fun matnYigiladi() {
        val s = Guard.messageText("Bank", "Kartangiz bloklandi…", "Kartangiz bloklandi. SMS kodni ayting", listOf("1-xabar"))
        assertEquals("Bank\nKartangiz bloklandi. SMS kodni ayting\n1-xabar", s)
        assertEquals("Ali", Guard.messageText("Ali", null, null))
    }

    @Test fun qisqaMatnTekshirilmaydi() {
        assertFalse(Guard.worthChecking("👍 Rasm"))
        assertTrue(Guard.worthChecking("Salom, qalaysan?"))
    }

    @Test fun firibgarXabarOgohlantiradi() {
        val sms = Guard.messageText("+998 90 123 45 67", "Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com", null)
        assertTrue(Guard.shouldWarn(engine.check(sms)))
        assertFalse(Guard.shouldWarn(engine.check(Guard.messageText("Oyim", "Kechqurun uyga kelasanmi?", null))))
    }

    @Test fun birXabarIkkiMartaEmas() {
        val d = Guard.Dedupe(max = 2)
        assertTrue(d.firstTime("Kartangiz bloklandi"))
        assertFalse(d.firstTime("kartangiz   BLOKLANDI "))
        assertTrue(d.firstTime("b")); assertTrue(d.firstTime("c"))
        assertTrue(d.firstTime("Kartangiz bloklandi"))                  // eskisi unutilgan (max = 2)
    }
}
