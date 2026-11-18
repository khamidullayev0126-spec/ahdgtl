// Bazaning zaxira nusxasi Telegram'da (bepul server uchun).
// Muammo: bepul Render server qayta ishga tushganda (uxlab uyg'onganda, yangilanganda) diskdagi fayllar o'chadi —
// til, statistika va shikoyatlar yo'qoladi.
// Yechim: bot bazani har 5 daqiqada (o'zgargan bo'lsa) va to'xtashdan oldin YOPIQ Telegram kanalga yuboradi.
// Kanalda bitta pin qilingan xabar bo'ladi — u har safar YANGILANADI (kanal to'lib ketmaydi).
// Ishga tushganda bot shu pin xabardagi faylni yuklab, bazani tiklaydi.
//
// Sozlash: .env / Render → BACKUP_CHAT_ID=-100...  (yopiq kanal ID'si; bot u yerda admin bo'lishi kerak)
// Bazada xabar matni YO'Q — faqat Telegram ID, til, natijalar va raqamlarning hash'i.

const fs = require("fs");
const { InputFile } = require("grammy");

const INTERVAL = 5 * 60 * 1000;

// Ishga tushishda: kanaldagi pin qilingan faylni yuklab, dbPath ga yozadi. Natija: true — tiklandi
async function restore(api, chatId, dbPath, download) {
  const chat = await api.getChat(chatId);
  const doc = chat.pinned_message && chat.pinned_message.document;
  if (!doc) return false;
  const buf = await download(doc.file_id);
  if (!buf || buf.length < 100 || buf.subarray(0, 15).toString() !== "SQLite format 3") throw new Error("zaxira fayli buzilgan");
  for (const ext of ["", "-wal", "-shm"]) { try { fs.unlinkSync(dbPath + ext); } catch { /* yo'q bo'lsa — mayli */ } }
  fs.writeFileSync(dbPath, buf);
  return true;
}

// Zaxira yuboruvchi: bazani o'zgarganda yuboradi, pin xabarni yangilaydi
function createBackup(api, chatId, db) {
  let pinnedId = null, busy = false;
  let lastChanges = db.raw.prepare("SELECT total_changes() n").get().n;   // hozirgi holat — darhol qayta yubormaymiz
  async function run(force = false) {
    if (busy) return false;
    const changes = db.raw.prepare("SELECT total_changes() n").get().n;
    if (!force && changes === lastChanges) return false;          // hech narsa o'zgarmagan — yubormaymiz
    busy = true;
    try {
      const file = new InputFile(db.raw.serialize(), "tekshir.db");
      const caption = `📦 Tekshir bazasi · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC\nBu xabarni o'chirmang va pin'dan olmang.`;
      if (pinnedId == null) {
        const chat = await api.getChat(chatId);
        if (chat.pinned_message && chat.pinned_message.document) pinnedId = chat.pinned_message.message_id;
      }
      if (pinnedId != null) {
        await api.editMessageMedia(chatId, pinnedId, { type: "document", media: file, caption });
      } else {
        const m = await api.sendDocument(chatId, file, { caption, disable_notification: true });
        await api.pinChatMessage(chatId, m.message_id, { disable_notification: true });
        pinnedId = m.message_id;
      }
      lastChanges = changes;
      return true;
    } catch (e) {
      if (/not modified/.test(e.message)) { lastChanges = changes; return false; }
      if (/message to edit not found/i.test(e.message)) pinnedId = null;   // kimdir o'chirgan — keyingi safar yangisini yuboramiz
      console.error("Zaxira:", e.message);
      return false;
    } finally { busy = false; }
  }
  return { run, start: () => setInterval(() => run(), INTERVAL).unref() };
}

module.exports = { restore, createBackup, INTERVAL };
