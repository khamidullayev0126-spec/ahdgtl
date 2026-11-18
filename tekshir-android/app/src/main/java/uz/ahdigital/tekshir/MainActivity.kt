// Tekshir — asosiy oyna. Android Studio yaratgan MainActivity.kt o'rniga.
// «Ulashish → Tekshir»: boshqa ilovadan matn kelsa (ACTION_SEND), uni darhol tekshiradi.
package uz.ahdigital.tekshir

import android.content.Intent
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = Store(applicationContext)
        if (savedInstanceState == null) readShare(intent)
        setContent {
            TekshirTheme {
                TekshirApp(store, shared) { shared = null }
            }
        }
    }

    // Ilova ochiq turganida yana ulashilsa
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        readShare(intent)
    }

    private fun readShare(i: Intent?) {
        if (i?.action != Intent.ACTION_SEND || i.type?.startsWith("text/") != true) return
        val parts = listOfNotNull(i.getStringExtra(Intent.EXTRA_SUBJECT), i.getStringExtra(Intent.EXTRA_TEXT)).filter { it.isNotBlank() }.distinct()
        if (parts.isNotEmpty()) shared = parts.joinToString("\n")
    }
}
