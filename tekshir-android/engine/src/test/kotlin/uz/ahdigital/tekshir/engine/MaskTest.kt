package uz.ahdigital.tekshir.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** app/data/Store.kt dagi mask() bilan bir xil qoida (Android'siz sinash uchun nusxa). */
class MaskTest {
    private fun mask(s: String): String = s.replace(Regex("\\d[\\d\\s-]{6,}\\d")) { m -> m.value.replace(Regex("\\d(?=[\\d\\s-]{2})"), "•") }
        .replace(Regex("\\s+"), " ").trim().take(80)

    @Test fun raqamlarYashiriladi() {
        val m = mask("Kartangiz 8600 1234 5678 9012 bloklandi, tel +998 90 123 45 67")
        assertTrue("8600" !in m && "1234" !in m && "123 45" !in m, m)
        assertTrue(m.startsWith("Kartangiz ••••"), m)
        assertEquals("Narxi 25 000 so'm", mask("Narxi 25 000 so'm"))     // qisqa sonlar o'zgarmaydi
    }
}
