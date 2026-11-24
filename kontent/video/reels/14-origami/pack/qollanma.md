# Bir oy Codex'da. / Keyin uyga qaytish.
Tungi xonada bola Claude Code'ni tashlab, hamma maqtagan Codex'ga o'tadi. Codex kuchli chiqadi, lekin bir haftadan keyin u o'z loyihalari, skill'lari va odatlari Claude'da qolganini ko'radi va qaytadi. To'q sariq quti-yordamchi «^ ^» bo'lib quvonadi.

34 s · 30 fps · 1020 kadr · 1080x1920 · three.js 0.160, 1 fayl · tugaydigan oxir · prompt: 491 so'z (o'zbekcha matnlar ko'p bo'lgani uchun odatdagidan uzunroq)
**Asosiy lahzalar:** 0 bolaning yuzi · 3.5 quti «╥ ╥» · 5.0 telefon · 10.5 codex terminali · 16.5 «~/loyihalarim» · 24.5 «^ ^» · 29.5 yakuniy karta
**Taxminlar:** Claude Code rejimi; ovoz ref/ovoz.mp3 dan olinadi, vaqtlar unga moslanadi; reference video faqat uslub uchun — qahramonlar o'zimizniki; rasmiy logolar yo'q.

**Formula:**
1. **Har o'zgarishning sababi bor:** yuz «╥ ╥» bo'ladi — chunki bola ketyapti; «^ ^» — chunki qaytdi.
2. **Fon xiralashadi, oyna o'qiladi:** UI chiqqanda 3D 10 px xira va 45% qorong'i — matn birinchi o'qiladi.
3. **Ovoz — vaqt jadvali:** BEATS ovozdagi pauzalarga moslanadi, og'iz faqat ovoz bor paytda qimirlaydi.
4. **Halol hikoya:** «Codex ham kuchli» — raqobatchini yomonlamaymiz, qaytish sababi shaxsiy odat.

## 1 · Prompt
Claude Code'ga (Opus 5.5 yoki yangiroq, effort high), bo'sh papkaga, `ref/ovoz.mp3` qo'yib, aynan shunday joylang — `prompt.txt` fayli.

| Blok | Vazifasi |
|---|---|
| BRAND | Almashtiriladigan blok: bola, ikki quti, telefon/terminallar, xona, ranglar, barcha matnlar |
| FORMAT | Bitta HTML, three.js 0.160, 1080x1920, 30 fps, ovozga moslash |
| LOOK | Iliq/sovuq yorug'lik, UI chiqqanda fon xiralashishi, rang tekshiruvi |
| BEATS | 11 ta lahza, har birining sababi |
| CAMERA | Faqat 3 ta kesish, qolgani yumshoq harakat |
| CHECKS | Kamera ichkariga kirmasin, subtitrlar xavfsiz zonada, rang probi |

## 2 · Ishga tushirish
1. Bir martalik: Node 18+, `npm i playwright && npx playwright install chromium`, ffmpeg (Claude Code o'zi o'rnatib beradi).
2. Bo'sh papka, `ref/ovoz.mp3` (va bo'lsa `ref/ovoz-quti.mp3`), promptni joylang.
3. «Render stills at 0.5, 3.6, 6, 11, 15.5, 18, 23, 25, 31 s at half size as one contact sheet.» — ko'rib, 3-bo'limdagi tuzatishlarni yuboring. 3–8 aylana normal.
4. Vaqtlar o'zgarmay qolgach — tovush prompti (6-bo'lim).
5. Yakuniy render (5-bo'lim).

## 3 · Tuzatishlar
**Birinchi build'dan keyin qarang:** kadrlar to'plami; 29.5–34 s dagi keng kadrda quti rangi; kamera to'qnashuv jurnali; subtitrlarning 120–960 / 250–1500 zonada turishi.
**Tayyor (inglizcha, nusxalang):**
- Yuz kadr ichiga sig'masa: "At 0–3.5 s the face fills the whole frame: pull back so head and shoulders fit, lens 34°, eyes at y ≈ 750."
- Kamera boshga kirsa: "At 16.5 s the camera is inside HERO's head: place it 2.4 units in front, 0.3 above the eyes, looking down at him."
- Og'iz ovozga mos kelmasa: "Mouth moves during silence at 8.9–10.5 s: drive it only from the voice envelope above −35 dB."
- Rang noto'g'ri: "BUDDY probes F08A5E in the wide shot: lower its albedo until it reads E2683A ±8."
- Matn tez o'tsa: "'Lekin hamma loyiham…' is on screen only 3 s: hold it until 22.3 s and split it into two lines at the dash."
- Kulrang quti ko'rinmasa: "CODEX is hidden at 9–15 s: move it 1 unit left and light it with a cool 7F95FF spot."

## 4 · Kadrlar jadvali (ovozdan oldingi taxmin)
| Vaqt | Kadr | Tasvir | Tovush |
|---|---|---|---|
| 0.0 | 0 | Bola yuzi, gapiryapti | xona shovqini |
| 3.5 | 105 | Kesish: quti «╥ ╥» | past «bum» |
| 5.0 | 150 | Telefon chiqadi | yumshoq «vush» |
| 9.0 | 270 | Telefon tushadi, Codex'ga burilish | «vush» |
| 10.5 | 315 | Codex terminali | klaviatura tıqillashi |
| 15.0 | 450 | «Bir haftadan keyin» | jimlik |
| 16.5 | 495 | ~/loyihalarim ro'yxati | yozuv tovushi |
| 22.5 | 675 | Kesish: ma'yus quti | — |
| 24.5 | 735 | «^ ^» va 1-sakrash | quvnoq «bip» |
| 25.0 | 750 | 2-sakrash | yumshoq qo'nish |
| 29.5 | 885 | Keng kadr, yakuniy karta | iliq akkord |

## 5 · Silliq render
1. `?t=` bilan har kadrni alohida chizish.
2. 2x (2160x3840) da GPU bilan suratga olish.
3. Kadr ichida 8–12 namuna (harakat xiraligi + silliq qirralar).
4. 1080x1920 ga kichraytirish, ~1.5% don.
5. ffmpeg: H.264 High, 30 fps, CRF 14, yuv420p, ovoz AAC bilan.

## 6 · Tovush
Vaqtlar qotgach yuboring:
```text
Add sound under the existing voice (ref/ovoz.mp3, ref/ovoz-quti.mp3 stay untouched and on top). Synthesize in an OfflineAudioContext, no samples, no extra voices. 48 kHz stereo WAV, 34 s. Read every event from the scene timeline; each hit peaks 1 frame after its picture event.
FOLEY: soft low thud on the cut to BUDDY at 3.5; airy whoosh on PHONE in and out; light key ticks while each terminal types; a short silence for the "Bir haftadan keyin" card; two bright bips on BUDDY's hops; soft paper landing.
MUSIC: lo-fi, 120 BPM, A minor, soft piano + muted pluck + vinyl noise; ducks 8 dB under the voice; stops at 15.0 for the card, returns warmer in A major at 24.5, resolves on the end card.
MIX: about -14 LUFS integrated, true peak ≤ -2 dBTP, limiter ≤ 3 dB, voice always clearly on top. Mux into the MP4 as AAC.
```
**Agar aralashma noto'g'ri bo'lsa:** "Music covers the voice at 16–22 s: duck it 4 dB more." · "The hop bips are too sharp: lowpass at 4 kHz, −3 dB."

## 7 · O'zingizniki qiling
Faqat BRAND o'zgaradi, masalan:
```text
HERO: low-poly girl, 2.5 units: icosahedron head F5D0B0, short bob hair 2B1B14, black eyes, box mouth, hoodie 2E8B57.
CAST: BUDDY, box 1.9x1.6x1.5 3B82F6, face = terminal screen 0B1A33, glyph eyes 9CC8FF. RIVAL, same box 9CA3AF, eyes "> _".
SET: rainy evening study room, window 23374F, warm desk lamp.
```

## 8 · Uchta maslahat
1. **Avval ovoz:** ovoz tayyor bo'lmasa, vaqtlarni qotirmang — hamma narsa unga bog'liq.
2. **Subtitr — o'qish uchun:** har gap kamida 0.5 s hech narsa to'smagan holda tursin.
3. **Halollik:** Codex haqida texnik «yomon» degan gap qo'shmang — video shaxsiy tajriba haqida.
