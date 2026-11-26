// 🧩 Tekshir vidjeti — bosh ekran va qulf ekrani.
//   Kichik: qalqon + «🔍 Tekshirish» (bosilsa ilova Tekshirish bo'limida ochiladi)
//   O'rtacha: kun maslahati (bosilsa — Maslahat bo'limi)
//   Qulf ekrani: kun maslahati sarlavhasi
// Maslahatlar ilovadagi bilan bir xil (maslahatlar.js). Vidjet hech qanday ma'lumot to'plamaydi.
import WidgetKit
import SwiftUI

struct TipEntry: TimelineEntry {
    let date: Date
    let tip: Tip?
    let cat: String
    let lang: Lang
}

struct TipProvider: TimelineProvider {
    private var lang: Lang {
        Lang(rawValue: UserDefaults.standard.string(forKey: "lang") ?? "")
            ?? ((Locale.preferredLanguages.first ?? "").hasPrefix("ru") ? .ru : .uz)
    }

    /// Ilovadagi «Kun maslahati» bilan bir xil: Toshkent vaqti bo'yicha kun raqami.
    private func entry(_ date: Date) -> TipEntry {
        let e = Engine.shared
        let day = Int((date.timeIntervalSince1970 + 5 * 3600) / 86_400)
        let tip = e.tips.isEmpty ? nil : e.tips[day % e.tips.count]
        return TipEntry(date: date, tip: tip, cat: e.cats.first { $0.id == tip?.cat }?.name ?? "", lang: lang)
    }

    func placeholder(in context: Context) -> TipEntry { entry(Date()) }
    func getSnapshot(in context: Context, completion: @escaping (TipEntry) -> Void) { completion(entry(Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TipEntry>) -> Void) {
        let now = Date()
        // Keyingi kun boshida (Toshkent, UTC+5) yangilanadi
        let secs = now.timeIntervalSince1970 + 5 * 3600
        let next = Date(timeIntervalSince1970: (floor(secs / 86_400) + 1) * 86_400 - 5 * 3600 + 60)
        completion(Timeline(entries: [entry(now)], policy: .after(next)))
    }
}

struct TekshirWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TipEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("🛡 Tekshir").font(.headline)
                Text(entry.tip.map { "\($0.icon) \($0.title)" } ?? S.t(entry.lang, "check_btn")).font(.caption).lineLimit(2)
            }
            .widgetURL(URL(string: "tekshir://tips"))
            .widgetBackground(.clear)
        case .systemMedium:
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    ShieldIcon(size: 26)
                    Text(S.t(entry.lang, "tip_day")).font(.caption.weight(.heavy)).foregroundStyle(Theme.accent)
                    Spacer()
                }
                if let tip = entry.tip {
                    Text("\(tip.icon) \(tip.title)").font(.headline).foregroundStyle(Theme.text).lineLimit(2)
                    Text(tip.text).font(.caption).foregroundStyle(Theme.muted).lineLimit(3)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: "tekshir://tips"))
            .widgetBackground(Theme.bg)
        default:
            VStack(spacing: 8) {
                ShieldIcon(size: 58)
                Text("Tekshir").font(.headline.weight(.heavy)).foregroundStyle(Theme.text)
                Text(S.t(entry.lang, "check_btn")).font(.caption.weight(.bold)).foregroundStyle(Theme.bg)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Theme.safe, in: Capsule())
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetURL(URL(string: "tekshir://check"))
            .widgetBackground(Theme.bg)
        }
    }
}

extension View {
    /// iOS 17+ vidjet foni (containerBackground), iOS 16 — oddiy fon.
    @ViewBuilder func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            background(color)
        }
    }
}

struct TekshirWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TekshirWidget", provider: TipProvider()) { entry in
            TekshirWidgetView(entry: entry)
        }
        .configurationDisplayName("Tekshir")
        .description(Text("Kun maslahati va tez tekshirish · Совет дня и быстрая проверка"))
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

@main
struct TekshirWidgets: WidgetBundle {
    var body: some Widget { TekshirWidget() }
}
