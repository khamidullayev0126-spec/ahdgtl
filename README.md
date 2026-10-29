# AHdigital

AI kontent va saytlar xizmati sayti + portfolio + admin panel.

## Bu papkada nima bor

```
AHdigital/
├── public/                 ← saytning o'zi
│   ├── index.html          ← ASOSIY SAYT (shuni oching)
│   ├── style.css
│   ├── script.js
│   ├── services.js         ← narxlar ro'yxati (narxni shu yerda o'zgartiring)
│   ├── admin.html          ← admin panel (faqat internetda ishlaydi)
│   ├── admin.js
│   ├── images/             ← rasmlar va logo
│   └── portfolio/
│       ├── index.html      ← portfolio
│       ├── portfolio.css
│       └── portfolio.js
├── server.js               ← backend (Node.js)
├── package.json
├── render.yaml             ← Render sozlamasi
└── .env.example
```

## 1. Kompyuterda ko'rish (eng oson)

`public` papkasini oching → `index.html` ga ikki marta bosing.
Sayt, portfolio va barcha havolalar ishlaydi.
Buyurtma formasi bu holatda Telegram orqali yuboradi.

Do'stingizga yuborish uchun **butun `public` papkasini** zip qilib yuboring.

## 2. Kompyuterda server bilan

```
npm install
npm start
```
Keyin brauzerda: http://localhost:3000 (admin: /admin.html, parol: admin123)

## 3. Internetga chiqarish (GitHub + Render)

1. GitHub'dagi `ahdigital` repongizga kiring.
2. **Add file → Upload files**.
3. Kompyuterdagi `AHdigital` papkasi **ichidagi hamma narsani** sichqoncha bilan sudrab tashlang
   (`public` papkasi ham! U faqat sudrab tashlanganda yuklanadi).
4. **Commit changes** bosing. Render saytni 2–3 daqiqada o'zi yangilaydi.
5. GitHub'da `public` papkasi ko'rinib turishi shart. Yo'q bo'lsa — sayt "Cannot GET /" deydi.

Render'da `ADMIN_PASSWORD` ni o'z parolingizga almashtirishni unutmang (Environment bo'limi).

## Narxlarni o'zgartirish

`public/services.js` faylini oching va kerakli `price` ni o'zgartiring.
U asosiy saytda, portfolio kalkulyatorida va serverda birdan o'zgaradi.
