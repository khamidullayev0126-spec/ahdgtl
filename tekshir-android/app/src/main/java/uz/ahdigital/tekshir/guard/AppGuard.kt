// 3-bosqich: 📲 yangi o'rnatilgan ilovalarni tekshirish.
// Ilova o'rnatilishi bilan (PACKAGE_ADDED) uning ruxsatlari va qayerdan kelgani tekshiriladi.
// Bu signal MessageGuard (bildirishnoma xizmati) ichida tinglanadi — u doim ishlab turadi, alohida fon xizmati kerak emas.
// MAXFIYLIK: ilovalar ro'yxati hech qayerga yuborilmaydi.
package uz.ahdigital.tekshir.guard

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import uz.ahdigital.tekshir.R
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.engine.AppCheck
import uz.ahdigital.tekshir.engine.AppInfo
import uz.ahdigital.tekshir.engine.AppVerdict
import uz.ahdigital.tekshir.engine.Level
import uz.ahdigital.tekshir.engine.Texts
import uz.ahdigital.tekshir.ui.S

object AppGuard {
    private const val CH = "guard_apps"

    /** Telefondagi ilova haqida ma'lumot yig'adi. Topilmasa — null. */
    @Suppress("DEPRECATION")
    fun info(ctx: Context, pkg: String): AppInfo? = try {
        val pm = ctx.packageManager
        val flags = PackageManager.GET_PERMISSIONS or PackageManager.GET_SERVICES or PackageManager.GET_RECEIVERS
        val p: PackageInfo = pm.getPackageInfo(pkg, flags)
        val ai = p.applicationInfo
        var installer: String? = null
        var initiator: String? = null
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                val src = pm.getInstallSourceInfo(pkg)
                installer = src.installingPackageName; initiator = src.initiatingPackageName
            } else installer = pm.getInstallerPackageName(pkg)
        } catch (_: Exception) { }
        // Qaysi ilova orqali kelgan (masalan Telegram). O'rnatuvchi tizim oynasi va do'konlar ko'rsatilmaydi.
        val from = initiator?.takeIf { !it.contains("packageinstaller") && it !in AppCheck.TRUSTED_STORES }?.let { label(ctx, it) }
        AppInfo(
            pkg = pkg,
            label = ai?.let { pm.getApplicationLabel(it).toString() } ?: pkg,
            installer = installer,
            from = from,
            system = ai != null && (ai.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0,
            permissions = p.requestedPermissions?.toSet() ?: emptySet(),
            accessibility = p.services?.any { it.permission == "android.permission.BIND_ACCESSIBILITY_SERVICE" } == true,
            deviceAdmin = p.receivers?.any { it.permission == "android.permission.BIND_DEVICE_ADMIN" } == true,
            notifListener = p.services?.any { it.permission == "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" } == true
        )
    } catch (_: Exception) { null }

    private fun label(ctx: Context, pkg: String) = try {
        ctx.packageManager.getApplicationLabel(ctx.packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) { null }

    /** Hamma o'rnatilgan ilovalarni tekshiradi (fon oqimida chaqiring). Xavfli/shubhalilar — birinchi. */
    @Suppress("DEPRECATION")
    fun scanAll(ctx: Context): Pair<Int, List<Pair<AppInfo, AppVerdict>>> {
        val pkgs = ctx.packageManager.getInstalledApplications(0)
            .filter { (it.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) == 0 }
            .map { it.packageName }
        val risky = pkgs.mapNotNull { info(ctx, it) }
            .map { it to AppCheck.analyze(it, ctx.packageName) }
            .filter { it.second.level != Level.SAFE }
            .sortedByDescending { it.second.score }
        return pkgs.size to risky
    }

    /** Sabablar matni (foydalanuvchi tilida). */
    fun reasonText(lang: String, code: String, vars: Map<String, String>): String {
        var s = S.t(lang, code)
        if (code == "app_unknown_src" && vars["from"].isNullOrEmpty()) s = S.t(lang, "app_unknown_src0")
        for ((k, v) in vars) s = s.replace("{$k}", v)
        return s
    }

    /** Tizim sahifasi: shu ilovani o'chirish (Uninstall) yoki ruxsatlarini olib tashlash. */
    fun openAppPage(ctx: Context, pkg: String) {
        val i = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { ctx.startActivity(i) } catch (_: Exception) { }
    }

    /** Ilova o'rnatilganda ishlaydigan qabul qilgich. */
    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            if (i.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return     // yangilanish — yangi ilova emas
            val pkg = i.data?.schemeSpecificPart ?: return
            val store = Store(c.applicationContext)
            if (!store.appGuard) return
            val a = info(c, pkg) ?: return
            val v = AppCheck.analyze(a, c.packageName)
            if (v.level == Level.SAFE) return
            val lv = v.level.name.lowercase()
            store.addHistory(lv, "📲 " + Texts.t(store.lang, "level_$lv").replace(Regex("^[^\\p{L}]+"), ""), a.label)
            store.noteWarned()
            warn(c, a, v, store.lang)
        }
    }
    private var registered = false

    fun start(ctx: Context) {
        if (registered) return
        val f = IntentFilter(Intent.ACTION_PACKAGE_ADDED).apply { addDataScheme("package") }
        ContextCompat.registerReceiver(ctx, receiver, f, ContextCompat.RECEIVER_EXPORTED)
        registered = true
    }

    fun stop(ctx: Context) {
        if (!registered) return
        try { ctx.unregisterReceiver(receiver) } catch (_: Exception) { }
        registered = false
    }

    /** Ogohlantirish. Bosilsa — shu ilovaning tizim sahifasi ochiladi (u yerda «O'chirish»). */
    @SuppressLint("MissingPermission")
    fun warn(ctx: Context, a: AppInfo, v: AppVerdict, lang: String) {
        if (Build.VERSION.SDK_INT >= 26) ctx.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(NotificationChannel(CH, S.t(lang, "ch_apps"), NotificationManager.IMPORTANCE_HIGH))
        val danger = v.level == Level.DANGER
        val open = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${a.pkg}"))
        val id = a.pkg.hashCode()
        val pi = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val reasons = v.reasons.joinToString("\n") { "• " + reasonText(lang, it.code, it.vars) }
        val body = reasons + "\n" + S.t(lang, if (danger) "aw_do_danger" else "aw_do_susp")
        val n = NotificationCompat.Builder(ctx, CH)
            .setSmallIcon(R.drawable.ic_stat_shield)
            .setColor(if (danger) 0xFFFF5A5F.toInt() else 0xFFFFB020.toInt())
            .setContentTitle(S.t(lang, if (danger) "aw_danger" else "aw_susp").replace("{name}", a.label))
            .setContentText(v.reasons.firstOrNull()?.let { reasonText(lang, it.code, it.vars) } ?: "")
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        try { NotificationManagerCompat.from(ctx).notify(id, n) } catch (_: SecurityException) { }
    }
}
