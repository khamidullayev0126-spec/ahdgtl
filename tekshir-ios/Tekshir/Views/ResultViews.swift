// Natija va QR kartalari — ilova va «Ulashish → Tekshir» kengaytmasi uchun umumiy.
import SwiftUI

/// Natija kartasi: daraja, sabablar, raqamlar, nima qilish kerak.
struct ResultCard: View {
    @EnvironmentObject var store: Store
    var r: Shown

    var body: some View {
        let c = Theme.color(r.level)
        CardBox(border: c, fill: c.opacity(0.12)) {
            HStack(spacing: 12) {
                Text(Theme.icon(r.level)).font(.title2.weight(.heavy)).foregroundStyle(Theme.bg)
                    .frame(width: 48, height: 48).background(c, in: Circle())
                Text(r.title.drop(while: { !$0.isLetter })).font(.title2.weight(.heavy)).foregroundStyle(c)
            }
            if !r.reasons.isEmpty && r.level != "safe" {
                Kicker(text: store.t("why"))
                ForEach(r.reasons, id: \.self) { Text("• " + $0).font(.subheadline).foregroundStyle(Theme.text) }
            }
            if !r.numbers.isEmpty {
                Kicker(text: store.t("nums"))
                ForEach(r.numbers, id: \.self) { n in
                    Text("• \(n.masked) — " + ((n.count ?? 0) > 0 ? "\(n.count ?? 0) \(store.t("reports"))" : store.t("no_reports")))
                        .font(.subheadline).foregroundStyle(Theme.text)
                }
                Text(store.t("rep_note")).font(.caption).foregroundStyle(Theme.muted)
            }
            Kicker(text: store.t("what_to_do"))
            ForEach(r.advice, id: \.self) { Text($0).font(.subheadline).foregroundStyle(Theme.text) }
        }
        .accessibilityElement(children: .combine)
    }
}

/// QR kod ichida nima borligi + eslatmalar (Wi-Fi, telefon, SMS…)
struct QrCard: View {
    @EnvironmentObject var store: Store
    var q: QrInfo
    private var warn: Bool { q.notes.contains { ["qr_wifi_open", "qr_http", "qr_sms"].contains($0) } }

    var body: some View {
        CardBox(border: warn ? Theme.warn : Theme.line) {
            Kicker(text: store.t("qr_title"))
            Text(shown).font(.subheadline).foregroundStyle(Theme.text).lineLimit(6)
            ForEach(q.notes, id: \.self) { Text(Engine.shared.qrNote($0, lang: store.lang)).font(.footnote).foregroundStyle(warn ? Theme.warn : Theme.muted) }
        }
    }

    private var shown: String {
        switch q.kind {
        case "wifi": return "\(Engine.shared.qrNote("qr_wifi_name", lang: store.lang)): \(q.fields["ssid"].flatMap { $0.isEmpty ? nil : $0 } ?? "—")"
        case "sms": return "\(q.fields["to"] ?? ""): \(q.text)"
        default: return String(q.text.prefix(300))
        }
    }
}
