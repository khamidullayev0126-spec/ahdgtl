// Tekshir — ilova ekranlari (Jetpack Compose).
// 1-bosqich: Himoya (bosh ekran), Tekshirish, Tarix, Maslahat, Sozlama.
// Avtomatik himoya modullari (xabarlar, ilovalar, qo'ng'iroq…) keyingi bosqichlarda yoqiladi.
@file:OptIn(ExperimentalMaterial3Api::class)

package uz.ahdigital.tekshir.ui

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
import kotlinx.coroutines.withContext
import uz.ahdigital.tekshir.data.Online
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.data.Tip
import uz.ahdigital.tekshir.engine.Level
import uz.ahdigital.tekshir.engine.Result
import uz.ahdigital.tekshir.engine.Texts
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

private fun levelColor(l: String) = when (l) { "danger" -> Danger; "suspicious" -> Warn; else -> Safe }
private fun levelBg(l: String) = when (l) { "danger" -> DangerBg; "suspicious" -> WarnBg; else -> SafeBg }
private fun rank(l: String) = when (l) { "danger" -> 2; "suspicious" -> 1; else -> 0 }

/** Butun ilova. shared — boshqa ilovadan «Ulashish → Tekshir» bilan kelgan matn. */
@Composable
fun TekshirApp(store: Store, shared: String?, onSharedUsed: () -> Unit) {
    var lang by remember { mutableStateOf(store.lang) }
    var tab by rememberSaveable { mutableStateOf(Tab.HOME) }
    var input by rememberSaveable { mutableStateOf("") }
    var result by remember { mutableStateOf<Result?>(null) }
    var online by remember { mutableStateOf<Online.Answer?>(null) }
    var onlineState by remember { mutableStateOf(0) }          // 0 — kerak emas, 1 — kutilmoqda, 2 — tayyor, 3 — internet yo'q
    var error by remember { mutableStateOf<String?>(null) }
    var histTick by remember { mutableStateOf(0) }              // tarix yangilanganda ekranni qayta chizish uchun
    val scope = rememberCoroutineScope()

    fun runCheck() {
        val text = input.trim()
        if (text.isEmpty()) { error = S.t(lang, "empty"); return }
        error = null
        val r = store.engine.check(text)                         // 1) telefonda, internetsiz — darhol
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

    LaunchedEffect(shared) {
        if (!shared.isNullOrBlank()) { input = shared; tab = Tab.CHECK; runCheck(); onSharedUsed() }
    }

    Scaffold(
        containerColor = Bg,
        bottomBar = {
            NavigationBar(containerColor = Surface) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t, onClick = { tab = t },
                        icon = { Text(t.icon, fontSize = 20.sp) },
                        label = { Text(S.t(lang, t.key), fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(selectedTextColor = Safe, unselectedTextColor = Muted, indicatorColor = SafeBg)
                    )
                }
            }
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            when (tab) {
                Tab.HOME -> HomeScreen(store, lang, histTick) { tab = Tab.CHECK }
                Tab.CHECK -> CheckScreen(lang, input, { input = it }, ::runCheck, result, online, onlineState, error)
                Tab.HIST -> HistoryScreen(store, lang, histTick) { store.clearHistory(); histTick++ }
                Tab.TIPS -> TipsScreen(store, lang)
                Tab.SET -> SettingsScreen(lang) { lang = it; store.lang = it }
            }
        }
    }
}

// ================= Umumiy bo'laklar =================
@Composable
private fun Header(title: String, pill: String? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        ShieldIcon(Modifier.size(34.dp), anim = false)
        Spacer(Modifier.width(10.dp))
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextMain, modifier = Modifier.weight(1f))
        if (pill != null) Text("● $pill", color = Safe, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.background(SafeBg, RoundedCornerShape(99.dp)).padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
private fun Card(modifier: Modifier = Modifier, bg: Color = CardBg, border: Color = Line, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth().background(bg, RoundedCornerShape(20.dp)).border(1.dp, border, RoundedCornerShape(20.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)) { content() }
}

@Composable
private fun Kicker(text: String) = Text(text.uppercase(), color = Accent, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.6.sp)

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
private fun HomeScreen(store: Store, lang: String, tick: Int, onCheck: () -> Unit) {
    val hist = remember(tick) { store.history() }
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
        Kicker(S.t(lang, "modules"))
        for ((icon, key) in listOf("🔔" to "m_notif", "📲" to "m_apps", "📁" to "m_files", "📞" to "m_calls", "👨‍👩‍👧" to "m_family", "🩺" to "m_score")) {
            Row(Modifier.fillMaxWidth().background(CardBg, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(12.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Text(icon, fontSize = 22.sp, modifier = Modifier.width(36.dp))
                Column(Modifier.weight(1f)) {
                    Text(S.t(lang, key), color = TextMain, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text(S.t(lang, key + "_s"), color = Muted, fontSize = 12.sp)
                }
                Text(S.t(lang, "soon"), color = Muted, fontSize = 11.sp,
                    modifier = Modifier.border(1.dp, Line, RoundedCornerShape(99.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
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
    result: Result?, online: Online.Answer?, onlineState: Int, error: String?
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
        if (error != null) Text(error, color = Danger, fontWeight = FontWeight.Bold)
        if (result != null) ResultCard(lang, result, online, onlineState)
        Text(S.t(lang, "privacy"), color = Muted, fontSize = 13.sp)
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
private fun SettingsScreen(lang: String, onLang: (String) -> Unit) {
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
        Card {
            Kicker(S.t(lang, "about"))
            Text(S.t(lang, "about_p"), color = TextMain, fontSize = 15.sp)
        }
        Card(Modifier.clickable { uri.openUri("https://tekshir.ah-digital.uz/maxfiylik.html") }) { Text(S.t(lang, "priv_link"), color = Accent, fontWeight = FontWeight.Bold) }
        Card(Modifier.clickable { uri.openUri("https://t.me/tekshirbot_bot?start=android") }) { Text(S.t(lang, "bot_link"), color = Accent, fontWeight = FontWeight.Bold) }
        Text("${S.t(lang, "made")} · ${S.t(lang, "version")} $version", color = Muted, fontSize = 13.sp)
    }
}
