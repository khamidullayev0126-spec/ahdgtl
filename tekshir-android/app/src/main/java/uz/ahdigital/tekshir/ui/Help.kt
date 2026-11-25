// 9-bosqich ekranlari:
//   📸 Skrinshot va 🔳 QR kod tugmalari (Tekshirish oynasi)
//   🆘 «Aldandim — nima qilay?» · ✈️ Telegram himoyasi · 🎓 «Firibgarni tani» mashqi (bosh ekran → Yordam)
package uz.ahdigital.tekshir.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.ahdigital.tekshir.data.Store
import uz.ahdigital.tekshir.engine.QrCheck
import uz.ahdigital.tekshir.engine.QrInfo
import uz.ahdigital.tekshir.engine.QrKind
import uz.ahdigital.tekshir.engine.HelpTexts
import uz.ahdigital.tekshir.engine.Quiz
import uz.ahdigital.tekshir.engine.Rescue
import uz.ahdigital.tekshir.engine.TgSafety
import uz.ahdigital.tekshir.ui.theme.Accent
import uz.ahdigital.tekshir.ui.theme.Bg
import uz.ahdigital.tekshir.ui.theme.CardBg
import uz.ahdigital.tekshir.ui.theme.Danger
import uz.ahdigital.tekshir.ui.theme.DangerBg
import uz.ahdigital.tekshir.ui.theme.Line
import uz.ahdigital.tekshir.ui.theme.Muted
import uz.ahdigital.tekshir.ui.theme.Safe
import uz.ahdigital.tekshir.ui.theme.SafeBg
import uz.ahdigital.tekshir.ui.theme.TextMain
import uz.ahdigital.tekshir.ui.theme.Warn

// ================= 📸 Skrinshot va 🔳 QR (Tekshirish oynasi) =================
/** imgState: 0 — hech narsa, 1 — o'qilmoqda, 3 — ochib bo'lmadi, 4 — matn topilmadi. */
@Composable
internal fun ScanSection(lang: String, imgState: Int, qr: QrInfo?, qrFail: Boolean, onImage: (Uri) -> Unit, onQr: () -> Unit) {
    // Rasm tanlash — Android'ning rasm oynasi: Tekshir'ga galereyaga ruxsat KERAK EMAS, faqat tanlangan rasm beriladi
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> if (uri != null) onImage(uri) }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedButton(onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
            enabled = imgState != 1, modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(16.dp)) {
            Text(S.t(lang, if (imgState == 1) "img_reading" else "img_btn"), color = TextMain, fontWeight = FontWeight.Bold)
        }
        OutlinedButton(onClick = onQr, modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(16.dp)) {
            Text(S.t(lang, "qr_btn"), color = TextMain, fontWeight = FontWeight.Bold)
        }
    }
    when (imgState) {
        3 -> Text(S.t(lang, "img_fail"), color = Danger, fontWeight = FontWeight.Bold)
        4 -> Text(S.t(lang, "img_empty"), color = Warn, fontWeight = FontWeight.Bold)
    }
    if (qrFail) Text(S.t(lang, "qr_fail"), color = Warn, fontSize = 13.sp)
    if (qr != null) QrCard(lang, qr)
}

@Composable
private fun QrCard(lang: String, q: QrInfo) {
    val notes = QrCheck.notes(q)
    val warn = notes.any { it in setOf("qr_wifi_open", "qr_http", "qr_sms") }
    Card(border = if (warn) Warn else Line) {
        Kicker(S.t(lang, "qr_title"))
        val shown = when (q.kind) {
            QrKind.WIFI -> "${HelpTexts.t(lang, "qr_wifi_name")}: ${q.fields["ssid"].orEmpty().ifEmpty { "—" }}"
            QrKind.SMS -> "${q.fields["to"].orEmpty()}: ${q.text}"
            else -> q.text
        }
        Text(shown.take(300), color = TextMain, fontSize = 14.sp)
        notes.forEach { Text(HelpTexts.t(lang, it), color = if (warn) Warn else Muted, fontSize = 13.sp) }
    }
}

// ================= Bosh ekrandagi «Yordam va o'rganish» bloki =================
@Composable
internal fun HelpLinks(store: Store, lang: String, tick: Int, onPage: (String) -> Unit) {
    val tgDone = remember(tick) { store.tgDone.size }
    val best = remember(tick) { store.quizBest }
    Kicker(S.t(lang, "help"))
    // 🆘 — ko'zga tashlanadigan qizil karta
    Row(Modifier.fillMaxWidth().background(DangerBg, RoundedCornerShape(16.dp)).border(1.dp, Danger, RoundedCornerShape(16.dp))
        .clickable { onPage("rescue") }.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("🆘", fontSize = 24.sp, modifier = Modifier.width(40.dp))
        Column(Modifier.weight(1f)) {
            Text(S.t(lang, "h_rescue"), color = TextMain, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            Text(S.t(lang, "h_rescue_s"), color = Muted, fontSize = 12.sp)
        }
        Text("→", color = Danger, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
    }
    HelpRow("✈️", S.t(lang, "h_tg"), S.t(lang, "tg_score").replace("{n}", "$tgDone").replace("{k}", "${TgSafety.ids.size}")) { onPage("tg") }
    HelpRow("🎓", S.t(lang, "h_quiz"),
        if (best >= 0) S.t(lang, "h_quiz_best").replace("{n}", "$best") else S.t(lang, "h_quiz_s")) { onPage("quiz") }
}

@Composable
private fun HelpRow(icon: String, title: String, sub: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().background(CardBg, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp))
        .clickable(onClick = onClick).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 22.sp, modifier = Modifier.width(36.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = TextMain, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(sub, color = Muted, fontSize = 12.sp)
        }
        Text("→", color = Accent, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
    }
}

// ================= 🆘 Aldandim — nima qilay? =================
@Composable
internal fun RescueScreen(lang: String, onBack: () -> Unit) {
    val ctx = LocalContext.current
    var openId by rememberSaveable { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onBack) { Text(S.t(lang, "back"), color = Accent) }
        Text(S.t(lang, "r_title"), color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        Text(S.t(lang, "r_p"), color = Muted, fontSize = 14.sp)
        Rescue.cases(lang).forEach { c ->
            val isOpen = openId == c.id
            Card(Modifier.clickable { openId = if (isOpen) null else c.id }, border = if (isOpen) Danger else Line) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(c.icon, fontSize = 22.sp, modifier = Modifier.width(36.dp))
                    Text(c.title, color = TextMain, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, modifier = Modifier.weight(1f))
                    Text(if (isOpen) "▲" else "▼", color = Muted)
                }
                if (isOpen) {
                    Kicker(S.t(lang, "r_steps"))
                    c.steps.forEachIndexed { i, s ->
                        Row {
                            Box(Modifier.size(24.dp).background(Danger, CircleShape), contentAlignment = Alignment.Center) {
                                Text("${i + 1}", color = Bg, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                            }
                            Spacer(Modifier.width(10.dp))
                            Text(s, color = TextMain, fontSize = 14.sp, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
        // 102 — telefon oynasi raqam terilgan holda ochiladi (qo'ng'iroqni foydalanuvchi o'zi bosadi, ruxsat kerak emas)
        Button(onClick = { startSafe(ctx, Intent(Intent.ACTION_DIAL, Uri.parse("tel:102"))) }, modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Danger, contentColor = Bg)) {
            Text(S.t(lang, "r_police"), fontWeight = FontWeight.ExtraBold)
        }
        Card(bg = SafeBg, border = Safe) { Text(Rescue.footer(lang), color = TextMain, fontSize = 14.sp) }
        Spacer(Modifier.height(8.dp))
    }
}

// ================= ✈️ Telegram himoyasi =================
@Composable
internal fun TgScreen(store: Store, lang: String, onBack: () -> Unit) {
    val ctx = LocalContext.current
    var done by remember { mutableStateOf(store.tgDone) }
    var noApp by remember { mutableStateOf(false) }
    val items = remember(lang) { TgSafety.items(lang) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onBack) { Text(S.t(lang, "back"), color = Accent) }
        Text(S.t(lang, "tg_title"), color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        Text(S.t(lang, "tg_p"), color = Muted, fontSize = 14.sp)
        val n = done.count { it in TgSafety.ids }
        val lv = TgSafety.level(n).name.lowercase()
        Card(bg = levelBg(lv), border = levelColor(lv)) {
            Text(S.t(lang, "tg_score").replace("{n}", "$n").replace("{k}", "${TgSafety.ids.size}"),
                color = levelColor(lv), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Text(S.t(lang, when (lv) { "safe" -> "tg_good"; "suspicious" -> "tg_mid"; else -> "tg_bad" }), color = TextMain, fontSize = 14.sp)
        }
        items.forEach { item ->
            val on = item.id in done
            Card(border = if (on) Safe else Line) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = on, onCheckedChange = { c ->
                        done = if (c) done + item.id else done - item.id
                        store.tgDone = done
                    }, colors = CheckboxDefaults.colors(checkedColor = Safe, checkmarkColor = Bg))
                    Text(item.title, color = TextMain, fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.weight(1f))
                }
                Text(item.how, color = Muted, fontSize = 13.sp)
                if (item.link.isNotEmpty()) Text(S.t(lang, "tg_open"), color = Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                    modifier = Modifier.clickable { noApp = !openTelegram(ctx, item.link) }.padding(vertical = 4.dp))
            }
        }
        if (noApp) Text(S.t(lang, "tg_no_app"), color = Warn, fontSize = 13.sp)
        Text(S.t(lang, "tg_priv"), color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(8.dp))
    }
}

/** Telegram ichidagi sahifani ochadi; bo'lmasa — Telegram'ning o'zini. false — Telegram topilmadi. */
private fun openTelegram(ctx: Context, link: String): Boolean {
    for (l in listOf(link, "tg://settings").distinct()) {
        if (startSafe(ctx, Intent(Intent.ACTION_VIEW, Uri.parse(l)))) return true
    }
    for (pkg in listOf("org.telegram.messenger", "org.telegram.messenger.web", "org.thunderdog.challegram")) {
        ctx.packageManager.getLaunchIntentForPackage(pkg)?.let { if (startSafe(ctx, it)) return true }
    }
    return false
}

private fun startSafe(ctx: Context, i: Intent): Boolean = try {
    ctx.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true
} catch (_: ActivityNotFoundException) { false } catch (_: SecurityException) { false }

// ================= 🎓 Firibgarni tani =================
@Composable
internal fun QuizScreen(store: Store, lang: String, onBack: () -> Unit) {
    val ctx = LocalContext.current
    val qs = remember(lang) { Quiz.questions(lang) }
    var idx by rememberSaveable { mutableStateOf(0) }
    var right by rememberSaveable { mutableStateOf(0) }
    var answer by rememberSaveable { mutableStateOf<Boolean?>(null) }   // foydalanuvchi tanlovi: true — «firibgar»
    var finished by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onBack) { Text(S.t(lang, "back"), color = Accent) }
        Text(S.t(lang, "q_title"), color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        if (finished) {
            val key = Quiz.result(right, qs.size)
            val lv = when (key) { "quiz_r3" -> "safe"; "quiz_r2" -> "suspicious"; else -> "danger" }
            Card(bg = levelBg(lv), border = levelColor(lv)) {
                Text(S.t(lang, "q_score").replace("{c}", "$right").replace("{n}", "${qs.size}"), color = levelColor(lv), fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                Text(S.t(lang, key), color = TextMain, fontSize = 15.sp)
            }
            Button(onClick = { idx = 0; right = 0; answer = null; finished = false }, modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                Text(S.t(lang, "q_again"), fontWeight = FontWeight.ExtraBold)
            }
            OutlinedButton(onClick = {
                val text = S.t(lang, "q_share_text").replace("{c}", "$right").replace("{n}", "${qs.size}")
                startSafe(ctx, Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), null))
            }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp)) {
                Text(S.t(lang, "q_share"), color = TextMain)
            }
        } else {
            val q = qs[idx]
            Text(S.t(lang, "q_of").replace("{i}", "${idx + 1}").replace("{n}", "${qs.size}"), color = Muted, fontSize = 13.sp)
            Text(S.t(lang, "q_p"), color = Muted, fontSize = 14.sp)
            // Xabar — chatdagi pufakcha ko'rinishida
            Text(q.text, color = TextMain, fontSize = 16.sp,
                modifier = Modifier.fillMaxWidth().background(CardBg, RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp))
                    .border(1.dp, Line, RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)).padding(14.dp))
            val a = answer
            if (a == null) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = { answer = true; if (q.scam) right++ }, modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Danger, contentColor = Bg)) {
                        Text(S.t(lang, "q_scam"), fontWeight = FontWeight.ExtraBold)
                    }
                    Button(onClick = { answer = false; if (!q.scam) right++ }, modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Safe, contentColor = Bg)) {
                        Text(S.t(lang, "q_safe"), fontWeight = FontWeight.ExtraBold)
                    }
                }
            } else {
                val ok = a == q.scam
                Card(bg = if (ok) SafeBg else DangerBg, border = if (ok) Safe else Danger) {
                    Text(S.t(lang, if (ok) "q_right" else "q_wrong"), color = if (ok) Safe else Danger, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                    Text(S.t(lang, if (q.scam) "q_scam" else "q_safe"), color = TextMain, fontWeight = FontWeight.Bold)
                    Text(q.why, color = TextMain, fontSize = 14.sp)
                }
                val last = idx == qs.size - 1
                Button(onClick = {
                    if (last) {
                        finished = true
                        if (right > store.quizBest) store.quizBest = right
                    } else { idx++; answer = null }
                }, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Bg)) {
                    Text(S.t(lang, if (last) "q_finish" else "q_next"), fontWeight = FontWeight.ExtraBold)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}
