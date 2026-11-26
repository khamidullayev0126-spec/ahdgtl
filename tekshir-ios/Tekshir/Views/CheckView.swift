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
        // PhotosPicker yozuvini alohida (Sendable) yopilmada chizadi — matn oldindan tayyorlanadi
        let shotLabel = checker.reading ? store.t("reading") : store.t("shot")
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
                    Text(shotLabel)
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
