// URL o'rinbosari — faqat `URL` YO'Q muhitlar uchun (iPhone'dagi JavaScriptCore). Brauzer va Node'da ishlamaydi.
// Mexanizmga kerak bo'lgani: protocol, username, password, hostname (punycode «xn--» bilan), port, pathname, search, hash.
// Xalqaro harfli domenlar (masalan kirill «с» bilan «сlick.uz») — xuddi brauzerdagidek «xn--…» ko'rinishiga o'tadi:
// firibgarlikni aynan shu belgi bo'yicha ushlaymiz (url_punycode).
(function (g) {
  if (typeof g.URL === "function") return;

  // ---- Punycode (RFC 3492), faqat kodlash ----
  const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;
  const digit = d => String.fromCharCode(d + 22 + 75 * (d < 26));
  function adapt(delta, num, first) {
    let k = 0;
    delta = first ? Math.floor(delta / DAMP) : delta >> 1;
    delta += Math.floor(delta / num);
    for (; delta > ((BASE - TMIN) * TMAX) >> 1; k += BASE) delta = Math.floor(delta / (BASE - TMIN));
    return Math.floor(k + ((BASE - TMIN + 1) * delta) / (delta + SKEW));
  }
  function encode(input) {
    const cps = Array.from(input).map(c => c.codePointAt(0));
    let n = INITIAL_N, delta = 0, bias = INITIAL_BIAS, out = "";
    for (const c of cps) if (c < 128) out += String.fromCharCode(c);
    const b = out.length; let h = b;
    if (b) out += "-";
    while (h < cps.length) {
      let m = Infinity;
      for (const c of cps) if (c >= n && c < m) m = c;
      delta += (m - n) * (h + 1); n = m;
      for (const c of cps) {
        if (c < n) delta++;
        if (c === n) {
          let q = delta;
          for (let k = BASE; ; k += BASE) {
            const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
            if (q < t) break;
            out += digit(t + ((q - t) % (BASE - t)));
            q = Math.floor((q - t) / (BASE - t));
          }
          out += digit(q);
          bias = adapt(delta, h + 1, h === b);
          delta = 0; h++;
        }
      }
      delta++; n++;
    }
    return out;
  }
  const toASCII = host => host.split(".").map(l => /[^\x00-\x7f]/.test(l) ? "xn--" + encode(l.normalize("NFC")) : l).join(".");

  const RE = /^([a-z][a-z0-9+.\-]*:)\/\/(?:([^:@\/?#]*)(?::([^@\/?#]*))?@)?(\[[^\]]*\]|[^\/?#:]*)(?::(\d*))?([^?#]*)(\?[^#]*)?(#.*)?$/i;
  class URL {
    constructor(href) {
      const m = RE.exec(String(href).trim());
      if (!m || !m[4]) throw new TypeError("Invalid URL: " + href);
      this.protocol = m[1].toLowerCase();
      this.username = m[2] || "";
      this.password = m[3] || "";
      let host = m[4].toLowerCase();
      try { host = decodeURIComponent(host); } catch { /* o'zgarishsiz */ }
      this.hostname = toASCII(host);
      const defPort = { "http:": "80", "https:": "443" }[this.protocol];
      this.port = m[5] && m[5] !== defPort ? m[5] : "";
      this.pathname = m[6] || "/";
      this.search = m[7] && m[7] !== "?" ? m[7] : "";
      this.hash = m[8] && m[8] !== "#" ? m[8] : "";
      this.host = this.hostname + (this.port ? ":" + this.port : "");
      this.origin = this.protocol + "//" + this.host;
    }
    get href() {
      const auth = this.username ? this.username + (this.password ? ":" + this.password : "") + "@" : "";
      return this.protocol + "//" + auth + this.host + this.pathname + this.search + this.hash;
    }
    toString() { return this.href; }
  }
  g.URL = URL;
})(typeof globalThis !== "undefined" ? globalThis : this);
