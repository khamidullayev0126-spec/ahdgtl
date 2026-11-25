// Tekshir mexanizmi — Telegram bot, Android, sayt va brauzer kengaytmasi bilan BIR XIL.
// engine.js (botdagi kod, tekshir-extension/build.js yig'adi) iPhone'ning o'zidagi JavaScriptCore'da ishlaydi:
// tekshiruv telefonda, internetsiz. Matnlar (🆘 ✈️ 🎓, maslahatlar) ham veb-ilova bilan umumiy: yordam.js, maslahatlar.js.
import Foundation
import JavaScriptCore

/// Telefondagi tekshiruv natijasi (engine.js → view()).
struct Verdict: Codable, Equatable {
    var level: String          // "safe" | "suspicious" | "danger"
    var score: Int
    var title: String
    var reasons: [String]
    var advice: [String]
    var online: String         // serverga ketadigan qism: faqat havola va raqamlar ("" — kerak emas)
    var pending: Bool
}

/// QR kod ichidagi ma'lumot (engine.js → qr()). Wi-Fi paroli olinmaydi.
struct QrInfo: Codable, Equatable {
    var kind: String           // url | wifi | tel | sms | email | geo | text | empty
    var text: String
    var fields: [String: String]
    var notes: [String]
    var check: String          // mexanizmga beriladigan matn ("" — tekshiradigan narsa yo'q)
}

struct RescueCase: Decodable, Identifiable { var id: String; var icon: String; var title: String; var steps: [String] }
struct TgItem: Decodable, Identifiable { var id: String; var title: String; var how: String }
struct QuizQ: Decodable { var scam: Bool; var uz: String; var ru: String; var whyUz: String; var whyRu: String }
struct Help: Decodable {
    struct Rescue: Decodable { var uz: [RescueCase]; var ru: [RescueCase]; var footer: [String: String] }
    var rescue: Rescue
    var tg: [String: [TgItem]]
    var quiz: [QuizQ]
    var qrNotes: [String: [String: String]]
    static let empty = Help(rescue: Rescue(uz: [], ru: [], footer: [:]), tg: [:], quiz: [], qrNotes: [:])
}
struct Tip: Identifiable, Hashable { let id = UUID(); var cat: String; var icon: String; var title: String; var text: String }
struct TipCat: Identifiable, Hashable { var id: String; var icon: String; var name: String }

/// Faqat asosiy oqimdan (UI) chaqiriladi — JSContext bitta oqimda ishlashi kerak.
final class Engine {
    static let shared = Engine()

    private let ctx: JSContext
    let help: Help
    let tips: [Tip]
    let cats: [TipCat]
    /// engine.js yuklanmagan bo'lsa (fayl yo'q) — false; ilova baribir ochiladi, faqat serverdan tekshiradi.
    let ready: Bool

    // Tekshir — xavfsizlik ilovasi: faqat xavfsizlikka oid maslahatlar (biznes, Instagram, AI emas)
    private static let securityCats: Set<String> = ["firibgarlik", "parol", "telefon", "oila"]

    private init() {
        let c: JSContext = JSContext()
        c.exceptionHandler = { _, err in print("Tekshir JS xato:", err?.toString() ?? "?") }
        c.evaluateScript("var window = this;")
        for name in ["engine", "yordam", "maslahatlar"] {
            if let url = Bundle.main.url(forResource: name, withExtension: "js"),
               let src = try? String(contentsOf: url, encoding: .utf8) {
                c.evaluateScript(src, withSourceURL: url)
            }
        }
        let rawTips: [[String]] = Engine.decode(c, "window.TIPS") ?? []
        let rawCats: [[String]] = Engine.decode(c, "window.TIP_CATS") ?? []
        ctx = c
        ready = !(c.objectForKeyedSubscript("TekshirEngine")?.isUndefined ?? true)
        help = Engine.decode(c, "window.YORDAM") ?? Help.empty
        tips = rawTips.compactMap { $0.count == 4 && Engine.securityCats.contains($0[0]) ? Tip(cat: $0[0], icon: $0[1], title: $0[2], text: $0[3]) : nil }
        cats = rawCats.compactMap { $0.count == 3 && Engine.securityCats.contains($0[0]) ? TipCat(id: $0[0], icon: $0[1], name: $0[2]) : nil }
    }

    /// JS qiymatini JSON orqali Swift tuzilmasiga o'giradi.
    private static func decode<T: Decodable>(_ ctx: JSContext, _ expr: String) -> T? {
        guard let json = ctx.evaluateScript("JSON.stringify(\(expr))")?.toString(), json != "undefined",
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func call<T: Decodable>(_ fn: String, _ args: [Any]) -> T? {
        guard ready,
              let f = ctx.objectForKeyedSubscript("TekshirEngine")?.objectForKeyedSubscript(fn), !f.isUndefined,
              let res = f.call(withArguments: args),
              let json = ctx.objectForKeyedSubscript("JSON")?.invokeMethod("stringify", withArguments: [res])?.toString(),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    /// Xabar, havola yoki raqamni telefonda tekshirish.
    func check(_ text: String, lang: Lang) -> Verdict? { call("view", [text, lang.engine]) }

    /// QR kod ichidagini aniqlash.
    func qr(_ raw: String) -> QrInfo? { call("qr", [raw]) }

    func qrNote(_ key: String, lang: Lang) -> String { help.qrNotes[lang.rawValue]?[key] ?? help.qrNotes["uz"]?[key] ?? key }
}
