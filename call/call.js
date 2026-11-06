// AHdigital — bot sizga qo'ng'iroq qiladi
// 1-usul (tavsiya, bepul): CallMeBot — Telegram orqali ovozli qo'ng'iroq. Render'da CALLMEBOT_USER=@username
// 2-usul: Twilio — oddiy telefon qo'ng'irog'i. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, OWNER_PHONE
// Gapni ElevenLabs o'zbekcha ovozda aytadi (ELEVENLABS_API_KEY bo'lsa).
// Xavfsizlik: faqat sizga qo'ng'iroq qiladi, kuniga ko'pi bilan CALL_DAILY_LIMIT marta.

const crypto = require("crypto");

function createCaller({ publicUrl }) {
  const CMB_USER = process.env.CALLMEBOT_USER;                       // masalan @Abdulkhamid_2905
  const SID = process.env.TWILIO_ACCOUNT_SID, TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM = process.env.TWILIO_FROM, TO = process.env.OWNER_PHONE;
  const useTwilio = !CMB_USER && SID && TOKEN && FROM && TO;
  if (!CMB_USER && !useTwilio) return null;

  const XI_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE = process.env.ELEVENLABS_VOICE_ID || "UjuEL3hLLUaDED9iW4Yb";   // "Sardor" — Reels'dagi ovoz
  const XI_MODEL = process.env.ELEVENLABS_MODEL || "eleven_v3";
  const LIMIT = Number(process.env.CALL_DAILY_LIMIT) || 10;

  const audio = new Map();          // id -> mp3 (qo'ng'iroq xizmati ovozni shu manzildan oladi)
  let day = "", count = 0;

  function mount(app) {
    app.get("/ovoz/:id.mp3", (req, res) => {
      const buf = audio.get(req.params.id);
      if (!buf) return res.sendStatus(404);
      res.set("Content-Type", "audio/mpeg").send(buf);
    });
  }

  async function speak(text) {
    if (!XI_KEY || !publicUrl) return null;
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": XI_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: XI_MODEL })
      });
      if (!r.ok) { console.error("ElevenLabs xatosi:", r.status, (await r.text()).slice(0, 200)); return null; }
      const id = crypto.randomBytes(8).toString("hex");
      audio.set(id, Buffer.from(await r.arrayBuffer()));
      setTimeout(() => audio.delete(id), 15 * 60 * 1000).unref();   // 15 daqiqadan keyin o'chiriladi
      return `${publicUrl}/ovoz/${id}.mp3`;
    } catch (e) { console.error("ElevenLabs:", e.message); return null; }
  }

  // ---------- CallMeBot: Telegram qo'ng'irog'i (bepul, 30 soniyagacha) ----------
  async function viaCallMeBot(text, url) {
    const q = new URLSearchParams({ user: CMB_USER, cc: "missed" });   // javob bermasangiz — matn ham keladi
    if (url) q.set("file", url);
    else { q.set("text", text.slice(0, 250)); q.set("lang", process.env.CALLMEBOT_LANG || "en-GB-Standard-B"); q.set("rpt", "2"); }
    const r = await fetch(`https://api.callmebot.com/start.php?${q}`);
    const body = (await r.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // CallMeBot xatoni oddiy matn bilan qaytaradi
    if (!r.ok || /error|not authorized|authorize|disabled|invalid/i.test(body)) {
      return { ok: false, text: `CallMeBot: ${body.slice(0, 200) || r.status}. Telegramda @CallMeBot_txtbot ga /start yozganingizni tekshiring.` };
    }
    return { ok: true };
  }

  // ---------- Twilio: oddiy telefon qo'ng'irog'i ----------
  const xml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  async function viaTwilio(text, url) {
    const say = url
      ? `<Play>${xml(url)}</Play><Pause length="1"/><Play>${xml(url)}</Play>`
      : `<Say voice="Polly.Joanna">Hello Abdulhamid. Your AHdigital bot has an important message for you. Please check Telegram.</Say>`;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: TO, From: FROM, Twiml: `<Response>${say}</Response>` })
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, text: `Twilio: ${data.message}` };
    return { ok: true };
  }

  // Qo'ng'iroq qiladi. Natija: { ok, text }
  async function call(text) {
    const today = new Date().toISOString().slice(0, 10);
    if (day !== today) { day = today; count = 0; }
    if (count >= LIMIT) return { ok: false, text: `Bugungi qo'ng'iroq limiti tugadi (${LIMIT} ta).` };

    const url = await speak(`Assalomu alaykum, Abdulhamid! AHdigital botidan. ${text}`);
    try {
      const res = useTwilio ? await viaTwilio(text, url) : await viaCallMeBot(text, url);
      if (!res.ok) { console.error("Qo'ng'iroq xatosi:", res.text); return { ok: false, text: `Qo'ng'iroq qilib bo'lmadi. ${res.text}` }; }
      count++;
      return { ok: true, text: `Qo'ng'iroq ketdi (${useTwilio ? "telefon" : "Telegram"}, ${url ? "o'zbekcha ovoz" : "ElevenLabs kaliti yo'q — oddiy ovoz"}).` };
    } catch (e) {
      return { ok: false, text: `Qo'ng'iroq xizmati bilan bog'lanib bo'lmadi: ${e.message}` };
    }
  }

  return { mount, call, kind: useTwilio ? "Twilio" : "CallMeBot (Telegram)" };
}

module.exports = { createCaller };
