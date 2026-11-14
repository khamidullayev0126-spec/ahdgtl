// AHdigital — 3 til: O'zbek (asosiy), Русский, English
// Qanday ishlaydi: sahifadagi o'zbekcha matnlar o'zi topiladi va quyidagi lug'atdan tarjima qilinadi.
// Yangi matn qo'shsangiz — lug'atga ham qo'shing:  "O'zbekcha matn": ["Ruscha", "Inglizcha"]
// Tarjima topilmasa, o'zbekcha qoladi (sayt buzilmaydi).
(function () {
  const LANGS = ["uz", "ru", "en"];
  const LABEL = { uz: "O'zbek", ru: "Русский", en: "English" };
  let lang = "uz";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    lang = LANGS.includes(q) ? q : (localStorage.getItem("ahd-lang") || "uz");
    if (LANGS.includes(q)) localStorage.setItem("ahd-lang", q);
  } catch {}
  if (!LANGS.includes(lang)) lang = "uz";
  document.documentElement.lang = lang;

  // ---------------- Lug'at ----------------
  const D = {
    // Umumiy / menyu
    "Menyu": ["Меню", "Menu"],
    "Yopish": ["Закрыть", "Close"],
    "Sinab ko'ring": ["Попробуйте", "Try it"],
    "Xizmatlar": ["Услуги", "Services"],
    "Ishlarim": ["Мои работы", "My work"],
    "Jarayon": ["Процесс", "Process"],
    "Men haqimda": ["Обо мне", "About me"],
    "Portfolio": ["Портфолио", "Portfolio"],
    "Savollar": ["Вопросы", "FAQ"],
    "Aloqa": ["Контакты", "Contact"],
    "Ilova": ["Приложение", "App"],
    "Kabinet": ["Кабинет", "Account"],
    "Buyurtma berish": ["Заказать", "Order now"],
    "Bo'limlar": ["Разделы", "Sections"],
    "Shartlar": ["Условия", "Terms"],
    "Xizmat shartlari": ["Условия услуг", "Terms of service"],
    "Maxfiylik siyosati": ["Политика конфиденциальности", "Privacy Policy"],
    "Blog": ["Блог", "Blog"],
    "Kirish bilan quyidagilarga rozilik bildirasiz:": ["Входя, вы соглашаетесь с:", "By signing in, you agree to:"],
    "Xizmat shartlari →": ["Условия услуг →", "Terms of service →"],
    "Kirish": ["Войти", "Sign in"],
    "Ro'yxatdan o'tish": ["Регистрация", "Sign up"],
    "Chiqish": ["Выйти", "Sign out"],
    "yoki": ["или", "or"],
    "Yuklanmoqda…": ["Загрузка…", "Loading…"],
    "Xizmatlar yuklanmoqda...": ["Загружаем услуги...", "Loading services..."],
    "© 2026 · Barcha huquqlar himoyalangan": ["© 2026 · Все права защищены", "© 2026 · All rights reserved"],
    "Telefon": ["Телефон", "Phone"],
    "Telegram kanal": ["Telegram-канал", "Telegram channel"],
    "Abdulhamid": ["Абдулхамид", "Abdulhamid"],
    "Oldin": ["До", "Before"],
    "Hozir": ["Сейчас", "Now"],

    // Bosh sahifa — hero
    "AHdigital": ["AHdigital", "AHdigital"],
    "AHdigital — xizmatlar va narxlar": ["AHdigital — услуги и цены", "AHdigital — services and pricing"],
    "AI bilan kontent va saytlar · Claude": ["Контент и сайты с AI · Claude", "AI-made content & websites · Claude"],
    "Video, slayd, post va saytlar —": ["Видео, слайды, посты и сайты —", "Videos, slides, posts and websites —"],
    "AI tezligida.": ["со скоростью AI.", "at AI speed."],
    "Claude yordamida brendingiz uchun kontent va saytlar yarataman yoki o'zingizga AI bilan ishlashni o'rgataman.": ["С помощью Claude создаю контент и сайты для вашего бренда или учу вас работать с AI.", "With Claude, I create content and websites for your brand — or teach you to work with AI yourself."],
    "Narxlarni ko'rish": ["Посмотреть цены", "See prices"],
    "Portfolioni ko'rish": ["Смотреть портфолио", "View portfolio"],
    "xil xizmat": ["видов услуг", "services"],
    "so'mdan boshlab": ["сум — минимальная цена", "UZS starting price"],
    "O'zbek": ["Узбекский", "Uzbek"],
    "tilida yordam": ["язык поддержки", "language support"],

    // Vizitka sinovi
    "Sinab ko'ring · 10 soniya": ["Попробуйте · 10 секунд", "Try it · 10 seconds"],
    "Vizitka saytingiz qanday ko'rinadi?": ["Как будет выглядеть ваш сайт-визитка?", "What would your business card site look like?"],
    "Biznesingiz nomini yozing va rangni tanlang — saytingizning namunasi darhol paydo bo'ladi.": ["Введите название бизнеса и выберите цвет — пример сайта сразу появится рядом.", "Type your business name and pick a color — a preview of your site appears instantly."],
    "Biznes nomi": ["Название бизнеса", "Business name"],
    "Faoliyat": ["Сфера", "Business type"],
    "Kafe yoki restoran": ["Кафе или ресторан", "Café or restaurant"],
    "Go'zallik saloni": ["Салон красоты", "Beauty salon"],
    "Do'kon": ["Магазин", "Shop"],
    "Ustaxona / xizmat": ["Мастерская / услуги", "Workshop / services"],
    "O'quv markazi": ["Учебный центр", "Learning center"],
    "Rang": ["Цвет", "Color"],
    "Sayt rangi": ["Цвет сайта", "Site color"],
    "Shu saytni buyurtma qilaman — 30 000 so'm": ["Заказать этот сайт — 30 000 сум", "Order this site — 30,000 UZS"],
    "Vizitka sayt namunasi": ["Пример сайта-визитки", "Business card site preview"],
    "Biznesingiz nomi": ["Название бизнеса", "Your business name"],
    "Terrakota": ["Терракота", "Terracotta"], "Zaytun": ["Оливковый", "Olive"], "Dengiz": ["Морской", "Sea"], "Olcha": ["Вишнёвый", "Cherry"], "Ko'mir": ["Графит", "Charcoal"],
    "Mazali taomlar har kuni": ["Вкусная еда каждый день", "Delicious food every day"],
    "Menyu ": ["Меню", "Menu"],
    "Osh": ["Плов", "Plov"], "Lag'mon": ["Лагман", "Lagman"], "Somsa": ["Самса", "Samsa"],
    "Go'zalligingiz — bizning ishimiz": ["Ваша красота — наше дело", "Your beauty is our job"],
    "Soch turmagi": ["Причёска", "Hairstyle"], "Manikyur": ["Маникюр", "Manicure"], "Makiyaj": ["Макияж", "Makeup"],
    "Sifatli mahsulotlar, qulay narxlar": ["Качественные товары, доступные цены", "Quality products, fair prices"],
    "Mahsulotlar": ["Товары", "Products"], "Yangi kolleksiya": ["Новая коллекция", "New collection"], "Chegirmalar": ["Скидки", "Discounts"], "Yetkazib berish": ["Доставка", "Delivery"],
    "Tez, sifatli, kafolat bilan": ["Быстро, качественно, с гарантией", "Fast, reliable, guaranteed"],
    "Ta'mirlash": ["Ремонт", "Repair"], "O'rnatish": ["Установка", "Installation"], "Maslahat": ["Консультация", "Consultation"],
    "kelishiladi": ["договорная", "negotiable"], "bepul": ["бесплатно", "free"],
    "Bilim — kelajak kaliti": ["Знания — ключ к будущему", "Knowledge is the key to the future"],
    "Kurslar": ["Курсы", "Courses"], "Ingliz tili": ["Английский язык", "English"], "Matematika": ["Математика", "Math"], "IT asoslari": ["Основы IT", "IT basics"], "oyiga": ["в месяц", "per month"],
    "Manzil · ish vaqti 9:00–21:00": ["Адрес · часы работы 9:00–21:00", "Address · open 9:00–21:00"],

    // Xizmatlar bo'limi
    "Xizmatlar va narxlar": ["Услуги и цены", "Services & prices"],
    "Bir martalik buyurtma, obuna yoki o'quv kursi — o'zingizga qulayini tanlang.": ["Разовый заказ, подписка или учебный курс — выберите удобный вариант.", "A one-off order, a subscription or a course — choose what suits you."],
    "Bir martalik xizmatlar": ["Разовые услуги", "One-off services"],
    "Obunalar": ["Подписки", "Subscriptions"],
    "O'quv kursi": ["Учебный курс", "Course"],
    "Bir martalik": ["Разово", "One-off"],
    "Sayt": ["Сайт", "Website"],
    "1 oylik obuna": ["Подписка на 1 месяц", "1-month plan"],
    "1 yillik obuna": ["Подписка на 1 год", "1-year plan"],
    "Mashhur": ["Популярно", "Popular"],
    "Tanlash": ["Выбрать", "Choose"],
    "Natija:": ["Результат:", "Result:"],
    "Post yoki slayd — 1 ish kuni, video — 1–2 ish kuni, vizitka yoki menyu sayt — 2–3 ish kuni, katta sayt — 7–14 ish kuni. Muddat barcha kerakli materiallar olingan kundan boshlab hisoblanadi.": ["Пост или слайды — 1 рабочий день, видео — 1–2 рабочих дня, сайт-визитка или меню — 2–3 рабочих дня, большой сайт — 7–14 рабочих дней. Срок считается со дня получения всех нужных материалов.", "Post or slides — 1 working day, video — 1–2 working days, business card or menu site — 2–3 working days, full website — 7–14 working days. The timeline starts from the day all the needed materials are received."],
    "To'lov qanday qilinadi?": ["Как происходит оплата?", "How does payment work?"],
    "Bir martalik buyurtmalarda 50% oldindan, qolgan 50% ish tayyor bo'lganda. Obuna va kurs uchun to'lov oldindan qilinadi. Ish hali boshlanmagan bo'lsa, to'lov to'liq qaytariladi.": ["Для разовых заказов — 50% вперёд, остальные 50% после готовности работы. Подписка и курс оплачиваются заранее. Если работа ещё не начата, оплата возвращается полностью.", "For one-off orders, 50% upfront and the remaining 50% when the work is ready. Subscriptions and the course are paid in advance. If work has not started yet, the payment is fully refunded."],
    "Darhol yozish": ["Написать сейчас", "Message now"],
    "Qo'ng'iroq": ["Позвонить", "Call"],
    "yoki formani to'ldiring — o'zim bog'lanaman": ["или заполните форму — я сам свяжусь с вами", "or fill in the form — I'll get back to you"],
    "1 ish kuni": ["1 рабочий день", "1 working day"],
    "1–2 ish kuni": ["1–2 рабочих дня", "1–2 working days"],
    "2–3 ish kuni": ["2–3 рабочих дня", "2–3 working days"],
    "7–14 ish kuni": ["7–14 рабочих дней", "7–14 working days"],
    "1–14 ish kuni (ish turiga qarab)": ["1–14 рабочих дней (зависит от задачи)", "1–14 working days (depends on the task)"],
    "1 oy, 12 ta dars": ["1 месяц, 12 уроков", "1 month, 12 lessons"],
    "Joylashga tayyor reels yoki reklama videosi": ["Готовый к публикации reels или рекламный ролик", "A reel or ad video ready to post"],
    "Telefonda chiroyli ochiladigan, mijoz bir bosishda qo'ng'iroq qiladigan sayt": ["Сайт, который красиво открывается на телефоне, а клиент звонит в одно касание", "A site that looks great on phones, where customers call you in one tap"],
    "Brendingiz ranglarida tayyor slaydlar va postlar": ["Готовые слайды и посты в цветах вашего бренда", "Ready slides and posts in your brand colours"],
    "Buyurtma, admin panel va backend bilan to'liq ishlaydigan sayt": ["Полноценный сайт с заказами, админ-панелью и бэкендом", "A fully working site with orders, an admin panel and a backend"],
    "Bir oy davomida kontent va sayt ishlari bir joyda": ["Контент и сайты на месяц — в одном месте", "A month of content and website work in one place"],
    "Butun yil kontent va saytlar — bitta to'lov bilan": ["Контент и сайты на весь год — одним платежом", "A whole year of content and websites — in one payment"],
    "AI vositalari bilan mustaqil ishlay olasiz": ["Вы сможете самостоятельно работать с AI-инструментами", "You will be able to work with AI tools on your own"],
    "Videolarni ko'rish →": ["Смотреть видео →", "Watch the videos →"],
    "Hoziroq sinab ko'rish →": ["Попробовать сейчас →", "Try it now →"],
    "Namunani ko'rish →": ["Смотреть пример →", "See an example →"],
    "Claude Video": ["Claude Video", "Claude Video"],
    "Claude yordamida tayyorlangan bitta sifatli video — reklama, reels yoki tushuntirish uchun.": ["Одно качественное видео, созданное с Claude, — для рекламы, Reels или объяснения.", "One quality video made with Claude — for ads, Reels or explainers."],
    "Reklama, reels yoki tushuntirish videosi": ["Рекламное, Reels или обучающее видео", "Ad, Reels or explainer video"],
    "Ssenariy va matn AI yordamida": ["Сценарий и текст с помощью AI", "Script and text written with AI"],
    "Telegram orqali topshiriladi": ["Передаётся через Telegram", "Delivered via Telegram"],
    "Vizitka va Menyu sayt": ["Сайт-визитка и меню", "Business card & menu site"],
    "Bir sahifali vizitka sayt yoki kafe, restoran va do'kon uchun menyu sayt.": ["Одностраничный сайт-визитка или сайт-меню для кафе, ресторана и магазина.", "A one-page business card site or a menu site for a café, restaurant or shop."],
    "Bir sahifali chiroyli sayt": ["Красивый одностраничный сайт", "A beautiful one-page site"],
    "Telefon va kompyuterga moslashgan": ["Адаптирован для телефона и компьютера", "Works on phone and desktop"],
    "Telefon, Telegram va Instagram havolalari": ["Ссылки на телефон, Telegram и Instagram", "Phone, Telegram and Instagram links"],
    "Slayd va Postlar": ["Слайды и посты", "Slides & posts"],
    "Taqdimot slaydlari va ijtimoiy tarmoqlar uchun tayyor dizayndagi postlar.": ["Слайды для презентаций и готовые посты для соцсетей.", "Presentation slides and ready-designed social media posts."],
    "Taqdimot slaydlari": ["Слайды для презентаций", "Presentation slides"],
    "Instagram va Telegram uchun postlar": ["Посты для Instagram и Telegram", "Posts for Instagram and Telegram"],
    "Brendingiz ranglarida": ["В цветах вашего бренда", "In your brand colors"],
    "Katta haqiqiy sayt": ["Большой полноценный сайт", "Full website"],
    "Ko'p sahifali to'liq sayt: buyurtma formasi, admin panel va backend bilan.": ["Многостраничный сайт: форма заказа, админ-панель и бэкенд.", "A multi-page website with an order form, admin panel and backend."],
    "Bir nechta sahifa": ["Несколько страниц", "Multiple pages"],
    "Buyurtma yoki aloqa formasi": ["Форма заказа или связи", "Order or contact form"],
    "Admin panel va backend": ["Админ-панель и бэкенд", "Admin panel and backend"],
    "Internetga joylashda yordam": ["Помощь с публикацией в интернете", "Help putting it online"],
    "Pro": ["Pro", "Pro"], "Max": ["Max", "Max"],
    "Bir oy ichida 15 tagacha video, slayd va post yasatishingiz mumkin.": ["До 15 видео, слайдов и постов в месяц.", "Up to 15 videos, slides and posts a month."],
    "15 tagacha video, slayd va post": ["До 15 видео, слайдов и постов", "Up to 15 videos, slides and posts"],
    "Vizitka va menyu saytlar": ["Сайты-визитки и меню", "Business card & menu sites"],
    "Katta haqiqiy saytlar": ["Большие полноценные сайты", "Full websites"],
    "Oyiga 1 ta katta sayt": ["1 большой сайт в месяц", "1 full website a month"],
    "Yiliga 2 tagacha katta sayt": ["До 2 больших сайтов в год", "Up to 2 full websites a year"],
    "Butun yil davomida cheksiz video, slayd va postlar — bir vaqtda 2 tagacha buyurtma.": ["Безлимитные видео, слайды и посты весь год — до 2 заказов одновременно.", "Unlimited videos, slides and posts all year — up to 2 orders at a time."],
    "Cheksiz video, slayd va postlar": ["Безлимитные видео, слайды и посты", "Unlimited videos, slides and posts"],
    "Butun yil davomida": ["Весь год", "All year long"],
    "AI LEGENDS": ["AI LEGENDS", "AI LEGENDS"],
    "AI bilan ishlashni shaxsan o'zim o'rgataman — amaliy darslar va qo'llab-quvvatlash.": ["Лично научу работать с AI — практические уроки и поддержка.", "I personally teach you to work with AI — hands-on lessons and support."],
    "Amaliy darslar": ["Практические уроки", "Hands-on lessons"],
    "Claude va AI vositalari bilan ishlash": ["Работа с Claude и AI-инструментами", "Working with Claude and AI tools"],
    "Shaxsiy qo'llab-quvvatlash": ["Личная поддержка", "Personal support"],
    "Hisoblab ko'ring": ["Рассчитайте стоимость", "Estimate the cost"],
    "Kerakli xizmatlar sonini tanlang — umumiy narx darhol chiqadi.": ["Выберите количество услуг — итоговая цена появится сразу.", "Pick how many of each service you need — the total appears instantly."],
    "Jami": ["Итого", "Total"],
    "Shu buyurtmani yuborish": ["Отправить этот заказ", "Send this order"],
    "Avval kamida bitta xizmatni tanlang.": ["Сначала выберите хотя бы одну услугу.", "Pick at least one service first."],
    "💡 Bu xizmatlar Pro tarifga kiradi": ["💡 Эти услуги входят в тариф Pro", "💡 These services are included in the Pro plan"],
    "kamaytirish": ["уменьшить", "decrease"], "ko'paytirish": ["увеличить", "increase"],

    // Jarayon, afzalliklar
    "Qanday ishlaymiz": ["Как мы работаем", "How it works"],
    "Buyurtmadan tayyor ishgacha to'rtta oddiy qadam.": ["Четыре простых шага от заказа до результата.", "Four simple steps from order to result."],
    "Buyurtma qoldirasiz": ["Вы оставляете заказ", "You place an order"],
    "Saytdagi formani to'ldirasiz yoki Telegramga yozasiz.": ["Заполняете форму на сайте или пишете в Telegram.", "Fill in the form on the site or message me on Telegram."],
    "Kelishib olamiz": ["Договариваемся", "We agree on details"],
    "Telegramda nima kerakligini, muddat va tafsilotlarni aniqlaymiz.": ["В Telegram уточняем задачу, сроки и детали.", "On Telegram we clarify what you need, the deadline and details."],
    "Tayyorlayman": ["Я делаю работу", "I create it"],
    "Claude va boshqa vositalar yordamida video, post yoki saytni yarataman.": ["Создаю видео, пост или сайт с помощью Claude и других инструментов.", "I make the video, post or website with Claude and other tools."],
    "Topshiraman": ["Сдаю результат", "I deliver"],
    "Tayyor ishni yuboraman, kerak bo'lsa tuzatishlar kiritaman.": ["Отправляю готовую работу и при необходимости вношу правки.", "I send the finished work and make revisions if needed."],
    "Nega aynan men": ["Почему я", "Why me"],
    "AI tezligi": ["Скорость AI", "AI speed"],
    "Claude bilan ishlaganim uchun kontent va saytlar odatdagidan ancha tez tayyor bo'ladi.": ["Благодаря Claude контент и сайты готовы гораздо быстрее обычного.", "Because I work with Claude, content and sites are ready much faster than usual."],
    "Hamyonbop narx": ["Доступная цена", "Affordable"],
    "Bitta video 25 000 so'm, vizitka sayt 30 000 so'm. Ko'p buyurtma uchun obuna foydaliroq.": ["Одно видео — 25 000 сум, сайт-визитка — 30 000 сум. Для частых заказов выгоднее подписка.", "One video is 25,000 UZS, a business card site is 30,000 UZS. A subscription pays off for frequent orders."],
    "Telefonga moslashgan": ["Удобно на телефоне", "Mobile-friendly"],
    "Har bir sayt telefonda ham, kompyuterda ham chiroyli ko'rinadi.": ["Каждый сайт красиво выглядит и на телефоне, и на компьютере.", "Every site looks great on both phones and computers."],
    "O'zbek tilida": ["На узбекском", "In Uzbek"],
    "Hamma narsani o'zbek tilida tushuntiraman va Telegramda doim aloqadaman.": ["Всё объясняю на узбекском и всегда на связи в Telegram.", "I explain everything in Uzbek and I'm always reachable on Telegram."],

    // Ishlar
    "Ishlarimdan namunalar": ["Примеры работ", "Work samples"],
    "Claude bilan yasaganlarim": ["Что я сделал с Claude", "Made with Claude"],
    "Instagram uchun Reels videolar — ssenariy, ovoz va montaj AI yordamida. Videoni bossangiz, to'xtaydi.": ["Reels для Instagram — сценарий, озвучка и монтаж с помощью AI. Нажмите на видео, чтобы остановить.", "Instagram Reels — script, voice and editing done with AI. Tap a video to pause it."],
    "Siz bilmagan web saytlar": ["Сайты, о которых вы не знали", "Websites you didn't know"],
    "60 soniyada CSS": ["CSS за 60 секунд", "CSS in 60 seconds"],
    "AI va kod": ["AI и код", "AI and code"],
    "Men va loyihalarim": ["Я и мои проекты", "Me and my projects"],
    "Birinchi saytim va hozirgisi": ["Мой первый сайт и нынешний", "My first site vs. now"],
    "Chiziqni suring: chapda birinchi versiya, o'ngda hozirgi AHdigital — yangi dizayn, backend, admin panel va AI bot bilan.": ["Двигайте ползунок: слева первая версия, справа нынешний AHdigital — новый дизайн, бэкенд, админ-панель и AI-бот.", "Drag the slider: the first version on the left, today's AHdigital on the right — new design, backend, admin panel and an AI bot."],
    "Oldin va hozirni solishtirish": ["Сравнить до и сейчас", "Compare before and now"],
    "Hozirgi AHdigital sayti": ["Нынешний сайт AHdigital", "Current AHdigital site"],
    "Birinchi versiya": ["Первая версия", "First version"],
    "Reels: dizaynerlar uchun 3 ta bepul sayt": ["Reels: 3 бесплатных сайта для дизайнеров", "Reels: 3 free sites for designers"],
    "Reels: flexbox bilan markazga qo'yish": ["Reels: центрирование с flexbox", "Reels: centering with flexbox"],
    "Reels: AI limiti tugadi hazili": ["Reels: шутка про лимит AI", "Reels: the AI limit joke"],
    "Reels: JavaScript yo'lim": ["Reels: мой путь в JavaScript", "Reels: my JavaScript journey"],

    // Men haqimda
    "Salom, men Abdulhamid.": ["Привет, я Абдулхамид.", "Hi, I'm Abdulhamid."],
    "AI vositalari bilan kontent va saytlar yarataman: Claude yordamida video, taqdimot slaydlari, ijtimoiy tarmoq postlari va web saytlar. AI LEGENDS kursida esa shu bilimlarni amaliy tarzda o'rgataman.": ["Создаю контент и сайты с помощью AI: видео, слайды, посты для соцсетей и веб-сайты с Claude. А на курсе AI LEGENDS учу этому на практике.", "I create content and websites with AI tools: videos, presentation slides, social posts and websites made with Claude. In the AI LEGENDS course I teach these skills hands-on."],
    "CoddyCamp o'quv markazining Junior guruhida dasturiy muhandislikni o'rganyapman. Scratch, Pictoblox, AI, Figma, HTML, CSS va Bootstrap'ni o'zlashtirdim, hozir esa JavaScript'ni o'rganyapman. Maqsadim — Software Engineer bo'lish.": ["Изучаю программную инженерию в группе Junior учебного центра CoddyCamp. Освоил Scratch, Pictoblox, AI, Figma, HTML, CSS и Bootstrap, сейчас изучаю JavaScript. Моя цель — стать Software Engineer.", "I study software engineering in the Junior group at CoddyCamp. I've learned Scratch, Pictoblox, AI, Figma, HTML, CSS and Bootstrap, and I'm now learning JavaScript. My goal is to become a Software Engineer."],
    "Har bir mijozning vaqtini tejash va AI'dan haqiqiy natija olishiga yordam berishni xohlayman.": ["Хочу помогать каждому клиенту экономить время и получать реальный результат от AI.", "I want to help every client save time and get real results from AI."],
    "JavaScript · hozir": ["JavaScript · сейчас", "JavaScript · now"],
    "Abdulhamid ishlamoqda": ["Абдулхамид за работой", "Abdulhamid at work"],

    // Buyurtma formasi
    "Buyurtma": ["Заказ", "Order"],
    "Buyurtma qoldiring": ["Оставьте заказ", "Place an order"],
    "Formani to'ldiring — men siz bilan tez orada bog'lanaman.": ["Заполните форму — я скоро свяжусь с вами.", "Fill in the form — I'll get back to you soon."],
    "Ismingiz": ["Ваше имя", "Your name"],
    "Telefon yoki Telegram": ["Телефон или Telegram", "Phone or Telegram"],
    "Xizmat": ["Услуга", "Service"],
    "Xizmatni tanlang": ["Выберите услугу", "Choose a service"],
    "Izoh (ixtiyoriy)": ["Комментарий (необязательно)", "Comment (optional)"],
    "Buyurtmani yuborish": ["Отправить заказ", "Send order"],
    "Masalan: Aziz": ["Например: Азиз", "e.g. Aziz"],
    "+998 90 123 45 67 yoki @username": ["+998 90 123 45 67 или @username", "+998 90 123 45 67 or @username"],
    "Nima kerakligini qisqacha yozing": ["Кратко опишите, что нужно", "Briefly describe what you need"],
    "Yuborilmoqda...": ["Отправляем...", "Sending..."],
    "Ismingiz, telefon yoki Telegram va xizmatni to'ldiring.": ["Укажите имя, телефон или Telegram и услугу.", "Please fill in your name, phone or Telegram, and a service."],
    "Rahmat! Buyurtmangiz qabul qilindi. Telegram'da tasdiqlang — bot 1 daqiqada yozadi:": ["Спасибо! Заказ принят. Подтвердите его в Telegram — бот напишет через минуту:", "Thank you! Your order is in. Confirm it on Telegram — the bot will message you within a minute:"],
    "Rahmat! Buyurtmangiz qabul qilindi. Tez orada bog'lanaman.": ["Спасибо! Заказ принят. Скоро свяжусь с вами.", "Thank you! Your order is in. I'll be in touch soon."],
    "Telegram'da tasdiqlash →": ["Подтвердить в Telegram →", "Confirm on Telegram →"],
    "💳 To'lash →": ["💳 Оплатить →", "💳 Pay →"],
    "💳 To'lash": ["💳 Оплатить", "💳 Pay"],
    "To'lash": ["Оплатить", "Pay"],
    "Ma'lumotlaringiz saqlandi — endi «Buyurtmani yuborish»ni bosing.": ["Данные сохранены — теперь нажмите «Отправить заказ».", "Your details are saved — now press “Send order”."],
    "AI yordamchidan foydalanish uchun avval kiring (Telegram yoki Google).": ["Чтобы пользоваться AI-помощником, сначала войдите (Telegram или Google).", "Please sign in first to use the AI assistant (Telegram or Google)."],
    "Buyurtma berish uchun avval kiring (Telegram yoki Google).": ["Чтобы оформить заказ, сначала войдите (Telegram или Google).", "Please sign in first to place an order (Telegram or Google)."],
    "Ismingizni kiriting (2–60 ta harf).": ["Введите имя (2–60 символов).", "Enter your name (2–60 characters)."],
    "Telefon raqam yoki Telegram username kiriting.": ["Введите номер телефона или Telegram username.", "Enter a phone number or Telegram username."],
    "Xizmatni tanlang.": ["Выберите услугу.", "Choose a service."],
    "Izoh 1000 ta belgidan oshmasin.": ["Комментарий — не более 1000 символов.", "Comments are limited to 1000 characters."],
    "Juda ko'p urinish. Bir daqiqadan keyin qayta urinib ko'ring.": ["Слишком много попыток. Повторите через минуту.", "Too many attempts. Please try again in a minute."],
    "Xatolik yuz berdi.": ["Произошла ошибка.", "Something went wrong."],

    // FAQ
    "Ko'p beriladigan savollar": ["Частые вопросы", "Frequently asked questions"],
    "Buyurtma qancha vaqtda tayyor bo'ladi?": ["Сколько времени занимает заказ?", "How long does an order take?"],
    "Bu ish hajmiga bog'liq. Buyurtma berganingizdan keyin Telegramda aniq muddatni aytaman.": ["Зависит от объёма. После заказа я назову точный срок в Telegram.", "It depends on the scope. After you order, I'll give you an exact deadline on Telegram."],
    "Vizitka sayt va katta sayt farqi nimada?": ["Чем сайт-визитка отличается от большого сайта?", "What's the difference between a business card site and a full website?"],
    "Vizitka yoki menyu sayt — bitta sahifa: siz haqingizda ma'lumot, narxlar yoki menyu va aloqa havolalari. Katta sayt esa bir nechta sahifadan iborat, unda buyurtma formasi, admin panel va backend bo'ladi.": ["Сайт-визитка или меню — одна страница: информация о вас, цены или меню и контакты. Большой сайт состоит из нескольких страниц, в нём есть форма заказа, админ-панель и бэкенд.", "A business card or menu site is one page: info about you, prices or a menu, and contact links. A full website has several pages, an order form, an admin panel and a backend."],
    "Pro va Max obunasiga nimalar kiradi?": ["Что входит в подписки Pro и Max?", "What's included in Pro and Max?"],
    "Pro (oyiga 1 000 000 so'm) — 15 tagacha video, slayd va post, vizitka va menyu saytlar hamda oyiga 1 ta katta sayt. Max (yiliga 7 000 000 so'm) — butun yil davomida cheksiz video, slayd va postlar, vizitka va menyu saytlar hamda yiliga 2 tagacha katta sayt. Batafsil:": ["Pro (1 000 000 сум в месяц) — до 15 видео, слайдов и постов, сайты-визитки и меню, а также 1 большой сайт в месяц. Max (7 000 000 сум в год) — безлимитные видео, слайды и посты весь год, сайты-визитки и меню, а также до 2 больших сайтов в год. Подробнее:", "Pro (1,000,000 UZS a month) — up to 15 videos, slides and posts, business card and menu sites, plus 1 full website a month. Max (7,000,000 UZS a year) — unlimited videos, slides and posts all year, business card and menu sites, plus up to 2 full websites a year. Details:"],
    "Saytni internetga joylashga yordam berasizmi?": ["Поможете опубликовать сайт в интернете?", "Will you help put the site online?"],
    "Ha. Katta sayt buyurtma qilsangiz, uni internetga joylashda ham yordam beraman.": ["Да. Если вы заказываете большой сайт, я помогу и с публикацией.", "Yes. If you order a full website, I'll also help you put it online."],
    "AI LEGENDS kursi kimlar uchun?": ["Для кого курс AI LEGENDS?", "Who is the AI LEGENDS course for?"],
    "AI bilan ishlashni amaliy o'rganmoqchi bo'lgan har bir kishi uchun. Darslarni shaxsan o'zim o'taman.": ["Для всех, кто хочет научиться работать с AI на практике. Уроки веду лично.", "For anyone who wants to learn to work with AI in practice. I teach the lessons myself."],

    // Aloqa
    "Bog'laning": ["Свяжитесь со мной", "Get in touch"],
    "Savollar yoki buyurtma uchun qulay usulni tanlang — tez javob beraman.": ["Выберите удобный способ для вопросов или заказа — отвечу быстро.", "Pick the easiest way to ask a question or order — I reply fast."],

    // Chat
    "Savol bering": ["Задать вопрос", "Ask a question"],
    "AHdigital yordamchisi": ["Помощник AHdigital", "AHdigital assistant"],
    "Claude (AI) javob beradi · odam emas": ["Отвечает Claude (AI) · не человек", "Answered by Claude (AI) · not a human"],
    "AI yordamchi": ["AI-помощник", "AI assistant"],
    "Savolingiz": ["Ваш вопрос", "Your question"],
    "Savolingizni yozing...": ["Напишите вопрос...", "Type your question..."],
    "Yuborish": ["Отправить", "Send"],
    "Vizitka sayt qancha turadi?": ["Сколько стоит сайт-визитка?", "How much is a business card site?"],
    "Pro tarifga nima kiradi?": ["Что входит в тариф Pro?", "What's in the Pro plan?"],
    "Qancha vaqtda tayyor bo'ladi?": ["За сколько будет готово?", "How long will it take?"],
    "Salom! 👋 Men AHdigital'ning AI yordamchisiman. Narxlar, muddat yoki saytlar haqida so'rang.": ["Привет! 👋 Я AI-помощник AHdigital. Спрашивайте о ценах, сроках или сайтах.", "Hi! 👋 I'm AHdigital's AI assistant. Ask me about prices, timing or websites."],
    "Yozmoqda…": ["Печатает…", "Typing…"],
    "Internet bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring.": ["Нет связи с интернетом. Попробуйте позже.", "Couldn't connect. Please try again later."],

    // Taqdimot sahifasi (welcome)
    "AHdigital — AI bilan sayt, video va dizayn": ["AHdigital — сайты, видео и дизайн с AI", "AHdigital — websites, video & design with AI"],
    "Qanday ishlaydi": ["Как это работает", "How it works"],
    "Yangi": ["Новый", "New"],
    "AI LEGENDS kursi boshlanmoqda": ["Стартует курс AI LEGENDS", "AI LEGENDS course is starting"],
    "G'oyangizni": ["Превращаем идею в реальность с помощью", "We turn your idea into reality with"],
    "AI": ["AI", "AI"],
    "bilan haqiqatga aylantiramiz": ["", ""],
    "Saytlar, Reels videolar, slayd va postlar — Claude yordamida tez, chiroyli va arzon. Bitta tugma bilan buyurtma bering.": ["Сайты, Reels, слайды и посты — с Claude быстро, красиво и недорого. Закажите в один клик.", "Websites, Reels, slides and posts — fast, beautiful and affordable with Claude. Order with one tap."],
    "Hoziroq boshlash →": ["Начать сейчас →", "Get started →"],
    "Xizmatlarni ko'rish": ["Смотреть услуги", "See services"],
    "Telegram yoki Google bilan — 5 soniyada, parolsiz": ["Через Telegram или Google — за 5 секунд, без пароля", "With Telegram or Google — 5 seconds, no password"],
    "so'mdan": ["сум", "UZS"],
    "boshlanadi": ["минимальная цена", "starting price"],
    "Vizitka saytlar": ["Сайты-визитки", "Business card sites"], "Reels videolar": ["Reels-видео", "Reels videos"], "Menyu saytlar": ["Сайты-меню", "Menu sites"], "Slayd va postlar": ["Слайды и посты", "Slides & posts"], "Katta saytlar": ["Большие сайты", "Full websites"],
    "Biznesingizga kerak bo'lgan hammasi": ["Всё, что нужно вашему бизнесу", "Everything your business needs"],
    "Bir martalik buyurtma, oylik obuna yoki o'zingiz o'rganish uchun kurs — tanlov sizda.": ["Разовый заказ, месячная подписка или курс, чтобы научиться самому, — выбор за вами.", "A one-off order, a monthly plan or a course to learn it yourself — your choice."],
    "Saytlar": ["Сайты", "Websites"],
    "Vizitka, kafe va do'kon uchun menyu sayt yoki admin panelli katta sayt.": ["Визитка, сайт-меню для кафе и магазина или большой сайт с админ-панелью.", "Business card sites, menu sites for cafés and shops, or a full site with an admin panel."],
    "Video va dizayn": ["Видео и дизайн", "Video & design"],
    "Reklama va Reels videolar, taqdimot slaydlari, Instagram va Telegram postlari.": ["Рекламные и Reels-видео, слайды, посты для Instagram и Telegram.", "Ad and Reels videos, presentation slides, Instagram and Telegram posts."],
    "AI LEGENDS kursi": ["Курс AI LEGENDS", "AI LEGENDS course"],
    "AI bilan ishlashni o'zingiz o'rganing: 12 dars, 3 yosh guruhi, uy ishlari.": ["Научитесь работать с AI сами: 12 уроков, 3 возрастные группы, домашние задания.", "Learn to work with AI yourself: 12 lessons, 3 age groups, homework."],
    "Barcha narxlar va xizmatlar →": ["Все цены и услуги →", "All prices & services →"],
    "1 kun": ["1 день", "1 day"],
    "kichik ishlar muddati": ["срок для небольших задач", "turnaround for small jobs"],
    "bepul tuzatish": ["бесплатные правки", "free revisions"],
    "kurs guruhi": ["группы курса", "course groups"],
    "Uch qadam — va ish tayyor": ["Три шага — и готово", "Three steps and it's done"],
    "Ro'yxatdan o'ting": ["Зарегистрируйтесь", "Sign up"],
    "Telegram yoki Google bilan bir bosishda. Parol eslab qolish shart emas.": ["Через Telegram или Google в одно нажатие. Пароль не нужен.", "One tap with Telegram or Google. No password to remember."],
    "Xizmatni tanlang ": ["Выберите услугу", "Choose a service"],
    "Nima kerakligini yozing — Telegram'da bog'lanib, aniq kelishib olamiz.": ["Напишите, что нужно, — свяжемся в Telegram и всё обсудим.", "Tell me what you need — we'll connect on Telegram and agree on details."],
    "Natijani oling": ["Получите результат", "Get the result"],
    "Tayyor ishni ko'rasiz, kerak bo'lsa tuzatamiz. Holatini kabinetda kuzatasiz.": ["Посмотрите готовую работу, при необходимости поправим. Статус — в кабинете.", "You review the finished work, we revise if needed. Track the status in your account."],
    "Boshlashga tayyormisiz?": ["Готовы начать?", "Ready to start?"],
    "Hisob ochish bepul. Kirgach buyurtma berasiz va uning holatini kabinetda kuzatasiz.": ["Регистрация бесплатна. После входа вы оформляете заказ и следите за ним в кабинете.", "Creating an account is free. Once signed in, you can order and track it in your account."],
    "Menda hisob bor": ["У меня есть аккаунт", "I have an account"],
    "© 2026 AHdigital · Abdulhamid Xamidullayev": ["© 2026 AHdigital · Абдулхамид Хамидуллаев", "© 2026 AHdigital · Abdulhamid Xamidullayev"],
    "Saytga o'tish": ["Перейти на сайт", "Go to site"],
    "Saytga o'tish →": ["Перейти на сайт →", "Go to site →"],

    // Kirish / kabinet
    "Kabinet — AHdigital": ["Кабинет — AHdigital", "Account — AHdigital"],
    "Shaxsiy kabinet": ["Личный кабинет", "My account"],
        "Buyurtmalaringiz va ularning holatini kuzatish uchun Telegram, Google yoki email orqali kiring — parol kerak emas.": ["Чтобы следить за заказами и их статусом, войдите через Telegram, Google или email — пароль не нужен.", "Sign in with Telegram, Google or email to track your orders and their status — no password needed."],
    "yoki email orqali": ["или через email", "or with email"],
    "Email manzil": ["Email", "Email address"],
    "Kod yuborish": ["Отправить код", "Send code"],
    "Emailga kelgan 6 xonali kod": ["6-значный код из письма", "6-digit code from the email"],
    "Xat kelmasa, «Spam» papkasini tekshiring.": ["Если письма нет, проверьте «Спам».", "No email? Check your Spam folder."],
    "Boshqa email": ["Другой email", "Use another email"],
    "Birinchi marta kelyapsizmi?": ["Впервые здесь?", "First time here?"],
    "Hisobingiz bormi?": ["Уже есть аккаунт?", "Already have an account?"],
    "· Ikkalasi bir xil ishlaydi: birinchi kirishda hisob avtomatik ochiladi.": ["· Оба работают одинаково: аккаунт создаётся при первом входе.", "· Both work the same way: your account is created on first sign-in."],
    "Buyurtmalarim": ["Мои заказы", "My orders"],
    "Hozircha buyurtma yo'q. Buyurtma berganda Telegram username'ingizni yozing yoki bot tugmasini bosing — shunda bu yerda ko'rinadi.": ["Заказов пока нет. При заказе укажите свой Telegram username или нажмите кнопку бота — тогда он появится здесь.", "No orders yet. When ordering, enter your Telegram username or tap the bot button — then it will show up here."],
    "Yangi buyurtma": ["Новый заказ", "New order"],
    "Telegram orqali kirgansiz": ["Вы вошли через Telegram", "Signed in with Telegram"],
    "Yangi ": ["Новый", "New"],
    "Tasdiqlandi": ["Подтверждён", "Confirmed"], "Jarayonda": ["В работе", "In progress"], "Bajarildi": ["Выполнен", "Done"], "Bekor qilindi": ["Отменён", "Cancelled"],
    "Kirish hozircha sozlanmagan.": ["Вход пока не настроен.", "Sign-in isn't set up yet."],
    "Kirib bo'lmadi. Qayta urinib ko'ring.": ["Не удалось войти. Попробуйте ещё раз.", "Couldn't sign in. Please try again."],
    "Telegram tasdig'i noto'g'ri yoki eskirgan. Qayta urinib ko'ring.": ["Подтверждение Telegram неверно или устарело. Попробуйте ещё раз.", "The Telegram confirmation is invalid or expired. Please try again."],
    "Google tasdig'i noto'g'ri yoki eskirgan. Qayta urinib ko'ring.": ["Подтверждение Google неверно или устарело. Попробуйте ещё раз.", "The Google confirmation is invalid or expired. Please try again."],
    "Email manzilni to'g'ri yozing.": ["Введите корректный email.", "Enter a valid email address."],
    "Kod yuborib bo'lmadi.": ["Не удалось отправить код.", "Couldn't send the code."],
    "6 xonali kodni kiriting.": ["Введите 6-значный код.", "Enter the 6-digit code."],
    "Kod noto'g'ri. Qayta tekshiring.": ["Неверный код. Проверьте ещё раз.", "Wrong code. Please check it."],
    "Kod eskirgan. Yangi kod so'rang.": ["Код устарел. Запросите новый.", "The code has expired. Request a new one."],
    "Kod yaqinda yuborildi. 1 daqiqadan keyin qayta so'rang.": ["Код только что отправлен. Повторите через минуту.", "A code was just sent. Try again in a minute."],
    "Juda ko'p noto'g'ri urinish. Yangi kod so'rang.": ["Слишком много неверных попыток. Запросите новый код.", "Too many wrong attempts. Request a new code."],
    "Xat yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring.": ["Не удалось отправить письмо. Попробуйте позже.", "Couldn't send the email. Please try again shortly."],

    // Portfolio
    "Abdulhamid · Portfolio": ["Абдулхамид · Портфолио", "Abdulhamid · Portfolio"],
    "O'quv yo'li": ["Путь обучения", "Learning path"],
    "Loyihalar": ["Проекты", "Projects"],
    "JS lab": ["JS-лаборатория", "JS lab"],
    "Xamidullayev": ["Хамидуллаев", "Xamidullayev"],
    "Junior dasturchi": ["Junior-разработчик", "Junior developer"],
    "CoddyCamp o'quv markazining Junior guruhida dasturiy muhandislikni o'rganyapman. AI, dizayn va web dasturlash bilan ishlayman. Hozir JavaScript'ni o'rganyapman.": ["Изучаю программную инженерию в группе Junior учебного центра CoddyCamp. Работаю с AI, дизайном и веб-разработкой. Сейчас изучаю JavaScript.", "I study software engineering in the Junior group at CoddyCamp. I work with AI, design and web development, and I'm currently learning JavaScript."],
    "Loyihalarni ko'rish": ["Смотреть проекты", "View projects"],
    "\"Junior dasturchi\"": ["\"Junior-разработчик\"", "\"Junior developer\""],
    "Men haqimda JavaScript obyekti ko'rinishida": ["Обо мне в виде объекта JavaScript", "About me as a JavaScript object"],
    "// 01 · o'quv yo'li": ["// 01 · путь обучения", "// 01 · learning path"],
    "Qanday o'rganib kelyapman": ["Как я учусь", "How I've been learning"],
    "Har bir qadam keyingisiga poydevor bo'ldi. Tartib — men o'rgangan ketma-ketlik.": ["Каждый шаг стал основой для следующего. Порядок — в том, как я учился.", "Each step became the foundation for the next. The order is how I learned them."],
    "✓ o'rgandim": ["✓ изучил", "✓ learned"],
    "● hozir": ["● сейчас", "● now"],
    "// 02 · loyihalar": ["// 02 · проекты", "// 02 · projects"],
    "// ishlayapti": ["// работает", "// live"],
    "AHdigital sayti": ["Сайт AHdigital", "AHdigital website"],
    "Xizmatlarim sayti: narxlar, buyurtma formasi, admin panel va Node.js backend.": ["Сайт моих услуг: цены, форма заказа, админ-панель и бэкенд на Node.js.", "My services site: prices, an order form, an admin panel and a Node.js backend."],
    "Saytni ochish →": ["Открыть сайт →", "Open site →"],
    "// xizmat": ["// услуга", "// service"],
    "AI kontent": ["AI-контент", "AI content"],
    "Claude yordamida mijozlar uchun video, taqdimot slaydlari va ijtimoiy tarmoq postlari.": ["Видео, слайды и посты для соцсетей для клиентов с помощью Claude.", "Videos, presentation slides and social posts for clients, made with Claude."],
    "Narxlarni ko'rish →": ["Посмотреть цены →", "See prices →"],
    "// js mashq": ["// практика js", "// js practice"],
    "Narx kalkulyatori": ["Калькулятор цен", "Price calculator"],
    "Saytdagi narxlar ro'yxatini olib, tanlangan xizmatlar summasini hisoblaydi.": ["Берёт цены с сайта и считает сумму выбранных услуг.", "Takes the site's price list and adds up the selected services."],
    "massiv": ["массив", "array"],
    "Sinab ko'rish →": ["Попробовать →", "Try it →"],
    "// tez orada": ["// скоро", "// coming soon"],
    "Keyingi loyiha": ["Следующий проект", "Next project"],
    "JavaScript bilan yangi loyiha ustida ishlayapman. Tayyor bo'lgach shu yerda paydo bo'ladi.": ["Работаю над новым проектом на JavaScript. Когда будет готов — появится здесь.", "I'm working on a new JavaScript project. It'll appear here when it's ready."],
    "// 03 · js lab": ["// 03 · js-лаборатория", "// 03 · js lab"],
    "JavaScript laboratoriyam": ["Моя JavaScript-лаборатория", "My JavaScript lab"],
    "Bu kalkulyator saytdagi haqiqiy narxlarni oladi va umumiy summani hisoblaydi. Xizmatlar sonini o'zgartirib ko'ring.": ["Этот калькулятор берёт реальные цены с сайта и считает общую сумму. Попробуйте изменить количество.", "This calculator pulls the real prices from the site and adds up the total. Try changing the quantities."],
    "jami": ["итого", "total"],
    "so'm": ["сум", "UZS"],
    "// 04 · ko'nikmalar": ["// 04 · навыки", "// 04 · skills"],
    "Vositalar": ["Инструменты", "Tools"],
    "Dizayn": ["Дизайн", "Design"],
    "AI vositalari": ["AI-инструменты", "AI tools"],
    "Boshlanish": ["Начало", "Basics"],
    "// 05 · aloqa": ["// 05 · контакты", "// 05 · contact"],
    "Birga ishlaymizmi?": ["Поработаем вместе?", "Shall we work together?"],
    "telefon": ["телефон", "phone"],
    "// salom, dunyo!": ["// привет, мир!", "// hello, world!"],
    "rol": ["role", "role"], "maktab": ["school", "school"], "hozir": ["now", "now"], "maqsad": ["goal", "goal"],
    "ism@gmail.com": ["name@gmail.com", "name@gmail.com"],
    "Kamaytirish": ["Уменьшить", "Decrease"],
    "Ko'paytirish": ["Увеличить", "Increase"]
  };
  // Qo'shimcha lug'atlar (i18n-app.js, i18n-shartlar.js) — i18n.js dan OLDIN ulanadi
  if (window.I18N_EXTRA) Object.assign(D, window.I18N_EXTRA);
  const PERIOD = { video: ["видео", "video"], sayt: ["сайт", "site"], buyurtma: ["заказ", "order"], oy: ["мес", "month"], yil: ["год", "year"] };
  const META = {
    "Claude yordamida video, slayd, postlar va saytlar — 25 000 so'mdan. Vizitka, menyu va katta saytlar. AI LEGENDS kursi.": ["Видео, слайды, посты и сайты с помощью Claude — от 25 000 сум. Сайты-визитки, меню и большие сайты. Курс AI LEGENDS.", "Videos, slides, posts and websites made with Claude — from 25,000 UZS. Business card, menu and full websites. AI LEGENDS course."]
  };

  const idx = lang === "ru" ? 0 : 1;
  const norm = s => s.replace(/\s+/g, " ").trim();
  const num = n => lang === "en" ? n.trim().replace(/ (?=\d{3}\b)/g, ",") : n.trim();

  function tr(raw) {
    if (lang === "uz" || !raw) return raw;
    const s = norm(raw);
    if (!s) return raw;
    const hit = D[s] || D[s + " "];
    if (hit) return hit[idx];
    let m;
    // "20 000 so'm / video"  va  "so'm / video"
    if ((m = s.match(/^([\d ]*\d)?\s*so'm \/ (\S+)$/))) {
      const per = PERIOD[m[2]] ? PERIOD[m[2]][idx] : m[2];
      return (m[1] ? num(m[1]) + " " : "") + (lang === "ru" ? "сум / " : "UZS / ") + per;
    }
    if ((m = s.match(/^([\d ]*\d) so'mdan$/))) return lang === "ru" ? `от ${m[1]} сум` : `from ${num(m[1])} UZS`;
    if ((m = s.match(/^([\d ]*\d) so'm$/))) return `${num(m[1])} ${lang === "ru" ? "сум" : "UZS"}`;
    if ((m = s.match(/^([\d ]*\d) so'm \/ oy$/))) return `${num(m[1])} ${lang === "ru" ? "сум / мес" : "UZS / month"}`;
    if ((m = s.match(/^1 oy ([\d ]*\d) so'm\. Abdulhamid bilan aniqlashtiring\.$/)))
      return lang === "ru" ? `1 месяц — ${m[1]} сум. Уточните у Абдулхамида.` : `1 month is ${num(m[1])} UZS. Check with Abdulhamid.`;
    // Boshidagi belgi yoki emoji: "📍 Manzil ..."
    if ((m = s.match(/^([^\p{L}\d"'/<]+)(\p{L}.*)$/u))) { const t = tr(m[2]); if (t !== m[2]) return m[1] + t; }
    // Qismlarga bo'lib tarjima: "A — B", "A · B", "A: B"
    for (const sep of [" — ", " · ", ": "]) {
      if (s.includes(sep)) {
        const parts = s.split(sep), out = parts.map(p => tr(p));
        if (out.some((p, i) => p !== parts[i])) return out.join(sep);
      }
    }
    return raw;
  }
  window.T = tr;
  window.I18N_LANG = lang;

  // ---------------- Sahifaga qo'llash ----------------
  const SKIP = "script,style,textarea,code.no-i18n,.chat-log,[data-no-i18n]";
  const ATTRS = ["placeholder", "aria-label", "alt", "title"];
  const done = new WeakSet();
  function fixText(n) {
    if (done.has(n)) return;
    const p = n.parentElement;
    if (!p || p.closest(SKIP)) return;
    const v = n.data, t = tr(v);
    done.add(n);
    if (t !== v) n.data = v.match(/^\s*/)[0] + t + v.match(/\s*$/)[0];
  }
  function fixEl(el) {
    if (el.closest && el.closest(SKIP.replace("textarea,", ""))) return;
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
    if (el.tagName === "OPTGROUP" && el.label) el.label = tr(el.label);
  }
  function walk(root) {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1) return;
    fixEl(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) n.nodeType === 3 ? fixText(n) : fixEl(n);
  }
  function fixHead() {
    const t = tr(document.title); if (t !== document.title) document.title = t;
    const md = document.querySelector('meta[name="description"]');
    if (md && META[md.content]) md.content = META[md.content][idx];
  }

  // ---------------- Til tanlash ----------------
  function mountSwitcher() {
    document.querySelectorAll("[data-lang-slot]").forEach(slot => {
      if (slot.firstChild) return;
      const sel = document.createElement("select");
      sel.className = "lang-select";
      sel.setAttribute("aria-label", "Til / Язык / Language");
      sel.setAttribute("data-no-i18n", "");
      LANGS.forEach(l => { const o = document.createElement("option"); o.value = l; o.textContent = l.toUpperCase(); o.title = LABEL[l]; if (l === lang) o.selected = true; sel.append(o); });
      sel.addEventListener("change", () => {
        try { localStorage.setItem("ahd-lang", sel.value); } catch {}
        const u = new URL(location.href); u.searchParams.delete("lang");
        location.replace(u.toString());
      });
      slot.append(sel);
    });
  }
  const css = document.createElement("style");
  // Caprasimo shriftida kirill harflari yo'q — ruscha harflar uchun Merriweather Black (OFL) ulanadi
  css.textContent = "@font-face{font-family:Caprasimo;src:url(/heading-cyrillic.woff2) format('woff2');font-weight:400;font-style:normal;font-display:swap;unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}" +
  ".lang-select{height:36px;padding:0 26px 0 10px;border-radius:18px;border:2px solid currentColor;background:transparent url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23645c50' stroke-width='1.6'/%3E%3C/svg%3E\") no-repeat right 9px center;color:inherit;font:700 13px Figtree,system-ui,sans-serif;cursor:pointer;-webkit-appearance:none;appearance:none}.lang-select option{color:#201e1d}.lang-slot{margin-left:auto;margin-right:8px}";
  document.head.append(css);

  if (lang !== "uz") {
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(walk))).observe(document.documentElement, { childList: true, subtree: true });
    if (document.body) walk(document.body);
  }
  window.I18N_MOUNT = mountSwitcher;
  const ready = () => { mountSwitcher(); if (lang !== "uz") { walk(document.body); fixHead(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
