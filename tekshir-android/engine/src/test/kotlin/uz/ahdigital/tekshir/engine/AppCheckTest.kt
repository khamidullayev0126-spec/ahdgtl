package uz.ahdigital.tekshir.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** 3-bosqich: o'rnatilgan ilovani tekshirish. */
class AppCheckTest {
    private val pkgi = "com.google.android.packageinstaller"   // APK qo'lda o'rnatilganda

    @Test fun playMarketdanXavotirYoq() {
        // WhatsApp SMS ruxsatini so'raydi, lekin Play Market'dan — ogohlantirmaymiz
        val wa = AppInfo("com.whatsapp", "WhatsApp", "com.android.vending", permissions = setOf("android.permission.RECEIVE_SMS"))
        assertEquals(Level.SAFE, AppCheck.analyze(wa).level)
        assertEquals(Level.SAFE, AppCheck.analyze(AppInfo("com.android.settings", "Settings", null, system = true)).level)
    }

    @Test fun soxtaClickXavfli() {
        val fake = AppInfo("com.x.y", "Click Up", pkgi, from = "Telegram",
            permissions = setOf("android.permission.RECEIVE_SMS", "android.permission.READ_SMS"), accessibility = true)
        val v = AppCheck.analyze(fake)
        assertEquals(Level.DANGER, v.level)
        assertEquals(100, v.score)
        assertEquals("app_brand", v.reasons.first().code)
        assertTrue(v.reasons.any { it.code == "app_unknown_src" && it.vars["from"] == "Telegram" })
    }

    @Test fun rasmlarApkXavfli() {
        // «Rasmlar» nomli APK + SMS o'qiydi — tipik firibgar troyan
        val v = AppCheck.analyze(AppInfo("com.a.b", "Rasmlar", pkgi, permissions = setOf("android.permission.RECEIVE_SMS")))
        assertEquals(Level.DANGER, v.level)
    }

    @Test fun oddiyApkFaqatShubhali() {
        // Play Market'dan emas, lekin xavfli ruxsat yo'q — faqat sariq ogohlantirish
        val v = AppCheck.analyze(AppInfo("org.game", "Mening o'yinim", pkgi))
        assertEquals(Level.SUSPICIOUS, v.level)
        assertEquals(listOf("app_unknown_src"), v.reasons.map { it.code })
    }

    @Test fun ozimizTekshirilmaydi() {
        assertEquals(Level.SAFE, AppCheck.analyze(AppInfo("uz.ahdigital.tekshir", "Tekshir", null)).level)
    }
}
