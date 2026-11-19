// 7-bosqich: 👨‍👩‍👧 oila himoyasi — xavf aniqlansa yaqiningizga Telegram bot orqali xabar.
// Botga faqat xavf TURI (xabar/ilova/APK/qo'ng'iroq) va manba nomi («Telegram») boradi. Xabar matni, raqamlar — yo'q.
package uz.ahdigital.tekshir.guard

import android.content.Context
import uz.ahdigital.tekshir.data.Online
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.engine.Family
import uz.ahdigital.tekshir.engine.Level
import kotlin.concurrent.thread

object FamilyAlert {
    /** Ulangan bo'lsa va holat jiddiy bo'lsa — fonda yuboradi. Asosiy oqimni to'xtatmaydi. */
    fun send(ctx: Context, kind: String, level: Level, source: String) {
        val store = Store(ctx.applicationContext)
        val token = store.familyToken ?: return
        if (!Family.shouldAlert(kind, level)) return
        thread(name = "tekshir-family") {
            try { Online.familyAlert(token, kind, source) } catch (_: Exception) { }
        }
    }
}
