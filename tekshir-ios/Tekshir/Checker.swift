// Tekshirish jarayoni:
// 1) Telefonda, internetsiz (engine.js) — natija darhol.
// 2) Havola yoki raqam bo'lsa — FAQAT ularni serverga (Google Safe Browsing, VirusTotal, shikoyatlar bazasi).
//    Xabar matni telefondan chiqmaydi. Ikkala natijadan eng xavflisi ko'rsatiladi.
import Foundation
import SwiftUI

/// Server javobi (/api/check) — Android ilova va veb-ilova bilan bir xil.
struct ServerAnswer: Decodable {
    struct Num: Decodable, Hashable { var masked: String; var count: Int? }
    var level: String
    var title: String
    var reasons: [String]
    var advice: [String]
    var numbers: [Num]?
}

enum Online {
    static let api = URL(string: "https://tekshir.ah-digital.uz/api/check")!

    static func check(_ part: String, lang: Lang) async -> ServerAnswer? {
        var req = URLRequest(url: api, timeoutInterval: 8)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["text": part, "lang": lang.engine, "app": "tekshir"])
        guard let result = try? await URLSession.shared.data(for: req),
              (result.1 as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSONDecoder().decode(ServerAnswer.self, from: result.0)
    }
}

/// Ekranda ko'rsatiladigan natija (telefon + server birlashtirilgan).
struct Shown: Equatable {
    var level: String
    var title: String
    var reasons: [String]
    var advice: [String]
    var numbers: [ServerAnswer.Num] = []
}

@MainActor
final class Checker: ObservableObject {
    @Published var input = ""
    @Published var shown: Shown?
    @Published var online = 0              // 0 — kerak emas, 1 — kutilmoqda, 2 — tayyor, 3 — internetsiz
    @Published var error: String?
    @Published var reading = false         // skrinshot o'qilmoqda
    @Published var qr: QrInfo?             // oxirgi QR ichidagi ma'lumot
    private var task: Task<Void, Never>?

    private static let rank = ["safe": 0, "suspicious": 1, "danger": 2]

    func run(_ store: Store) {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        error = nil
        guard !text.isEmpty else { error = store.t("empty"); return }
        guard let v = Engine.shared.check(text, lang: store.lang) else { error = store.t("no_engine"); return }
        let local = Shown(level: v.level, title: v.title, reasons: v.reasons, advice: v.advice)
        shown = local
        task?.cancel()
        guard !v.online.isEmpty else {
            online = 0
            store.addHistory(level: local.level, title: local.title, text: text)
            return
        }
        online = 1
        let lang = store.lang
        task = Task { [weak self] in
            let answer = await Online.check(v.online, lang: lang)
            guard let self, !Task.isCancelled else { return }
            if let a = answer {
                self.shown = Checker.merge(local, a)
                self.online = 2
            } else {
                self.online = 3
            }
            if let s = self.shown { store.addHistory(level: s.level, title: s.title, text: text) }
        }
    }

    /// Yangi matn kiritilganda QR eslatmasini olib tashlash uchun — foydalanuvchi o'zi tekshirsa.
    func runTyped(_ store: Store) { qr = nil; run(store) }

    /// 📸 Skrinshot: rasmdagi matn va QR kodlar telefonda o'qiladi, keyin odatdagidek tekshiriladi.
    func runImage(_ image: UIImage, store: Store) async {
        reading = true; error = nil; qr = nil
        let out = await ImageScan.read(image)
        reading = false
        let qrs = out.qr.compactMap { Engine.shared.qr($0) }
        qr = qrs.first
        let parts = ([out.text] + qrs.map(\.check)).filter { !$0.isEmpty }
        var seen = Set<String>()
        let unique = parts.filter { seen.insert($0).inserted }
        if unique.isEmpty {
            shown = nil
            if qr == nil { error = store.t("img_empty") }
            return
        }
        input = unique.joined(separator: "\n")
        run(store)
    }

    /// 🔳 QR kod (kamera): ichidagi havola yoki matn tekshiriladi; Wi-Fi/telefon bo'lsa — eslatma.
    func runQr(_ raw: String, store: Store) {
        guard let q = Engine.shared.qr(raw) else { return }
        qr = q; error = nil
        if q.check.isEmpty { shown = nil; online = 0; return }
        input = q.check
        run(store)
    }

    static func merge(_ local: Shown, _ server: ServerAnswer) -> Shown {
        let serverHigher = (rank[server.level] ?? 0) > (rank[local.level] ?? 0)
        var reasons = local.reasons
        for r in server.reasons where !reasons.contains(r) { reasons.append(r) }
        return Shown(level: serverHigher ? server.level : local.level,
                     title: serverHigher ? server.title : local.title,
                     reasons: Array(reasons.prefix(6)),
                     advice: serverHigher ? server.advice : local.advice,
                     numbers: server.numbers ?? [])
    }
}
