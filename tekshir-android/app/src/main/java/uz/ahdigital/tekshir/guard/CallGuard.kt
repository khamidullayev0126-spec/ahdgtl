// 6-bosqich: 📞 qo'ng'iroqda ogohlantirish.
// Android 10+ «Qo'ng'iroqlarni aniqlash va spam» (Call screening) roli. Tekshir qo'ng'iroqni HECH QACHON bloklamaydi —
// faqat raqam haqida shikoyat bo'lsa, ekranda ogohlantirish chiqaradi.
// Kontaktlaringizdagi raqamlar uchun Android bu xizmatni umuman chaqirmaydi.
// MAXFIYLIK: faqat qo'ng'iroq qilgan O'zbekiston raqami serverga tekshirish uchun boradi (u yerda hash bilan solishtiriladi).
package uz.ahdigital.tekshir.guard

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import uz.ahdigital.tekshir.R
import uz.ahdigital.tekshir.data.Online
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.engine.CallCheck
import uz.ahdigital.tekshir.engine.Level
import uz.ahdigital.tekshir.ui.S
import kotlin.concurrent.thread

@RequiresApi(Build.VERSION_CODES.Q)
class CallGuard : CallScreeningService() {
    override fun onScreenCall(details: Call.Details) {
        // 1) Darhol «o'tkazib yubor» — qo'ng'iroqqa hech qachon xalaqit bermaymiz
        respondToCall(details, CallResponse.Builder().build())
        if (details.callDirection != Call.Details.DIRECTION_INCOMING) return
        val store = Store(applicationContext)
        if (!store.callGuard) return
        val digits = CallCheck.normalizeUz(details.handle?.schemeSpecificPart) ?: return
        // 2) Fonda: shikoyatlar sonini so'raymiz va kerak bo'lsa ogohlantiramiz
        val ctx = applicationContext
        thread(name = "tekshir-call") {
            val n = Online.checkNumber(digits, store.lang) ?: return@thread
            if (!CallCheck.shouldWarn(n)) return@thread
            store.noteWarned()
            store.addHistory("suspicious", "📞 " + S.t(store.lang, "c_hist").replace("{n}", "$n"), CallCheck.mask(digits))
            warn(ctx, digits, n, store.lang)
            FamilyAlert.send(ctx, "call", Level.SUSPICIOUS, "")
        }
    }

    companion object {
        private const val CH = "guard_calls"

        fun supported() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

        /** Tekshir «spam aniqlovchi» sifatida tanlanganmi. */
        fun allowed(ctx: Context): Boolean = supported() &&
            ctx.getSystemService(RoleManager::class.java)?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true

        /** Rolni so'rash oynasi (Activity'dan startActivityForResult bilan ochiladi). */
        fun roleIntent(ctx: Context): Intent? = if (!supported()) null
            else ctx.getSystemService(RoleManager::class.java)?.takeIf { it.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) }
                ?.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)

        @SuppressLint("MissingPermission")
        fun warn(ctx: Context, digits: String, complaints: Int, lang: String) {
            if (Build.VERSION.SDK_INT >= 26) ctx.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(NotificationChannel(CH, S.t(lang, "ch_calls"), NotificationManager.IMPORTANCE_HIGH))
            val n = NotificationCompat.Builder(ctx, CH)
                .setSmallIcon(R.drawable.ic_stat_shield)
                .setColor(0xFFFFB020.toInt())
                .setContentTitle(S.t(lang, "c_title").replace("{num}", CallCheck.mask(digits)))
                .setContentText(S.t(lang, "c_text").replace("{n}", "$complaints"))
                .setStyle(NotificationCompat.BigTextStyle().bigText(S.t(lang, "c_text").replace("{n}", "$complaints") + "\n" + S.t(lang, "c_do")))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setTimeoutAfter(5 * 60 * 1000L)
                .setAutoCancel(true)
                .build()
            try { NotificationManagerCompat.from(ctx).notify(digits.hashCode(), n) } catch (_: SecurityException) { }
        }
    }
}
