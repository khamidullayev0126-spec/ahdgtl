// Tekshir kengaytmasi — fon xizmati.
// Vazifalari: o'ng tugma menyusi, ikonkadagi belgi (🔴/🟡), «baribir ochish» ruxsati (faqat shu seans), varaqni yopish.
// Internetga hech narsa yubormaydi.
importScripts("text.js");
const S = globalThis.TekshirText;

chrome.runtime.onInstalled.addListener(async () => {
  const { lang } = await chrome.storage.local.get({ lang: "" });
  const l = lang || S.defaultLang();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "tekshir-link", title: S.s(l, "menu_link"), contexts: ["link"] });
    chrome.contextMenus.create({ id: "tekshir-text", title: S.s(l, "menu_text"), contexts: ["selection"] });
  });
});

// Til o'zgarsa — menyu nomlari ham
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local" || !ch.lang) return;
  const l = ch.lang.newValue || S.defaultLang();
  chrome.contextMenus.update("tekshir-link", { title: S.s(l, "menu_link") });
  chrome.contextMenus.update("tekshir-text", { title: S.s(l, "menu_text") });
});

// Tanlangan havola yoki matn kichik oynada tekshiriladi (matn kengaytma ichida qoladi)
chrome.contextMenus.onClicked.addListener(info => {
  const q = String(info.menuItemId === "tekshir-link" ? info.linkUrl : info.selectionText || "").slice(0, 5000);
  if (!q) return;
  chrome.windows.create({ url: chrome.runtime.getURL("check.html?q=" + encodeURIComponent(q)), type: "popup", width: 440, height: 640 });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const tabId = sender.tab && sender.tab.id;
  if (msg.type === "verdict" && tabId != null) {
    const text = msg.level === "danger" ? "!" : msg.level === "suspicious" ? "?" : "";
    chrome.action.setBadgeText({ tabId, text });
    if (text) chrome.action.setBadgeBackgroundColor({ tabId, color: msg.level === "danger" ? "#EF4444" : "#F5B301" });
  } else if (msg.type === "allowed?") {
    chrome.storage.session.get({ allowed: [] }).then(s => reply(s.allowed.includes(msg.host)));
    return true;                                   // javob keyinroq (async)
  } else if (msg.type === "allow") {
    chrome.storage.session.get({ allowed: [] }).then(s => chrome.storage.session.set({ allowed: [...new Set([...s.allowed, msg.host])] }));
  } else if (msg.type === "close" && tabId != null) {
    chrome.tabs.remove(tabId);
  }
});
