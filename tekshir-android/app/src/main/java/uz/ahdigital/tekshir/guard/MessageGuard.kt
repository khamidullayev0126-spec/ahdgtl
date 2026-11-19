// 2-bosqich: 🔔 Xabarlarni avtomatik kuzatish.
// Telefonga SMS, Telegram, WhatsApp… xabari kelganda uning bildirishnomasini o'qiydi va TELEFONNING O'ZIDA tekshiradi.
// MAXFIYLIK: xabar matni hech qayerga yuborilmaydi (internetga ham, serverga ham). Faqat xavfli bo'lsa — ogohlantirish.
package uz.ahdigital.tekshir.guard

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import uz.ahdigital.tekshir.MainActivity
import uz.ahdigital.tekshir.R
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.engine.Guard
import uz.ahdigital.tekshir.engine.Level
import uz.ahdigital.tekshir.engine.Texts
import uz.ahdigital.tekshir.ui.S

class MessageGuard : NotificationListenerService() {
    private val store by lazy { Store(applicationContext) }
    private val dedupe = Guard.Dedupe()

    // 3-bosqich: xizmat ishlab turganda yangi o'rnatilgan ilovalarni ham kuzatamiz
    override fun onListenerConnected() { AppGuard.start(applicationContext) }
    override fun onListenerDisconnected() { AppGuard.stop(applicationContext) }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try { handle(sbn) } catch (_: Exception) { /* bitta xabardagi xato butun himoyani to'xtatmasin */ }
    }

    private fun handle(sbn: StatusBarNotification) {
        if (!store.notifGuard) return
        val n = sbn.notification ?: return
        if (sbn.isOngoing || (n.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
        if (!Guard.watched(sbn.packageName, n.category, packageName)) return

        val e = n.extras
        val lines = mutableListOf<String>()
        e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { lines += it.toString() }
        val text = Guard.messageText(
            e.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
            e.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
            e.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
            lines
        )
        if (!Guard.worthChecking(text) || !dedupe.firstTime(text)) return

        val r = store.engine.check(text)                       // internetsiz, telefonning o'zida
        if (!Guard.shouldWarn(r)) return

        val lang = store.lang
        val app = appName(sbn.packageName)
        val lv = r.level.name.lowercase()
        store.addHistory(lv, "🔔 $app · " + Texts.t(lang, "level_$lv").replace(Regex("^[^\\p{L}]+"), ""), text)
        store.noteWarned()
        val reason = r.reasons.firstOrNull { it.points > 0 }?.let { Texts.t(lang, it.code, it.vars) } ?: ""
        warn(this, r.level, app, reason, text, lang)
    }

    private fun appName(pkg: String) = try {
        packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) { pkg }

    companion object {
        private const val CH_DANGER = "guard_danger"
        private const val CH_SUSP = "guard_suspicious"

        /** Ruxsat berilganmi (Sozlamalar → Bildirishnomalarga kirish → Tekshir). */
        fun allowed(ctx: Context) = NotificationManagerCompat.getEnabledListenerPackages(ctx).contains(ctx.packageName)

        /** Ruxsat sahifasini ochadi. */
        fun openSettings(ctx: Context) {
            val i = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { ctx.startActivity(i) } catch (_: Exception) { ctx.startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        }

        private fun channels(ctx: Context, lang: String) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = ctx.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel(CH_DANGER, S.t(lang, "ch_danger"), NotificationManager.IMPORTANCE_HIGH))
            nm.createNotificationChannel(NotificationChannel(CH_SUSP, S.t(lang, "ch_susp"), NotificationManager.IMPORTANCE_DEFAULT))
        }

        /** Ogohlantirish. Bosilsa — ilova ochiladi va xabar «Tekshirish» oynasida to'liq ko'rsatiladi. */
        @SuppressLint("MissingPermission")
        fun warn(ctx: Context, level: Level, app: String, reason: String, text: String, lang: String) {
            channels(ctx, lang)
            val open = Intent(ctx, MainActivity::class.java).apply {
                action = Intent.ACTION_SEND; type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            val id = text.hashCode()
            val pi = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val danger = level == Level.DANGER
            val title = S.t(lang, if (danger) "w_danger" else "w_susp").replace("{app}", app)
            val body = listOf(reason, S.t(lang, if (danger) "w_do_danger" else "w_do_susp")).filter { it.isNotEmpty() }.joinToString("\n")
            val n = NotificationCompat.Builder(ctx, if (danger) CH_DANGER else CH_SUSP)
                .setSmallIcon(R.drawable.ic_stat_shield)
                .setColor(if (danger) 0xFFFF5A5F.toInt() else 0xFFFFB020.toInt())
                .setContentTitle(title)
                .setContentText(reason.ifEmpty { body })
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(if (danger) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build()
            try { NotificationManagerCompat.from(ctx).notify(id, n) } catch (_: SecurityException) { /* bildirishnoma ruxsati yo'q */ }
        }
    }
}
