// 4-bosqich: 📁 APK faylni O'RNATISHDAN OLDIN tekshirish.
// Fayl Telegram'dan «Tekshir bilan ochish», «Ulashish → Tekshir» yoki ilova ichidagi tugma orqali keladi.
// Fayl ichidan nomi, paketi va ruxsatlari o'qiladi (telefonda). Internetga faqat SHA-256 izi yuboriladi —
// faylning o'zi ham, nomi ham hech qayerga yuklanmaydi.
package uz.ahdigital.tekshir.guard

import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.OpenableColumns
import uz.ahdigital.tekshir.engine.AppInfo
import uz.ahdigital.tekshir.engine.AppVerdict
import uz.ahdigital.tekshir.engine.ApkCheck
import uz.ahdigital.tekshir.engine.Engine
import java.io.File
import java.security.MessageDigest

/** APK tekshiruvi natijasi. info == null — fayl ichini o'qib bo'lmadi (buzilgan yoki APK emas). */
data class ApkReport(val name: String, val size: Long, val sha256: String, val info: AppInfo?, val verdict: AppVerdict)

object ApkScan {
    private const val MAX = 300L * 1024 * 1024     // 300 MB dan katta fayl tekshirilmaydi

    /** Faylni o'qib tekshiradi. Uzoq ishlaydi — faqat fon oqimida (Dispatchers.IO) chaqiring. */
    @Suppress("DEPRECATION")
    fun check(ctx: Context, uri: Uri, engine: Engine): ApkReport? {
        val name = displayName(ctx, uri) ?: "file.apk"
        val tmp = File(ctx.cacheDir, "tekshir-check.apk")
        try {
            val md = MessageDigest.getInstance("SHA-256")
            var size = 0L
            ctx.contentResolver.openInputStream(uri)?.use { input ->
                tmp.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buf); if (n < 0) break
                        size += n; if (size > MAX) return null
                        md.update(buf, 0, n); out.write(buf, 0, n)
                    }
                }
            } ?: return null
            val sha = md.digest().joinToString("") { "%02x".format(it) }

            val pm = ctx.packageManager
            val flags = PackageManager.GET_PERMISSIONS or PackageManager.GET_SERVICES or PackageManager.GET_RECEIVERS
            val info = pm.getPackageArchiveInfo(tmp.absolutePath, flags)?.let { p ->
                val ai = p.applicationInfo
                ai?.sourceDir = tmp.absolutePath; ai?.publicSourceDir = tmp.absolutePath   // nomini o'qish uchun kerak
                AppInfo(
                    pkg = p.packageName,
                    label = ai?.let { runCatching { pm.getApplicationLabel(it).toString() }.getOrNull() } ?: p.packageName,
                    installer = null,
                    permissions = p.requestedPermissions?.toSet() ?: emptySet(),
                    accessibility = p.services?.any { it.permission == "android.permission.BIND_ACCESSIBILITY_SERVICE" } == true,
                    deviceAdmin = p.receivers?.any { it.permission == "android.permission.BIND_DEVICE_ADMIN" } == true,
                    notifListener = p.services?.any { it.permission == "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" } == true
                )
            }
            val mime = runCatching { ctx.contentResolver.getType(uri) }.getOrNull() ?: ""
            return ApkReport(name, size, sha, info, ApkCheck.verdict(info, engine.analyzeFileName(name, mime)))
        } catch (_: Exception) {
            return null
        } finally {
            tmp.delete()                                  // nusxa darhol o'chiriladi
        }
    }

    private fun displayName(ctx: Context, uri: Uri): String? = try {
        ctx.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        } ?: uri.lastPathSegment
    } catch (_: Exception) { uri.lastPathSegment }
}
