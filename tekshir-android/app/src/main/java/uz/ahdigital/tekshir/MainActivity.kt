// Tekshir — asosiy oyna. Android Studio yaratgan MainActivity.kt o'rniga.
// «Ulashish → Tekshir»: boshqa ilovadan matn kelsa (ACTION_SEND), uni darhol tekshiradi.
// 9-bosqich: rasm (skrinshot) ulashilsa — rasmdagi matn va QR telefonda o'qilib tekshiriladi.
package uz.ahdigital.tekshir

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.ui.TekshirApp
import uz.ahdigital.tekshir.ui.theme.TekshirTheme

class MainActivity : ComponentActivity() {
    private var shared by mutableStateOf<String?>(null)
    private var sharedFile by mutableStateOf<Uri?>(null)    // 4-bosqich: tekshirish uchun kelgan APK fayl
    private var sharedImage by mutableStateOf<Uri?>(null)   // 9-bosqich: tekshirish uchun kelgan skrinshot
    private var resumed by mutableStateOf(0)      // Sozlamalardan qaytganda ruxsat holatini qayta tekshirish uchun

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = Store(applicationContext)
        if (savedInstanceState == null) readShare(intent)
        setContent {
            TekshirTheme {
                TekshirApp(store, shared, sharedFile, sharedImage, resumed, { shared = null }, { sharedFile = null }, { sharedImage = null })
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumed++
    }

    // Ilova ochiq turganida yana ulashilsa (yoki ogohlantirish bosilsa)
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        readShare(intent)
    }

    @Suppress("DEPRECATION")
    private fun readShare(i: Intent?) {
        if (i == null) return
        // APK fayl: «Tekshir bilan ochish» (VIEW) yoki «Ulashish → Tekshir» (SEND + fayl)
        if (i.action == Intent.ACTION_VIEW && i.data != null) { sharedFile = i.data; return }
        if (i.action == Intent.ACTION_SEND && i.type?.startsWith("text/") != true) {
            val u: Uri? = if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                else i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
            if (u != null) { if (i.type?.startsWith("image/") == true) sharedImage = u else sharedFile = u }
            return
        }
        if (i.action != Intent.ACTION_SEND || i.type?.startsWith("text/") != true) return
        val parts = listOfNotNull(i.getStringExtra(Intent.EXTRA_SUBJECT), i.getStringExtra(Intent.EXTRA_TEXT)).filter { it.isNotBlank() }.distinct()
        if (parts.isNotEmpty()) shared = parts.joinToString("\n")
    }
}
