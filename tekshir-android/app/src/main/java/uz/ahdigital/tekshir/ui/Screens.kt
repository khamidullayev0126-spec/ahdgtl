// Tekshir — ilova ekranlari (Jetpack Compose).
// 1-bosqich: Himoya (bosh ekran), Tekshirish, Tarix, Maslahat, Sozlama.
// 2-bosqich: 🔔 xabarlarni avtomatik kuzatish (Sozlama → yoqish).
// 3-bosqich: 📲 ilovalar tekshiruvi (bosh ekran → «Yangi ilovalar»).
// 4-bosqich: 📁 APK faylni o'rnatishdan oldin tekshirish (Tekshirish oynasi, «Tekshir bilan ochish»).
// 5-bosqich: 🩺 xavfsizlik bali · 6-bosqich: 📞 qo'ng'iroqlar · 7-bosqich: 👨‍👩‍👧 oila himoyasi (Sozlama).
// 9-bosqich: 📸 skrinshot · 🔳 QR kod · 🆘 Aldandim · ✈️ Telegram himoyasi · 🎓 Firibgarni tani (ui/Help.kt).
@file:OptIn(ExperimentalMaterial3Api::class)

package uz.ahdigital.tekshir.ui

import android.Manifest
import android.net.Uri
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import androidx.core.content.ContextCompat
import kotlinx.coroutines.withContext
import uz.ahdigital.tekshir.data.Online
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.data.Tip
import uz.ahdigital.tekshir.engine.Level
import uz.ahdigital.tekshir.engine.Result
import uz.ahdigital.tekshir.engine.Texts
import uz.ahdigital.tekshir.engine.AppInfo
import uz.ahdigital.tekshir.engine.AppVerdict
import uz.ahdigital.tekshir.guard.ApkReport
import uz.ahdigital.tekshir.guard.ApkScan
import uz.ahdigital.tekshir.guard.AppGuard
import uz.ahdigital.tekshir.guard.CallGuard
import uz.ahdigital.tekshir.guard.FamilyAlert
import uz.ahdigital.tekshir.guard.Score
import uz.ahdigital.tekshir.engine.SecurityScore
import uz.ahdigital.tekshir.engine.QrCheck
import uz.ahdigital.tekshir.engine.QrInfo
import uz.ahdigital.tekshir.engine.Scan
import uz.ahdigital.tekshir.guard.ImageScan
import android.content.Intent
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import uz.ahdigital.tekshir.guard.MessageGuard
import uz.ahdigital.tekshir.ui.theme.Accent
import uz.ahdigital.tekshir.ui.theme.Bg
import uz.ahdigital.tekshir.ui.theme.CardBg
import uz.ahdigital.tekshir.ui.theme.Danger
import uz.ahdigital.tekshir.ui.theme.DangerBg
import uz.ahdigital.tekshir.ui.theme.Line
import uz.ahdigital.tekshir.ui.theme.Muted
import uz.ahdigital.tekshir.ui.theme.Safe
import uz.ahdigital.tekshir.ui.theme.SafeBg
import uz.ahdigital.tekshir.ui.theme.Surface
import uz.ahdigital.tekshir.ui.theme.TextMain
import uz.ahdigital.tekshir.ui.theme.Warn
import uz.ahdigital.tekshir.ui.theme.WarnBg
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class Tab(val icon: String, val key: String) {
    HOME("🛡", "tab_home"), CHECK("🔍", "tab_check"), HIST("🕘", "tab_hist"), TIPS("💡", "tab_tips"), SET("⚙️", "tab_set")
}

internal fun levelColor(l: String) = when (l) { "danger" -> Danger; "suspicious" -> Warn; else -> Safe }
internal fun levelBg(l: String) = when (l) { "danger" -> DangerBg; "suspicious" -> WarnBg; else -> SafeBg }
internal fun rank(l: String) = when (l) { "danger" -> 2; "suspicious" -> 1; else -> 0 }

/** Butun ilova. shared — boshqa ilovadan «Ulashish → Tekshir» bilan kelgan matn. */
@Composable
fun TekshirApp(store: Store, shared: String?, sharedFile: Uri?, sharedImage: Uri?, resumed: Int,
               onSharedUsed: () -> Unit, onFileUsed: () -> Unit, onImageUsed: () -> Unit) {
    var lang by remember { mutableStateOf(store.lang) }
    var tab by rememberSaveable { mutableStateOf(Tab.HOME) }
    var input by rememberSaveable { mutableStateOf("") }
    var result by remember { mutableStateOf<Result?>(null) }
    var online by remember { mutableStateOf<Online.Answer?>(null) }
    var onlineState by remember { mutableStateOf(0) }          // 0 — kerak emas, 1 — kutilmoqda, 2 — tayyor, 3 — internet yo'q
    var error by remember { mutableStateOf<String?>(null) }
    var histTick by remember { mutableStateOf(0) }
    var appsOpen by rememberSaveable { mutableStateOf(false) }   // 📲 Ilovalar tekshiruvi oynasi
    var scoreOpen by rememberSaveable { mutableStateOf(false) }  // 🩺 Xavfsizlik bali oynasi
    // 4-bosqich: APK fayl tekshiruvi
    var apk by remember { mutableStateOf<ApkReport?>(null) }
    var apkState by remember { mutableStateOf(0) }       // 0 — yo'q, 1 — o'qilmoqda, 2 — tayyor, 3 — o'qib bo'lmadi
    var apkOnline by remember { mutableStateOf<Online.Answer?>(null) }
    var apkOnlineState by remember { mutableStateOf(0) }
    // 9-bosqich: yordam sahifalari («rescue», «tg», «quiz»), skrinshot va QR
    var page by rememberSaveable { mutableStateOf("") }
    var imgState by remember { mutableStateOf(0) }      // 0 — yo'q, 1 — o'qilmoqda, 3 — ochilmadi, 4 — matn topilmadi
    var qrInfo by remember { mutableStateOf<QrInfo?>(null) }
    var qrFail by remember { mutableStateOf(false) }
    val ctx = LocalContext.current              // tarix yangilanganda ekranni qayta chizish uchun
    val scope = rememberCoroutineScope()

    fun runCheck() {
        val text = input.trim()
        if (text.isEmpty()) { error = S.t(lang, "empty"); return }
        error = null
        val r = Scan.check(store.engine, text)                    // 1) telefonda, internetsiz — darhol (matndagi «….apk» ham)
        result = r; online = null
        val lv = r.level.name.lowercase()
        store.addHistory(lv, Texts.t(lang, "level_$lv"), text); histTick++
        // 2) havola bo'lsa — internet orqali qo'shimcha tekshiruv (faqat havolalar yuboriladi)
        if (r.level != Level.DANGER && store.engine.needsOnline(text)) {
            onlineState = 1
            val urls = store.engine.extractUrls(text)
            scope.launch {
                val a = withContext(Dispatchers.IO) { Online.checkLinks(urls, lang) }
                online = a; onlineState = if (a != null) 2 else 3
            }
        } else onlineState = 0
    }

    fun runApk(uri: Uri) {
        tab = Tab.CHECK; appsOpen = false; scoreOpen = false
        apk = null; apkState = 1; apkOnline = null; apkOnlineState = 0
        scope.launch {
            val rep = withContext(Dispatchers.IO) { ApkScan.check(ctx, uri, store.engine) }
            apk = rep; apkState = if (rep != null) 2 else 3
            if (rep != null) {
                val lv = rep.verdict.level.name.lowercase()
                FamilyAlert.send(ctx, "apk", rep.verdict.level, "")
                store.addHistory(lv, "📁 " + Texts.t(lang, "level_$lv").replace(Regex("^[^\\p{L}]+"), ""), rep.name); histTick++
                apkOnlineState = 1
                val a = withContext(Dispatchers.IO) { Online.checkFile(rep.size, rep.sha256, lang) }
                apkOnline = a; apkOnlineState = if (a != null) 2 else 3
            }
        }
    }

    // 📸 Skrinshot: rasmdagi matn va QR kodlar telefonda o'qiladi, keyin odatdagidek tekshiriladi
    fun runImage(uri: Uri) {
        tab = Tab.CHECK; appsOpen = false; scoreOpen = false; page = ""
        imgState = 1; qrInfo = null; qrFail = false
        scope.launch {
            val out = withContext(Dispatchers.IO) { ImageScan.read(ctx, uri) }
            if (out == null) { imgState = 3; return@launch }
            val qrs = out.qr.map(QrCheck::parse)
            qrInfo = qrs.firstOrNull()
            val parts = (listOf(out.text) + qrs.map(QrCheck::textToCheck)).filter { it.isNotBlank() }.distinct()
            if (parts.isEmpty() && qrInfo == null) { imgState = 4; result = null; return@launch }
            imgState = 0
            if (parts.isNotEmpty()) { input = parts.joinToString("\n"); runCheck() } else { result = null; onlineState = 0 }
        }
    }

    // 🔳 QR kod (kamera): ichidagi havola yoki matn tekshiriladi, Wi-Fi/telefon bo'lsa — eslatma
    fun runQr(raw: String) {
        val q = QrCheck.parse(raw)
        qrInfo = q; qrFail = false; imgState = 0
        val t = QrCheck.textToCheck(q)
        if (t.isNotBlank()) { input = t; runCheck() } else { result = null; online = null; onlineState = 0 }
    }

    LaunchedEffect(sharedFile) { if (sharedFile != null) { runApk(sharedFile); onFileUsed() } }
    LaunchedEffect(sharedImage) { if (sharedImage != null) { runImage(sharedImage); onImageUsed() } }

    // Ilovaga qaytganda (masalan avtomatik ogohlantirishdan keyin) tarix va hisoblar yangilansin
    LaunchedEffect(resumed) { histTick++ }

    LaunchedEffect(shared) {
        if (!shared.isNullOrBlank()) { input = shared; tab = Tab.CHECK; runCheck(); onSharedUsed() }
    }

    Scaffold(
        containerColor = Bg,
        bottomBar = {
            NavigationBar(containerColor = Surface) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t && !appsOpen && !scoreOpen && page.isEmpty(),
                        onClick = { tab = t; appsOpen = false; scoreOpen = false; page = "" },
                        icon = { Text(t.icon, fontSize = 20.sp) },
                        label = { Text(S.t(lang, t.key), fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(selectedTextColor = Safe, unselectedTextColor = Muted, indicatorColor = SafeBg)
                    )
                }
            }
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            if (page.isNotEmpty()) {
                BackHandler { page = ""; histTick++ }
                when (page) {
                    "rescue" -> RescueScreen(lang) { page = "" }
                    "tg" -> TgScreen(store, lang) { page = ""; histTick++ }
                    else -> QuizScreen(store, lang) { page = ""; histTick++ }
                }
            } else if (appsOpen) {
                BackHandler { appsOpen = false }
                AppsScreen(store, lang, resumed) { appsOpen = false }
            } else if (scoreOpen) {
                BackHandler { scoreOpen = false }
                ScoreScreen(store, lang, resumed, { scoreOpen = false }, { scoreOpen = false; appsOpen = true }, { scoreOpen = false; tab = Tab.SET })
            } else when (tab) {
                Tab.HOME -> HomeScreen(store, lang, histTick, resumed, { tab = Tab.CHECK }, { tab = Tab.SET }, { appsOpen = true }, { scoreOpen = true }) { page = it }
                Tab.CHECK -> CheckScreen(lang, input, { input = it }, { qrInfo = null; imgState = 0; runCheck() }, result, online, onlineState, error,
                    scanSection = {
                        ScanSection(lang, imgState, qrInfo, qrFail, ::runImage) {
                            ImageScan.scanQr(ctx, { raw -> if (raw != null) runQr(raw) }) { qrFail = true }
                        }
                    }) {
                    ApkSection(lang, apk, apkState, apkOnline, apkOnlineState, ::runApk)
                }
                Tab.HIST -> HistoryScreen(store, lang, histTick) { store.clearHistory(); histTick++ }
                Tab.TIPS -> TipsScreen(store, lang)
                Tab.SET -> SettingsScreen(store, lang, resumed) { lang = it; store.lang = it }
            }
        }
    }
}

// ================= Umumiy bo'laklar =================
@Composable
internal fun Header(title: String, pill: String? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        ShieldIcon(Modifier.size(34.dp), anim = false)
        Spacer(Modifier.width(10.dp))
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextMain, modifier = Modifier.weight(1f))
        if (pill != null) Text("● $pill", color = Safe, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.background(SafeBg, RoundedCornerShape(99.dp)).padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
internal fun Card(modifier: Modifier = Modifier, bg: Color = CardBg, border: Color = Line, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth().background(bg, RoundedCornerShape(20.dp)).border(1.dp, border, RoundedCornerShape(20.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)) { content() }
}

@Composable
internal fun Kicker(text: String) = Text(text.uppercase(), color = Accent, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.6.sp)

/** Qalqon belgisi (Canvas bilan chiziladi — rasm fayli kerak emas). */
@Composable
fun ShieldIcon(modifier: Modifier, anim: Boolean = true) {
    Canvas(modifier) {
        val k = size.minDimension / 120f
        val shield = Path().apply {
            moveTo(60 * k, 8 * k); lineTo(100 * k, 23 * k); lineTo(100 * k, 53 * k)
            cubicTo(100 * k, 80 * k, 83 * k, 98 * k, 60 * k, 108 * k)
            cubicTo(37 * k, 98 * k, 20 * k, 80 * k, 20 * k, 53 * k)
            lineTo(20 * k, 23 * k); close()
        }
        drawPath(shield, Brush.linearGradient(listOf(Safe, Color(0xFF0EA5E9)), Offset.Zero, Offset(size.width, size.height)))
        val tick = Path().apply { moveTo(42 * k, 60 * k); lineTo(54 * k, 72 * k); lineTo(78 * k, 46 * k) }
        drawPath(tick, Color(0xFF04130A), style = Stroke(width = 9 * k, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

/** Bosh ekrandagi katta qalqon va to'lqinlanuvchi halqalar. */
@Composable
private fun ShieldHero() {
    val tr = rememberInfiniteTransition(label = "pulse")
    val p1 by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart), label = "p1")
    Box(Modifier.fillMaxWidth().height(230.dp), contentAlignment = Alignment.Center) {
        for (d in listOf(0f, 0.5f)) {
            val p = (p1 + d) % 1f
            Box(Modifier.size(220.dp).scale(0.72f + 0.4f * p).alpha(0.9f * (1f - p)).border(2.dp, Safe.copy(alpha = 0.5f), CircleShape))
        }
        ShieldIcon(Modifier.size(120.dp))
    }
}

// ================= 1. Himoya (bosh ekran) =================
@Composable
private fun HomeScreen(store: Store, lang: String, tick: Int, resumed: Int, onCheck: () -> Unit, onGuard: () -> Unit, onApps: () -> Unit, onScore: () -> Unit,
                       onPage: (String) -> Unit) {
    val ctx = LocalContext.current
    val hist = remember(tick) { store.history() }
    val allowed = remember(resumed, tick) { MessageGuard.allowed(ctx) }
    val guardOn = allowed && store.notifGuard
    val appsOn = allowed && store.appGuard
    val callsOn = remember(resumed) { CallGuard.allowed(ctx) } && store.callGuard
    val familyOn = remember(resumed, tick) { store.familyToken != null }
    val (cats, tips) = store.tips
    val tip = tips[((System.currentTimeMillis() + 5 * 3600_000L) / 86_400_000L % tips.size).toInt()]
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Header("Tekshir", S.t(lang, "active"))
        ShieldHero()
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(S.t(lang, "protected"), color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Text(S.t(lang, "hero_sub"), color = Muted, fontSize = 14.sp)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Stat(Modifier.weight(1f), "${hist.size}", S.t(lang, "checked"), TextMain)
            Stat(Modifier.weight(1f), "${hist.count { it.level == "danger" }}", S.t(lang, "dangers"), Danger)
            Stat(Modifier.weight(1f), "${tips.size}", S.t(lang, "tips"), TextMain)
        }
        Button(onClick = onCheck, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
            Text(S.t(lang, "check_btn"), fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        }
        HelpLinks(store, lang, tick, onPage)
        Kicker(S.t(lang, "modules"))
        for ((icon, key) in listOf("🔔" to "m_notif", "📲" to "m_apps", "📁" to "m_files", "📞" to "m_calls", "👨‍👩‍👧" to "m_family", "🩺" to "m_score")) {
            val ready = true                                    // 2–7-bosqich: hamma modullar tayyor
            val active = when (key) { "m_apps" -> appsOn; "m_files" -> true; "m_calls" -> callsOn; "m_family" -> familyOn; "m_score" -> true; else -> guardOn }
            val rowMod = Modifier.fillMaxWidth().background(CardBg, RoundedCornerShape(16.dp))
                .border(1.dp, if (ready && active) Safe else Line, RoundedCornerShape(16.dp))
            val click = when (key) { "m_apps" -> onApps; "m_files" -> onCheck; "m_score" -> onScore; else -> onGuard }
            Row((if (ready) rowMod.clickable(onClick = click) else rowMod).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(icon, fontSize = 22.sp, modifier = Modifier.width(36.dp))
                Column(Modifier.weight(1f)) {
                    Text(S.t(lang, key), color = TextMain, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    val sub = when {
                        key == "m_notif" && guardOn -> S.t(lang, key + "_s") + " · ${store.warnedCount} ${S.t(lang, "g_warned")}"
                        key == "m_files" -> S.t(lang, "m_files_ready")
                        else -> S.t(lang, key + "_s")
                    }
                    Text(sub, color = Muted, fontSize = 12.sp)
                }
                when {
                    key == "m_score" -> Text("→", color = Accent, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    !ready -> Text(S.t(lang, "soon"), color = Muted, fontSize = 11.sp,
                        modifier = Modifier.border(1.dp, Line, RoundedCornerShape(99.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
                    active -> Text(S.t(lang, "on"), color = Safe, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.background(SafeBg, RoundedCornerShape(99.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
                    else -> Text(S.t(lang, "turn_on"), color = Bg, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.background(Safe, RoundedCornerShape(99.dp)).padding(horizontal = 10.dp, vertical = 4.dp))
                }
            }
        }
        Kicker(S.t(lang, "tip_day"))
        TipCard(tip, cats.firstOrNull { it.id == tip.cat }?.name ?: "")
    }
}

@Composable
private fun Stat(modifier: Modifier, value: String, label: String, color: Color) {
    Column(modifier.background(CardBg, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        Text(label, color = Muted, fontSize = 12.sp)
    }
}

@Composable
private fun TipCard(tip: Tip, catName: String) {
    Card {
        Kicker(catName)
        Text("${tip.icon} ${tip.title}", color = TextMain, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(tip.text, color = Muted, fontSize = 14.sp)
    }
}

// ================= 2. Tekshirish =================
@Composable
private fun CheckScreen(
    lang: String, input: String, onInput: (String) -> Unit, onCheck: () -> Unit,
    result: Result?, online: Online.Answer?, onlineState: Int, error: String?,
    scanSection: @Composable () -> Unit = {},
    apkSection: @Composable () -> Unit = {}
) {
    val clip = LocalClipboardManager.current
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Header(S.t(lang, "check_title"))
        OutlinedTextField(
            value = input, onValueChange = onInput, minLines = 5, modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(S.t(lang, "hint"), color = Muted) },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = Line,
                focusedTextColor = TextMain, unfocusedTextColor = TextMain, focusedContainerColor = Surface, unfocusedContainerColor = Surface)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(onClick = { clip.getText()?.text?.let(onInput) }, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(16.dp)) {
                Text(S.t(lang, "paste"), color = TextMain)
            }
            Button(onClick = onCheck, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                Text(S.t(lang, "check_btn"), fontWeight = FontWeight.ExtraBold)
            }
        }
        scanSection()
        if (error != null) Text(error, color = Danger, fontWeight = FontWeight.Bold)
        if (result != null) ResultCard(lang, result, online, onlineState)
        Text(S.t(lang, "privacy"), color = Muted, fontSize = 13.sp)
        Text(S.t(lang, "img_priv"), color = Muted, fontSize = 12.sp)
        apkSection()
    }
}

@Composable
private fun ResultCard(lang: String, r: Result, online: Online.Answer?, onlineState: Int) {
    val local = r.level.name.lowercase()
    // Yakuniy daraja — telefondagi va internetdagi natijaning eng xavflisi
    val lv = if (online != null && rank(online.level) > rank(local)) online.level else local
    val title = Texts.t(lang, "level_$lv").replace(Regex("^[^\\p{L}]+"), "")
    val reasons = r.reasons.filter { it.points > 0 || r.level == Level.SAFE }.map { Texts.t(lang, it.code, it.vars) }
    val extra = online?.reasons.orEmpty().filter { it !in reasons }
    Card(bg = levelBg(lv), border = levelColor(lv)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).background(levelColor(lv), CircleShape), contentAlignment = Alignment.Center) {
                Text(when (lv) { "danger" -> "✕"; "suspicious" -> "!"; else -> "✓" }, color = Bg, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
            }
            Spacer(Modifier.width(12.dp))
            Text(title, color = levelColor(lv), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        }
        val all = reasons + extra
        if (all.isNotEmpty() && lv != "safe") {
            Kicker(Texts.t(lang, "why"))
            all.forEach { Text("• $it", color = TextMain, fontSize = 15.sp) }
        }
        Kicker(Texts.t(lang, "what_to_do"))
        adviceFor(r, lv).forEach { Text(Texts.t(lang, it), color = TextMain, fontSize = 15.sp) }
        when (onlineState) {
            1 -> Text(S.t(lang, "online"), color = Muted, fontSize = 13.sp)
            2 -> Text(S.t(lang, "online_done"), color = Muted, fontSize = 13.sp)
            3 -> Text(S.t(lang, "online_fail"), color = Muted, fontSize = 13.sp)
        }
    }
}

/** Maslahat kalitlari (botdagi reply.js bilan bir xil); daraja internet natijasi bilan oshgan bo'lsa — shunga moslab. */
private fun adviceFor(r: Result, lv: String): List<String> {
    if (lv == "safe") return listOf("adv_safe")
    val out = mutableListOf<String>()
    if (lv == "danger") {
        if (r.hasFile) out += "adv_no_install"
        if (r.hasUrl) out += "adv_no_open"
        out += "adv_no_code"
        if (r.groups.any { it in setOf("transfer", "money", "prize", "parcel") }) out += "adv_no_money"
        out += if (r.hasFile) "adv_installed" else "adv_call_bank"
    } else {
        if (r.hasFile) out += "adv_file_wait"
        if (r.hasUrl) out += "adv_wait"
        out += "adv_check_official"; out += "adv_no_code"
    }
    return out
}

// ================= 3. Tarix =================
@Composable
private fun HistoryScreen(store: Store, lang: String, tick: Int, onClear: () -> Unit) {
    val list = remember(tick) { store.history() }
    var ask by remember { mutableStateOf(false) }
    val fmt = remember { SimpleDateFormat("dd.MM HH:mm", Locale.getDefault()) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Column { Spacer(Modifier.height(16.dp)); Header(S.t(lang, "hist_title")) } }
        if (list.isEmpty()) item { Card { Text(S.t(lang, "hist_empty"), color = Muted) } }
        items(list) { h ->
            Row(Modifier.fillMaxWidth().background(CardBg, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(12.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(12.dp).background(levelColor(h.level), CircleShape))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(h.preview, color = TextMain, fontSize = 14.sp, maxLines = 1)
                    Text("${h.title} · ${fmt.format(Date(h.at))}", color = Muted, fontSize = 12.sp)
                }
            }
        }
        item { Text(S.t(lang, "hist_note"), color = Muted, fontSize = 13.sp) }
        if (list.isNotEmpty()) item {
            Column {
                OutlinedButton(onClick = { ask = true }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp)) {
                    Text(S.t(lang, "clear"), color = TextMain)
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
    if (ask) AlertDialog(
        onDismissRequest = { ask = false },
        title = { Text(S.t(lang, "clear_q")) },
        confirmButton = { TextButton(onClick = { ask = false; onClear() }) { Text(S.t(lang, "yes"), color = Danger) } },
        dismissButton = { TextButton(onClick = { ask = false }) { Text(S.t(lang, "no")) } }
    )
}

// ================= 4. Maslahatlar =================
@Composable
private fun TipsScreen(store: Store, lang: String) {
    val (cats, tips) = store.tips
    var cat by rememberSaveable { mutableStateOf("all") }
    val list = tips.filter { cat == "all" || it.cat == cat }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Column { Spacer(Modifier.height(16.dp)); Header(S.t(lang, "tips_title")) } }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(selected = cat == "all", onClick = { cat = "all" }, label = { Text("${S.t(lang, "all")} · ${tips.size}") }) }
                items(cats) { c -> FilterChip(selected = cat == c.id, onClick = { cat = c.id }, label = { Text("${c.icon} ${c.name}") }) }
            }
        }
        items(list) { t -> TipCard(t, cats.firstOrNull { it.id == t.cat }?.name ?: "") }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

// ================= 5. Sozlamalar =================
@Composable
private fun SettingsScreen(store: Store, lang: String, resumed: Int, onLang: (String) -> Unit) {
    val uri = LocalUriHandler.current
    val ctx = LocalContext.current
    val version = remember { runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "" }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Header(S.t(lang, "set_title"))
        Card {
            Kicker(S.t(lang, "lang"))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = lang == "uz-latn", onClick = { onLang("uz-latn") }, label = { Text("O'zbekcha") })
                FilterChip(selected = lang == "ru", onClick = { onLang("ru") }, label = { Text("Русский") })
            }
        }
        GuardCard(store, lang, resumed)
        CallCard(store, lang, resumed)
        FamilyCard(store, lang)
        Card {
            Kicker(S.t(lang, "about"))
            Text(S.t(lang, "about_p"), color = TextMain, fontSize = 15.sp)
        }
        Card(Modifier.clickable { uri.openUri("https://tekshir.ah-digital.uz/maxfiylik.html") }) { Text(S.t(lang, "priv_link"), color = Accent, fontWeight = FontWeight.Bold) }
        Card(Modifier.clickable { uri.openUri("https://t.me/tekshirbot_bot?start=android") }) { Text(S.t(lang, "bot_link"), color = Accent, fontWeight = FontWeight.Bold) }
        Text("${S.t(lang, "made")} · ${S.t(lang, "version")} $version", color = Muted, fontSize = 13.sp)
    }
}

// ================= 2-bosqich: xabarlarni kuzatish (Sozlamalardagi karta) =================
@Composable
private fun GuardCard(store: Store, lang: String, resumed: Int) {
    val ctx = LocalContext.current
    val allowed = remember(resumed) { MessageGuard.allowed(ctx) }
    fun notifGranted() = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    var canNotify by remember(resumed) { mutableStateOf(notifGranted()) }
    val askNotif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { canNotify = it }
    var on by remember { mutableStateOf(store.notifGuard) }
    var sent by remember { mutableStateOf(false) }
    val withDisclosure = rememberDisclosure(store, lang)

    Card(border = if (allowed && on) Safe else Line) {
        Text(S.t(lang, "g_title"), color = TextMain, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        Text(S.t(lang, "g_p"), color = TextMain, fontSize = 14.sp)
        Text(S.t(lang, "g_priv"), color = Muted, fontSize = 13.sp)
        if (!allowed) {
            Text(S.t(lang, "g_need"), color = Warn, fontSize = 13.sp)
            Button(onClick = { withDisclosure { MessageGuard.openSettings(ctx) } }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                Text(S.t(lang, "turn_on"), fontWeight = FontWeight.ExtraBold)
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(S.t(lang, "g_active"), color = Safe, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(S.t(lang, "g_pause") + " ", color = Muted, fontSize = 13.sp)
                Switch(checked = on, onCheckedChange = { on = it; store.notifGuard = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = Bg, checkedTrackColor = Safe))
            }
            if (!canNotify) {
                Text(S.t(lang, "g_notif_need"), color = Warn, fontSize = 13.sp)
                OutlinedButton(onClick = { if (Build.VERSION.SDK_INT >= 33) askNotif.launch(Manifest.permission.POST_NOTIFICATIONS) },
                    modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp)) {
                    Text(S.t(lang, "g_allow_notif"), color = TextMain)
                }
            } else {
                OutlinedButton(onClick = {
                    // Sinov: firibgar SMS namunasi — haqiqiy mexanizmdan o'tadi va ogohlantirish chiqadi
                    val sample = "Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com"
                    val r = store.engine.check(sample)
                    val reason = r.reasons.firstOrNull { it.points > 0 }?.let { Texts.t(lang, it.code, it.vars) } ?: ""
                    MessageGuard.warn(ctx, r.level, "Tekshir", reason, sample, lang)
                    sent = true
                }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp)) {
                    Text(S.t(lang, "g_test"), color = TextMain)
                }
                if (sent) Text(S.t(lang, "g_test_sent"), color = Muted, fontSize = 13.sp)
            }
        }
    }
}

// ================= 3-bosqich: 📲 Ilovalar tekshiruvi =================
@Composable
private fun AppsScreen(store: Store, lang: String, resumed: Int, onBack: () -> Unit) {
    val ctx = LocalContext.current
    val allowed = remember(resumed) { MessageGuard.allowed(ctx) }
    var auto by remember { mutableStateOf(store.appGuard) }
    var scanning by remember { mutableStateOf(false) }
    var found by remember { mutableStateOf<Pair<Int, List<Pair<AppInfo, AppVerdict>>>?>(null) }
    val scope = rememberCoroutineScope()
    val withDisclosure = rememberDisclosure(store, lang)
    fun scan() {
        scanning = true
        scope.launch {
            found = withContext(Dispatchers.Default) { AppGuard.scanAll(ctx) }
            scanning = false
        }
    }
    // Ilova sahifasidan (masalan o'chirgandan keyin) qaytganda ro'yxat yangilansin
    LaunchedEffect(resumed) { if (found != null) scan() }

    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = onBack) { Text(S.t(lang, "back"), color = Accent) }
                Text(S.t(lang, "apps_title"), color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                Text(S.t(lang, "apps_p"), color = Muted, fontSize = 14.sp)
            }
        }
        item {
            Card(border = if (allowed && auto) Safe else Line) {
                if (allowed) Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(S.t(lang, "apps_auto"), color = TextMain, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Switch(checked = auto, onCheckedChange = { auto = it; store.appGuard = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Bg, checkedTrackColor = Safe))
                } else Text(S.t(lang, "apps_need"), color = Warn, fontSize = 13.sp)
                Text(S.t(lang, "apps_priv"), color = Muted, fontSize = 12.sp)
            }
        }
        item {
            Button(onClick = { withDisclosure { scan() } }, enabled = !scanning, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                Text(S.t(lang, if (scanning) "apps_scanning" else "apps_scan"), fontWeight = FontWeight.ExtraBold)
            }
        }
        found?.let { (total, risky) ->
            item {
                if (risky.isEmpty()) Card(bg = SafeBg, border = Safe) {
                    Text(S.t(lang, "apps_ok").replace("{n}", "$total"), color = Safe, fontWeight = FontWeight.Bold)
                } else Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(S.t(lang, "apps_found").replace("{n}", "$total").replace("{k}", "${risky.size}"), color = TextMain, fontWeight = FontWeight.Bold)
                    Text(S.t(lang, "apps_hint"), color = Muted, fontSize = 13.sp)
                }
            }
            items(risky) { (a, v) ->
                val lv = v.level.name.lowercase()
                Card(Modifier.clickable { AppGuard.openAppPage(ctx, a.pkg) }, bg = levelBg(lv), border = levelColor(lv)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(12.dp).background(levelColor(lv), CircleShape))
                        Spacer(Modifier.width(10.dp))
                        Text(a.label, color = TextMain, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                        Text("${v.score}", color = levelColor(lv), fontWeight = FontWeight.ExtraBold)
                    }
                    v.reasons.forEach { Text("• " + AppGuard.reasonText(lang, it.code, it.vars), color = TextMain, fontSize = 13.sp) }
                    Text(S.t(lang, "apps_open"), color = Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

// ================= 4-bosqich: 📁 APK faylni o'rnatishdan oldin tekshirish =================
@Composable
private fun ApkSection(lang: String, apk: ApkReport?, state: Int, online: Online.Answer?, onlineState: Int, onPick: (Uri) -> Unit) {
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) onPick(uri) }
    OutlinedButton(onClick = { pick.launch(arrayOf("application/vnd.android.package-archive", "application/octet-stream")) },
        enabled = state != 1, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(16.dp)) {
        Text(S.t(lang, if (state == 1) "apk_reading" else "apk_btn"), color = TextMain, fontWeight = FontWeight.Bold)
    }
    if (state == 3) Text(S.t(lang, "apk_fail"), color = Danger, fontWeight = FontWeight.Bold)
    if (apk != null) {
        val local = apk.verdict.level.name.lowercase()
        val lv = if (online != null && rank(online.level) > rank(local)) online.level else local
        Card(bg = levelBg(lv), border = levelColor(lv)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).background(levelColor(lv), CircleShape), contentAlignment = Alignment.Center) {
                    Text(when (lv) { "danger" -> "✕"; "suspicious" -> "!"; else -> "✓" }, color = Bg, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(Texts.t(lang, "level_$lv").replace(Regex("^[^\\p{L}]+"), ""), color = levelColor(lv), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    Text(apk.info?.label ?: apk.name, color = TextMain, fontWeight = FontWeight.Bold)
                }
            }
            Text("📄 ${apk.name}", color = Muted, fontSize = 12.sp)
            apk.info?.let { Text("${S.t(lang, "apk_pkg")}: ${it.pkg}", color = Muted, fontSize = 12.sp) }
            Text("${S.t(lang, "apk_size")}: ${"%.1f".format(apk.size / 1048576.0)} MB", color = Muted, fontSize = 12.sp)
            val reasons = apk.verdict.reasons.map { AppGuard.reasonText(lang, it.code, it.vars) }
            val extra = online?.reasons.orEmpty().filter { it !in reasons }
            if (reasons.isNotEmpty() || extra.isNotEmpty()) {
                Kicker(Texts.t(lang, "why"))
                (reasons + extra).forEach { Text("• $it", color = TextMain, fontSize = 14.sp) }
            }
            Kicker(Texts.t(lang, "what_to_do"))
            Text(S.t(lang, when (lv) { "danger" -> "apk_do_danger"; "suspicious" -> "apk_do_susp"; else -> "apk_do_safe" }), color = TextMain, fontSize = 14.sp)
            when (onlineState) {
                1 -> Text(S.t(lang, "apk_online"), color = Muted, fontSize = 13.sp)
                2 -> Text(S.t(lang, "online_done"), color = Muted, fontSize = 13.sp)
                3 -> Text(S.t(lang, "online_fail"), color = Muted, fontSize = 13.sp)
            }
        }
    }
    Text(S.t(lang, "apk_priv"), color = Muted, fontSize = 12.sp)
}

// ================= 5-bosqich: 🩺 Xavfsizlik bali =================
@Composable
private fun ScoreScreen(store: Store, lang: String, resumed: Int, onBack: () -> Unit, onApps: () -> Unit, onSettings: () -> Unit) {
    val ctx = LocalContext.current
    var checks by remember { mutableStateOf<List<SecurityScore.Check>?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    fun calc() { busy = true; scope.launch { checks = withContext(Dispatchers.Default) { Score.checks(ctx, store) }; busy = false } }
    LaunchedEffect(resumed) { calc() }       // Sozlamalardan qaytganda qayta hisoblanadi

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onBack) { Text(S.t(lang, "back"), color = Accent) }
        Text(S.t(lang, "s_title"), color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        val list = checks
        if (list == null) Text(S.t(lang, "s_calc"), color = Muted) else {
            val score = SecurityScore.score(list)
            val lv = SecurityScore.level(score).name.lowercase()
            Card(bg = levelBg(lv), border = levelColor(lv)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(84.dp).border(6.dp, levelColor(lv), CircleShape), contentAlignment = Alignment.Center) {
                        Text("$score", color = levelColor(lv), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    Spacer(Modifier.width(14.dp))
                    Text(S.t(lang, when (lv) { "safe" -> "s_good"; "suspicious" -> "s_mid"; else -> "s_bad" }),
                        color = TextMain, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                }
            }
            // Avval muammolar, keyin yaxshilari
            list.filter { it.ok != null }.sortedBy { it.ok == true }.forEach { c ->
                val ok = c.ok == true
                val action: (() -> Unit)? = if (ok) null else when (c.id) {
                    "s_apps" -> onApps
                    "s_msg", "s_calls" -> onSettings
                    else -> Score.fixIntent(c.id)?.let { a -> { openSystem(ctx, a) } }
                }
                val mod = Modifier.fillMaxWidth().background(CardBg, RoundedCornerShape(16.dp))
                    .border(1.dp, if (ok) Line else Warn, RoundedCornerShape(16.dp))
                Row((if (action != null) mod.clickable(onClick = action) else mod).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (ok) "✅" else "⚠️", fontSize = 20.sp, modifier = Modifier.width(34.dp))
                    Column(Modifier.weight(1f)) {
                        // Muammo bo'lsa — muammoning o'zi yoziladi («USB debugging yoqilgan…»), yaxshi bo'lsa — yutuq
                        Text(S.t(lang, if (ok) c.id else c.id + "_no"), color = TextMain, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    if (action != null) Text(S.t(lang, "s_fix"), color = Accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Card {
                Kicker(S.t(lang, "s_manual"))
                listOf("s_m1", "s_m2", "s_m3").forEach { Text("☐ " + S.t(lang, it), color = TextMain, fontSize = 13.sp) }
            }
        }
        OutlinedButton(onClick = { calc() }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp)) {
            Text(S.t(lang, if (busy) "s_calc" else "s_recalc"), color = TextMain)
        }
        Text(S.t(lang, "s_priv"), color = Muted, fontSize = 12.sp)
    }
}

// ================= 6-bosqich: 📞 Qo'ng'iroqlar (Sozlamalardagi karta) =================
@Composable
private fun CallCard(store: Store, lang: String, resumed: Int) {
    val ctx = LocalContext.current
    var allowed by remember(resumed) { mutableStateOf(CallGuard.allowed(ctx)) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { allowed = CallGuard.allowed(ctx) }
    var on by remember { mutableStateOf(store.callGuard) }
    val withDisclosure = rememberDisclosure(store, lang)
    Card(border = if (allowed && on) Safe else Line) {
        Text(S.t(lang, "c_card"), color = TextMain, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        Text(S.t(lang, "c_p"), color = TextMain, fontSize = 14.sp)
        Text(S.t(lang, "c_priv"), color = Muted, fontSize = 13.sp)
        when {
            !CallGuard.supported() -> Text(S.t(lang, "c_old"), color = Warn, fontSize = 13.sp)
            !allowed -> {
                Text(S.t(lang, "c_need"), color = Warn, fontSize = 13.sp)
                Button(onClick = { withDisclosure { CallGuard.roleIntent(ctx)?.let { ask.launch(it) } } }, modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                    Text(S.t(lang, "turn_on"), fontWeight = FontWeight.ExtraBold)
                }
            }
            else -> Row(verticalAlignment = Alignment.CenterVertically) {
                Text(S.t(lang, "g_active"), color = Safe, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Switch(checked = on, onCheckedChange = { on = it; store.callGuard = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = Bg, checkedTrackColor = Safe))
            }
        }
    }
}

// ================= 7-bosqich: 👨‍👩‍👧 Oila himoyasi (Sozlamalardagi karta) =================
@Composable
private fun FamilyCard(store: Store, lang: String) {
    val uri = LocalUriHandler.current
    var token by remember { mutableStateOf(store.familyToken) }
    var code by rememberSaveable { mutableStateOf("") }
    var label by rememberSaveable { mutableStateOf(store.familyLabel) }
    var busy by remember { mutableStateOf(false) }
    var bad by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val fieldColors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = Line,
        focusedTextColor = TextMain, unfocusedTextColor = TextMain, focusedContainerColor = Surface, unfocusedContainerColor = Surface)
    Card(border = if (token != null) Safe else Line) {
        Text(S.t(lang, "f_card"), color = TextMain, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        Text(S.t(lang, "f_p"), color = TextMain, fontSize = 14.sp)
        if (token != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(S.t(lang, "f_on").replace("{name}", store.familyLabel.ifEmpty { "—" }), color = Safe, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                TextButton(onClick = { store.familyToken = null; token = null }) { Text(S.t(lang, "f_unlink"), color = Danger) }
            }
        } else {
            Text(S.t(lang, "f_how"), color = Muted, fontSize = 13.sp)
            TextButton(onClick = { uri.openUri("https://t.me/tekshirbot_bot?start=oila") }) { Text(S.t(lang, "f_open_bot"), color = Accent) }
            OutlinedTextField(value = code, onValueChange = { code = it.filter(Char::isDigit).take(6); bad = false }, singleLine = true,
                label = { Text(S.t(lang, "f_code")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = fieldColors)
            OutlinedTextField(value = label, onValueChange = { label = it.take(30) }, singleLine = true,
                label = { Text(S.t(lang, "f_label")) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = fieldColors)
            if (bad) Text(S.t(lang, "f_bad"), color = Danger, fontSize = 13.sp)
            Button(onClick = {
                busy = true; bad = false
                scope.launch {
                    val t = withContext(Dispatchers.IO) { Online.familyLink(code, label.trim()) }
                    busy = false
                    if (t != null) { store.familyToken = t; store.familyLabel = label.trim(); token = t; code = "" } else bad = true
                }
            }, enabled = !busy && code.length == 6, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                Text(S.t(lang, if (busy) "f_linking" else "f_link"), fontWeight = FontWeight.ExtraBold)
            }
        }
        Text(S.t(lang, "f_priv"), color = Muted, fontSize = 12.sp)
    }
}

/** Tizim sozlamalari sahifasini ochish (topilmasa — umumiy Sozlamalar). */
private fun openSystem(ctx: android.content.Context, action: String) {
    try { ctx.startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    catch (_: Exception) { runCatching { ctx.startActivity(Intent(android.provider.Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
}

/**
 * Google Play talabi («Prominent disclosure»): bildirishnomalar, ilovalar ro'yxati va qo'ng'iroqlarga kirishdan OLDIN
 * aniq tushuntirish va rozilik. Bir marta ko'rsatiladi. Natija: `withDisclosure { ... }` — rozilik bo'lsa ishni bajaradi.
 */
@Composable
private fun rememberDisclosure(store: Store, lang: String): (() -> Unit) -> Unit {
    var pending by remember { mutableStateOf<(() -> Unit)?>(null) }
    pending?.let { action ->
        AlertDialog(
            onDismissRequest = { pending = null },
            title = { Text(S.t(lang, "dis_title"), fontWeight = FontWeight.ExtraBold) },
            text = { Text(S.t(lang, "dis_body"), fontSize = 14.sp, modifier = Modifier.verticalScroll(rememberScrollState())) },
            confirmButton = { TextButton(onClick = { store.disclosed = true; pending = null; action() }) { Text(S.t(lang, "dis_ok"), color = Safe, fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { pending = null }) { Text(S.t(lang, "dis_no"), color = Muted) } }
        )
    }
    return { action -> if (store.disclosed) action() else pending = action }
}
