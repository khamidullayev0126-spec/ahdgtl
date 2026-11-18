// Tekshir mavzusi: doim to'q (dark). Android Studio yaratgan Theme.kt o'rniga.
package uz.ahdigital.tekshir.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val Scheme = darkColorScheme(
    primary = Safe, onPrimary = Bg,
    secondary = Accent, onSecondary = Bg,
    background = Bg, onBackground = TextMain,
    surface = Surface, onSurface = TextMain,
    surfaceVariant = CardBg, onSurfaceVariant = Muted,
    outline = Line, error = Danger
)

@Composable
fun TekshirTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, typography = Typography, content = content)
}
