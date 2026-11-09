// Testlar uchun yordamchi: serverni soxta sozlamalar bilan ishga tushiradi va to'xtatadi.
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BOT_TOKEN = "123456:TEST-TOKEN";
const OWNER_ID = "111";                  // test egasi (admin) Telegram ID'si
const ADMIN_PASSWORD = "test-parol-12345";

async function startServer(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ahd-test-"));
  const port = 4100 + Math.floor(Math.random() * 800);
  const tgLog = path.join(dir, "telegram.log");
  fs.writeFileSync(tgLog, "");
  const env = {
    PATH: process.env.PATH,
    AHD_TEST: "1",
    PORT: String(port),
    DATA_DIR: path.join(dir, "data"),
    TG_LOG: tgLog,
    TELEGRAM_BOT_TOKEN: BOT_TOKEN,
    TELEGRAM_CHAT_ID: OWNER_ID,
    PUBLIC_URL: `http://127.0.0.1:${port}`,
    ADMIN_PASSWORD,
    ...extraEnv
  };
  const child = spawn(process.execPath, ["-r", path.join(__dirname, "telegram-mock.js"), "server.js"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", d => (output += d));
  child.stderr.on("data", d => (output += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + "/healthz")).ok) break; } catch {}
    if (child.exitCode !== null) throw new Error("Server ishga tushmadi:\n" + output);
    await new Promise(r => setTimeout(r, 100));
  }
  return {
    base,
    output: () => output,
    telegram: () => fs.readFileSync(tgLog, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l)),
    stop: () => new Promise(r => { child.once("exit", r); child.kill(); }).then(() => fs.rmSync(dir, { recursive: true, force: true }))
  };
}

// Telegram Login Widget javobini soxtalashtirish (bot tokeni bilan to'g'ri imzolangan)
function telegramLogin(id, extra = {}) {
  const data = { id: String(id), first_name: "Test", auth_date: String(Math.floor(Date.now() / 1000)), ...extra };
  const key = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const check = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join("\n");
  data.hash = crypto.createHmac("sha256", key).update(check).digest("hex");
  return data;
}

// Kirib, cookie qaytaradi
async function login(base, id, extra) {
  const r = await fetch(base + "/api/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(telegramLogin(id, extra)) });
  if (!r.ok) throw new Error("Kirib bo'lmadi: " + r.status);
  return r.headers.get("set-cookie").split(";")[0];
}

module.exports = { startServer, telegramLogin, login, OWNER_ID, ADMIN_PASSWORD };
