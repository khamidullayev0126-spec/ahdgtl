// AHdigital — bot sizga HAQIQIY telefon qo'ng'irog'i qiladi (Twilio orqali)
// Gapni ElevenLabs o'zbekcha ovozda aytadi (kalit bo'lmasa — Twilio'ning inglizcha ovozi).
// Xavfsizlik: faqat OWNER_PHONE raqamiga qo'ng'iroq qiladi, kuniga ko'pi bilan CALL_DAILY_LIMIT marta.

const crypto = require("crypto");

function createCaller({ publicUrl }) {
  const SID = process.env.TWILIO_ACCOUNT_SID, TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM = process.env.TWILIO_FROM, TO = process.env.OWNER_PHONE;
  if (!SID || !TOKEN || !FROM || !TO) return null;

  const XI_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE = process.env.ELEVENLABS_VOICE_ID || "UjuEL3hLLUaDED9iW4Yb";   // "Sardor" — Reels'dagi ovoz
  const XI_MODEL = process.env.ELEVENLABS_MODEL || "eleven_v3";
  const LIMIT = Number(process.env.CALL_DAILY_LIMIT) || 10;

  const audio = new Map();          // id -> mp3 (Twilio shu manzildan ovozni oladi)
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

  const xml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Qo'ng'iroq qiladi. Natija: { ok, text }
  async function call(text) {
    const today = new Date().toISOString().slice(0, 10);
    if (day !== today) { day = today; count = 0; }
    if (count >= LIMIT) return { ok: false, text: `Bugungi qo'ng'iroq limiti tugadi (${LIMIT} ta).` };

    const url = await speak(`Assalomu alaykum, Abdulhamid! AHdigital botidan. ${text}`);
    const say = url
      ? `<Play>${xml(url)}</Play><Pause length="1"/><Play>${xml(url)}</Play>`        // ikki marta eshittiradi
      : `<Say voice="Polly.Joanna">Hello Abdulhamid. Your AHdigital bot has an important message for you. Please check Telegram.</Say>`;
    const body = new URLSearchParams({ To: TO, From: FROM, Twiml: `<Response>${say}</Response>` });

    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
        method: "POST",
        headers: { Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const data = await r.json();
      if (!r.ok) { console.error("Twilio xatosi:", data.message); return { ok: false, text: `Qo'ng'iroq qilib bo'lmadi: ${data.message}` }; }
      count++;
      return { ok: true, text: `Qo'ng'iroq ketdi ${url ? "(o'zbekcha ovoz)" : "(inglizcha ovoz — ELEVENLABS_API_KEY yo'q)"}.` };
    } catch (e) {
      return { ok: false, text: `Twilio bilan bog'lanib bo'lmadi: ${e.message}` };
    }
  }

  return { mount, call };
}

module.exports = { createCaller };
