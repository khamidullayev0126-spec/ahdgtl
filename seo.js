// AHdigital — Google uchun tuzilgan ma'lumot (JSON-LD)
// Bosh sahifadagi JSON-LD qo'lda yozilmaydi: server uni ishga tushganda yasaydi —
//   • xizmatlar va narxlar  → services.js dan
//   • savol-javoblar (FAQ)  → index.html dagi <details> bloklaridan
// Shuning uchun narx yoki savolni o'zgartirsangiz, JSON-LD ham o'zi yangilanadi (deploydan keyin).

const fs = require("fs");
const path = require("path");

const SITE = "https://www.ah-digital.uz";

// HTML matndan teglarni olib tashlab, oddiy matn qilamiz
function plain(html) {
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ").trim();
}

// index.html dagi savol-javoblar: <details><summary>Savol</summary><p>Javob</p></details>
function faqFrom(html) {
  const out = [];
  const re = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) out.push({ q: plain(m[1]), a: plain(m[2]) });
  return out;
}

function buildJsonLd(services, faq) {
  const business = {
    "@type": "ProfessionalService",
    "@id": SITE + "/#biznes",
    name: "AHdigital",
    url: SITE + "/",
    logo: SITE + "/icon-512.png",
    image: SITE + "/og.jpg",
    description: "AI yordamida saytlar, videolar, slayd va postlar.",
    slogan: "AI bilan g'oyadan natijagacha",
    telephone: "+998956322905",
    email: "khamidullayev0126@gmail.com",
    areaServed: { "@type": "Country", name: "Uzbekistan" },
    availableLanguage: ["uz", "ru", "en"],
    ...(services.length ? { priceRange: `${Math.min(...services.map(s => s.price))} – ${Math.max(...services.map(s => s.price))} UZS` } : {}),
    sameAs: ["https://t.me/ahdigital_01", "https://www.instagram.com/ah.digital_01"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Xizmatlar va narxlar",
      itemListElement: services.map(s => ({
        "@type": "Offer",
        price: s.price,
        priceCurrency: "UZS",
        url: SITE + "/index.html?xizmat=" + s.id + "#buyurtma",
        itemOffered: { "@type": "Service", name: s.name, description: s.desc }
      }))
    }
  };
  const website = { "@type": "WebSite", "@id": SITE + "/#sayt", url: SITE + "/", name: "AHdigital", inLanguage: ["uz", "ru", "en"], publisher: { "@id": SITE + "/#biznes" } };
  const graph = [business, website];
  if (faq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": SITE + "/#savollar",
      mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

// index.html ga JSON-LD qo'yilgan holatini qaytaradi (bir marta yasaladi, xotirada turadi)
function indexWithJsonLd(publicDir, services) {
  const file = path.join(publicDir, "index.html");
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, "utf8");
  const data = buildJsonLd(services, faqFrom(html));
  // "</" belgisi skriptni yopib qo'ymasligi uchun
  const tag = `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
  const old = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  return old.test(html) ? html.replace(old, () => tag) : html.replace("</head>", () => tag + "\n</head>");
}

module.exports = { indexWithJsonLd, buildJsonLd, faqFrom };
