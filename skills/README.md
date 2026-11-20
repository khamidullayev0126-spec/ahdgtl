# Claude skills — AHdigital

## chat-handoff
Uzun Claude suhbatini yangi chatga **kontekst yo'qotmasdan** ko'chirish uchun skill.
- «yangi chatga o'tamiz», «xulosa qil», «limit tugayapti» desangiz — qisqa, nusxalanadigan HANDOFF bloki yozadi.
- Yangi chatga shu blokni qo'ysangiz — Claude qayta so'ramasdan, keyingi qadamdan davom etadi.
- Maxfiy ma'lumotlar (parol, token, karta) blokka yozilmaydi.
- Har qanday tilda ishlaydi (o'zbek, rus, ingliz…).

**O'rnatish:** `chat-handoff.skill` faylini yuklab oling → claude.ai → Settings → Capabilities → Skills → Upload skill.

Testlar: `chat-handoff/evals/`, natijalar: `chat-handoff-workspace/` (skill bilan 100%, skillsiz 95%).
