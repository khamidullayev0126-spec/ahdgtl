package uz.ahdigital.tekshir.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ExtrasTest {
    @Test fun xavfsizlikBali() {
        val c = listOf(SecurityScore.Check("lock", true, 20), SecurityScore.Check("patch", false, 15),
            SecurityScore.Check("adb", true, 10), SecurityScore.Check("x", null, 50))
        assertEquals(67, SecurityScore.score(c))                 // 30 / 45, noma'lum hisobga olinmaydi
        assertEquals(Level.SUSPICIOUS, SecurityScore.level(67))
        assertEquals(Level.SAFE, SecurityScore.level(85))
        assertEquals(Level.DANGER, SecurityScore.level(30))
        assertEquals(0, SecurityScore.score(emptyList()))
    }

    @Test fun yangilanishYoshi() {
        val today = java.time.LocalDate.parse("2026-11-19").toEpochDay()
        assertEquals(49L, SecurityScore.patchAgeDays("2026-10-01", today))
        assertNull(SecurityScore.patchAgeDays("", today))
        assertNull(SecurityScore.patchAgeDays("noma'lum", today))
    }

    @Test fun qongiroqRaqami() {
        assertEquals("998901234567", CallCheck.normalizeUz("+998 90 123-45-67"))
        assertEquals("998901234567", CallCheck.normalizeUz("901234567"))
        assertNull(CallCheck.normalizeUz("+7 916 123 45 67"))    // chet el — tekshirilmaydi
        assertNull(CallCheck.normalizeUz(null))
        assertEquals("+998 90 *** ** 67", CallCheck.mask("998901234567"))
        assertTrue(CallCheck.shouldWarn(1)); assertFalse(CallCheck.shouldWarn(0))
    }

    @Test fun oila() {
        assertTrue(Family.validCode(" 123456 ")); assertFalse(Family.validCode("12345a"))
        assertTrue(Family.shouldAlert("message", Level.DANGER))
        assertFalse(Family.shouldAlert("message", Level.SUSPICIOUS))
        assertTrue(Family.shouldAlert("call", Level.SUSPICIOUS))
        assertFalse(Family.shouldAlert("hack", Level.DANGER))
    }
}
