// Ilova holati: til, tekshiruvlar tarixi, ✈️ Telegram ro'yxati, 🎓 eng yaxshi natija.
// Hammasi FAQAT shu telefonda (UserDefaults). Tarixda raqamlar yashiriladi, matn qisqartiriladi.
import Foundation
import SwiftUI

enum Lang: String, CaseIterable, Identifiable {
    case uz, ru
    var id: String { rawValue }
    /// engine.js tili
    var engine: String { self == .ru ? "ru" : "uz-latn" }
    var name: String { self == .ru ? "Русский" : "O'zbekcha" }
}

struct HistItem: Codable, Identifiable, Hashable {
    var id = UUID()
    var level: String
    var title: String
    var preview: String
    var at: Date
}

@MainActor
final class Store: ObservableObject {
    private let d = UserDefaults.standard

    @Published var lang: Lang { didSet { d.set(lang.rawValue, forKey: "lang") } }
    @Published private(set) var history: [HistItem] = []
    @Published var tgDone: Set<String> { didSet { d.set(Array(tgDone), forKey: "tg_done") } }
    @Published var quizBest: Int { didSet { d.set(quizBest, forKey: "quiz_best") } }

    init() {
        let ud = UserDefaults.standard              // init ichida self'dan oldin — mahalliy nom
        let sys = Locale.preferredLanguages.first ?? ""
        lang = Lang(rawValue: ud.string(forKey: "lang") ?? "") ?? (sys.hasPrefix("ru") ? .ru : .uz)
        tgDone = Set(ud.stringArray(forKey: "tg_done") ?? [])
        quizBest = ud.object(forKey: "quiz_best") as? Int ?? -1
        if let data = ud.data(forKey: "history"), let h = try? JSONDecoder().decode([HistItem].self, from: data) { history = h }
    }

    func t(_ key: String, _ vars: [String: CustomStringConvertible] = [:]) -> String { S.t(lang, key, vars) }

    func addHistory(level: String, title: String, text: String) {
        history.insert(HistItem(level: level, title: title, preview: Store.mask(text), at: Date()), at: 0)
        if history.count > 50 { history.removeLast(history.count - 50) }
        save()
    }

    func clearHistory() { history = []; save() }

    private func save() { if let data = try? JSONEncoder().encode(history) { d.set(data, forKey: "history") } }

    /// «+998 90 123 45 67» → «+998 •• ••• •• 67»: raqamlar yashiriladi, matn 80 belgigacha qisqartiriladi.
    static func mask(_ s: String) -> String {
        let line = s.replacingOccurrences(of: "\n", with: " ")
        guard let re = try? NSRegularExpression(pattern: "\\d[\\d\\s-]{6,}\\d") else { return String(line.prefix(80)) }
        var out = line
        for m in re.matches(in: line, range: NSRange(line.startIndex..., in: line)).reversed() {
            guard let r = Range(m.range, in: out) else { continue }
            let chunk = Array(out[r])
            var masked = ""
            for (i, ch) in chunk.enumerated() {
                let rest = chunk[(i + 1)...].filter(\.isNumber).count
                masked.append(ch.isNumber && rest >= 2 ? "•" : ch)
            }
            out.replaceSubrange(r, with: masked)
        }
        return String(out.prefix(80))
    }
}
