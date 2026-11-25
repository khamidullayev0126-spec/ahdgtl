// 🕘 Tarix · 💡 Maslahat · ⚙️ Sozlama
import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var store: Store
    @State private var ask = false

    var body: some View {
        Screen {
            Header(title: store.t("hist_title"))
            if store.history.isEmpty {
                CardBox { Text(store.t("hist_empty")).foregroundStyle(Theme.muted) }
            }
            ForEach(store.history) { h in
                HStack(spacing: 12) {
                    Circle().fill(Theme.color(h.level)).frame(width: 12, height: 12)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(h.preview).font(.subheadline).foregroundStyle(Theme.text).lineLimit(1)
                        Text("\(h.title) · \(h.at.formatted(date: .numeric, time: .shortened))").font(.caption).foregroundStyle(Theme.muted)
                    }
                    Spacer(minLength: 0)
                }
                .padding(12)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.line))
            }
            Text(store.t("hist_note")).font(.footnote).foregroundStyle(Theme.muted)
            if !store.history.isEmpty {
                Button(store.t("clear")) { ask = true }.buttonStyle(GhostButtonStyle())
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .confirmationDialog(store.t("clear_q"), isPresented: $ask, titleVisibility: .visible) {
            Button(store.t("yes"), role: .destructive) { store.clearHistory() }
            Button(store.t("no"), role: .cancel) {}
        }
    }
}

struct TipsView: View {
    @EnvironmentObject var store: Store
    @State private var cat = "all"
    private let engine = Engine.shared

    var body: some View {
        Screen {
            Header(title: store.t("tips_title"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    chip("all", "\(store.t("all")) · \(engine.tips.count)")
                    ForEach(engine.cats) { c in chip(c.id, "\(c.icon) \(c.name)") }
                }
            }
            ForEach(engine.tips.filter { cat == "all" || $0.cat == cat }) { tip in
                TipCard(tip: tip, cat: engine.cats.first { $0.id == tip.cat }?.name ?? "")
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func chip(_ id: String, _ label: String) -> some View {
        let on = cat == id
        return Button(label) { cat = id }
            .font(.subheadline.weight(.bold))
            .padding(.horizontal, 14).frame(height: 38)
            .foregroundStyle(on ? Theme.bg : Theme.text)
            .background(on ? Theme.text : Theme.surface, in: Capsule())
            .overlay(Capsule().stroke(Theme.line))
    }
}

struct SettingsView: View {
    @EnvironmentObject var store: Store
    private var version: String { Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "" }

    var body: some View {
        Screen {
            Header(title: store.t("set_title"))
            CardBox {
                Kicker(text: store.t("lang"))
                Picker(store.t("lang"), selection: $store.lang) {
                    ForEach(Lang.allCases) { Text($0.name).tag($0) }
                }
                .pickerStyle(.segmented)
            }
            CardBox {
                Kicker(text: store.t("about"))
                Text(store.t("about_p")).foregroundStyle(Theme.text)
            }
            Link(destination: URL(string: "https://tekshir.ah-digital.uz/maxfiylik.html")!) {
                CardBox { Text(store.t("priv_link")).font(.headline).foregroundStyle(Theme.accent) }
            }
            Link(destination: URL(string: "https://t.me/tekshirbot_bot?start=ios")!) {
                CardBox { Text(store.t("bot_link")).font(.headline).foregroundStyle(Theme.accent) }
            }
            Text("\(store.t("made")) · \(store.t("version")) \(version)").font(.footnote).foregroundStyle(Theme.muted)
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}
