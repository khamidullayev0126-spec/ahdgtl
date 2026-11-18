// Fayl tekshiruvi (5-bosqich).
// 1) Nomi va turi bo'yicha (faylni ochmasdan).  2) SHA-256 hash → VirusTotal (faylning o'zi YUBORILMAYDI).
// Bot faylni HECH QACHON ishga tushirmaydi va diskka saqlamaydi — faqat xotirada hash hisoblaydi.

const crypto = require("crypto");
const { virusTotalFile } = require("./external");

// Android ilova fayllari — noma'lum manbadan kelgan bo'lsa, eng ko'p uchraydigan firibgarlik vositasi
const APK = ["apk", "xapk", "apks", "apkm"];
// Kompyuterda ishga tushadigan fayllar
const EXEC = ["exe", "scr", "bat", "cmd", "com", "pif", "msi", "vbs", "vbe", "js", "jse", "wsf", "hta", "jar", "ps1", "lnk", "reg"];
// Ichida makros (dastur) bo'lishi mumkin bo'lgan hujjatlar
const MACRO = ["docm", "xlsm", "pptm", "dotm", "xlam"];
// Arxivlar — ichida APK yashirilgan bo'lishi mumkin
const ARCHIVE = ["zip", "rar", "7z", "tar", "gz"];
// Ko'rinishi "begunoh" kengaytmalar — ikki kengaytmali nomlarda aldash uchun ishlatiladi (rasm.jpg.apk)
const INNOCENT = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt", "mp4", "mp3", "heic", "webp"];

const MAX_DOWNLOAD = 20 * 1024 * 1024;   // Telegram bot API 20 MB dan katta faylni yuklab berolmaydi

function analyzeFileName(name = "", mime = "", size = 0) {
  const reasons = [];
  const low = name.toLowerCase().trim();
  const parts = low.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";
  const prev = parts.length > 1 ? parts[parts.length - 1] : "";

  if (APK.includes(ext)) reasons.push({ code: "file_apk", points: 80, vars: { ext: "." + ext } });
  else if (mime === "application/vnd.android.package-archive") reasons.push({ code: "file_apk_hidden", points: 85, vars: { ext: ext ? "." + ext : "?" } });
  else if (EXEC.includes(ext)) reasons.push({ code: "file_exe", points: 75, vars: { ext: "." + ext } });
  else if (MACRO.includes(ext)) reasons.push({ code: "file_macro", points: 40, vars: { ext: "." + ext } });
  else if (ARCHIVE.includes(ext)) reasons.push({ code: "file_archive", points: 15, vars: { ext: "." + ext } });

  // "rasm.jpg.apk" — oxirgi kengaytma xavfli, oldingisi esa ishonch uyg'otish uchun qo'yilgan
  if (prev && INNOCENT.includes(prev) && (APK.includes(ext) || EXEC.includes(ext))) reasons.push({ code: "file_double", points: 20, vars: { name } });
  // Nomida ko'p bo'shliq bilan yashirilgan kengaytma: "hujjat.pdf          .exe"
  if (/\s{5,}/.test(name)) reasons.push({ code: "file_spaces", points: 20, vars: {} });

  if (size > MAX_DOWNLOAD) reasons.push({ code: "file_big", points: 0, vars: {} });
  return reasons;
}

const sha256 = buf => crypto.createHash("sha256").update(buf).digest("hex");

// Asosiy funksiya. download — faylni xotiraga yuklab beradigan funksiya (bot.js beradi; testlarda soxtasi).
// opts.fast = true — faqat nomi va turi (yuklab olmaymiz, VirusTotal'ga so'ramaymiz)
async function checkFile({ name, mime, size }, download, opts = {}) {
  const reasons = analyzeFileName(name, mime, size);
  let hashChecked = false;
  // opts.sha — hash tayyor bo'lsa (ilova faylni o'zi hisoblab yuboradi — fayl serverga YUKLANMAYDI)
  if (opts.sha && !opts.fast) {
    const vt = /^[0-9a-f]{64}$/i.test(opts.sha) ? await virusTotalFile(opts.sha.toLowerCase()) : null;
    if (vt) {
      hashChecked = true;
      if (vt.malicious >= 2) reasons.push({ code: "file_vt_bad", points: 85, vars: { n: vt.malicious } });
      else if (vt.malicious === 1 || vt.suspicious >= 2) reasons.push({ code: "file_vt_some", points: 35, vars: { n: vt.malicious + vt.suspicious } });
    }
    return { host: "", reasons, hashChecked };
  }
  if (size <= MAX_DOWNLOAD && download && !opts.fast) {
    try {
      const buf = await download();
      const vt = await virusTotalFile(sha256(buf));
      if (vt) {
        hashChecked = true;
        if (vt.malicious >= 2) reasons.push({ code: "file_vt_bad", points: 85, vars: { n: vt.malicious } });
        else if (vt.malicious === 1 || vt.suspicious >= 2) reasons.push({ code: "file_vt_some", points: 35, vars: { n: vt.malicious + vt.suspicious } });
      }
    } catch (e) {
      console.error("Faylni yuklab bo'lmadi:", e.message);   // xato bo'lsa — faqat nomiga qarab baho beramiz
    }
  }
  return { host: "", reasons, hashChecked };
}

module.exports = { analyzeFileName, checkFile, sha256, MAX_DOWNLOAD };
