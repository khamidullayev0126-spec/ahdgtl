// 5-bosqich: 🩺 telefon xavfsizlik bali. Hammasi telefonda hisoblanadi, hech qayerga yuborilmaydi.
package uz.ahdigital.tekshir.guard

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.engine.AppCheck
import uz.ahdigital.tekshir.engine.SecurityScore
import uz.ahdigital.tekshir.engine.SecurityScore.Check

object Score {
    /** Telefonni tekshiradi (fon oqimida chaqiring — ilovalar ro'yxatini ham ko'radi). */
    fun checks(ctx: Context, store: Store): List<Check> {
        val today = System.currentTimeMillis() / 86_400_000L
        val patchAge = SecurityScore.patchAgeDays(Build.VERSION.SECURITY_PATCH, today)
        val adb = try { Settings.Global.getInt(ctx.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1 } catch (_: Exception) { false }
        val risky = AppGuard.scanAll(ctx).second
        return listOf(
            Check("s_lock", ctx.getSystemService(KeyguardManager::class.java)?.isDeviceSecure, 20),
            Check("s_patch", patchAge?.let { it <= 120 }, 15),
            Check("s_android", Build.VERSION.SDK_INT >= 31, 10),
            Check("s_adb", !adb, 10),
            Check("s_msg", MessageGuard.allowed(ctx) && store.notifGuard, 15),
            Check("s_apps", risky.none { it.second.level == uz.ahdigital.tekshir.engine.Level.DANGER }, 15),
            Check("s_access", !badAccessibility(ctx), 10),
            Check("s_calls", if (CallGuard.supported()) CallGuard.allowed(ctx) else null, 5)
        )
    }

    /** Play Market'dan bo'lmagan ilovaga «Maxsus imkoniyatlar» berilganmi (firibgar ilovalarning asosiy quroli). */
    private fun badAccessibility(ctx: Context): Boolean = try {
        val list = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES).orEmpty()
        list.split(':').mapNotNull { it.substringBefore('/').takeIf { p -> p.isNotBlank() } }.distinct().any { pkg ->
            val a = AppGuard.info(ctx, pkg)
            a != null && !a.system && !AppCheck.fromStore(a) && pkg != ctx.packageName
        }
    } catch (_: Exception) { false }

    /** «Tuzatish» tugmasi qayerga olib boradi. */
    fun fixIntent(id: String): String? = when (id) {
        "s_lock" -> Settings.ACTION_SECURITY_SETTINGS
        "s_patch", "s_android" -> Settings.ACTION_DEVICE_INFO_SETTINGS
        "s_adb" -> Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS
        "s_access" -> Settings.ACTION_ACCESSIBILITY_SETTINGS
        else -> null                          // s_msg, s_apps, s_calls — ilovaning o'zida
    }
}
