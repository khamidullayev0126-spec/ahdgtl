// 🔍 Tekshirish: matn/havola/raqam, 📋 joylash, 📸 skrinshot (Vision), 🔳 QR (kamera).
import SwiftUI
import PhotosUI

struct CheckView: View {
    @EnvironmentObject var store: Store
    @EnvironmentObject var checker: Checker
    @State private var photo: PhotosPickerItem?
    @State private var scanning = false
    @State private var qrError: String?
    @FocusState private var focused: Bool

    var body: some View {
        Screen {
            Header(title: store.t("check_title"))

            ZStack(alignment: .topLeading) {
                if checker.input.isEmpty {
                    Text(store.t("hint")).foregroundStyle(Theme.muted).padding(.horizontal, 14).padding(.vertical, 12)
                }
                TextEditor(text: $checker.input)
                    .focused($focused)
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(Theme.text)
                    .padding(8)
                    .frame(minHeight: 130)
            }
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(focused ? Theme.accent : Theme.line))

            HStack(spacing: 10) {
                Button(store.t("paste")) {
                    if let s = UIPasteboard.general.string { checker.input = s }
                }.buttonStyle(GhostButtonStyle())
                PhotosPicker(selection: $photo, matching: .images) {
                    Text(checker.reading ? store.t("reading") : store.t("shot"))
                }.buttonStyle(GhostButtonStyle()).disabled(checker.reading)
                Button(store.t("qr_btn")) { Task { @MainActor in await openScanner() } }.buttonStyle(GhostButtonStyle())
            }

            Button(store.t("check_btn")) { focused = false; checker.runTyped(store) }.buttonStyle(MainButtonStyle())

            if let e = checker.error ?? qrError { Text(e).font(.subheadline.weight(.bold)).foregroundStyle(Theme.danger) }
            if let q = checker.qr { QrCard(q: q) }
            if let s = checker.shown { ResultCard(r: s) }
            if checker.shown != nil, checker.online > 0 {
                Text(store.t("on_\(checker.online)")).font(.footnote).foregroundStyle(Theme.muted)
            }
            Text(store.t("privacy")).font(.footnote).foregroundStyle(Theme.muted)
            Text(store.t("img_priv")).font(.footnote).foregroundStyle(Theme.muted)
        }
        .toolbar(.hidden, for: .navigationBar)
        .onChange(of: photo) { item in
            guard let item else { return }
            Task { @MainActor in
                if let data = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: data) {
                    await checker.runImage(img, store: store)
                } else { checker.error = store.t("img_fail") }
                photo = nil
            }
        }
        .sheet(isPresented: $scanning) {
            ZStack(alignment: .topTrailing) {
                QRScanner { value in
                    scanning = false
                    checker.runQr(value, store: store)
                }
                .ignoresSafeArea()
                Button(store.t("qr_close")) { scanning = false }
                    .font(.headline).padding(12)
                    .background(.ultraThinMaterial, in: Capsule()).padding()
            }
        }
    }

    @MainActor private func openScanner() async {
        qrError = nil
        guard QRScanner.supported else { qrError = store.t("qr_fail"); return }
        guard await QRScanner.requestCamera() else { qrError = store.t("qr_denied"); return }
        scanning = true
    }
}

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
