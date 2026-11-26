// ↗️ «Ulashish → Tekshir» — Safari, Telegram, Rasmlar va boshqa ilovalardan matn, havola yoki skrinshotni tekshiradi.
// Hammasi shu oynaning o'zida: tekshiruv telefonda (engine.js), skrinshot Vision bilan o'qiladi.
// Internetga faqat havola va raqamlar boradi (ilovadagi kabi). Xabar matni va rasm hech qayerga yuborilmaydi.
import UIKit
import SwiftUI
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private let store = Store()
    private let checker = Checker()

    override func viewDidLoad() {
        super.viewDidLoad()
        let root = ShareView { [weak self] in self?.extensionContext?.completeRequest(returningItems: nil) }
            .environmentObject(store)
            .environmentObject(checker)
            .preferredColorScheme(.dark)
        let host = UIHostingController(rootView: root)
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
        Task { @MainActor in await self.load() }
    }

    /// Ulashilgan narsalarni o'qiydi: matn, havola yoki rasm.
    @MainActor private func load() async {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        var texts: [String] = []
        var image: UIImage?
        for item in items {
            if let t = item.attributedContentText?.string, !t.isEmpty { texts.append(t) }
            for p in item.attachments ?? [] {
                if p.hasItemConformingToTypeIdentifier(UTType.url.identifier),
                   let u = try? await p.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL {
                    if u.isFileURL, image == nil, let img = UIImage(contentsOfFile: u.path) { image = img } else { texts.append(u.absoluteString) }
                } else if p.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                          let s = try? await p.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                    texts.append(s)
                } else if image == nil, p.hasItemConformingToTypeIdentifier(UTType.image.identifier),
                          let obj = try? await p.loadItem(forTypeIdentifier: UTType.image.identifier) {
                    if let img = obj as? UIImage { image = img }
                    else if let url = obj as? URL { image = UIImage(contentsOfFile: url.path) }
                    else if let data = obj as? Data { image = UIImage(data: data) }
                }
            }
        }
        var seen = Set<String>()
        let unique = texts.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty && seen.insert($0).inserted }
        if let image {
            await checker.runImage(image, store: store)
        } else if !unique.isEmpty {
            checker.input = unique.joined(separator: "\n")
            checker.run(store)
        } else {
            checker.error = store.t("share_empty")
        }
    }
}

/// Ulashish oynasi: natija kartasi va «Tayyor» tugmasi.
struct ShareView: View {
    @EnvironmentObject var store: Store
    @EnvironmentObject var checker: Checker
    var onClose: () -> Void

    var body: some View {
        NavigationStack {
            Screen {
                Header(title: "Tekshir")
                if checker.reading {
                    ProgressView(store.t("reading")).tint(Theme.safe).foregroundStyle(Theme.muted)
                }
                if let e = checker.error {
                    Text(e).font(.subheadline.weight(.bold)).foregroundStyle(Theme.danger)
                }
                if let q = checker.qr { QrCard(q: q) }
                if let s = checker.shown {
                    ResultCard(r: s)
                    if checker.online > 0 {
                        Text(store.t("on_\(checker.online)")).font(.footnote).foregroundStyle(Theme.muted)
                    }
                } else if !checker.reading && checker.error == nil && checker.qr == nil {
                    ProgressView().tint(Theme.safe)
                }
                Text(store.t("privacy")).font(.footnote).foregroundStyle(Theme.muted)
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(store.t("done")) { onClose() }.fontWeight(.bold).tint(Theme.safe)
                }
            }
        }
    }
}
