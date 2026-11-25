// 🆘 Aldandim · ✈️ Telegram himoyasi · 🎓 Firibgarni tani.
// Matnlar yordam.js'dan — Android ilova va veb-ilova bilan aynan bir xil.
import SwiftUI

struct RescueView: View {
    @EnvironmentObject var store: Store
    @State private var open: String?
    private let help = Engine.shared.help

    var body: some View {
        Screen {
            Text(store.t("r_p")).font(.subheadline).foregroundStyle(Theme.muted)
            ForEach(store.lang == .ru ? help.rescue.ru : help.rescue.uz) { c in
                let isOpen = open == c.id
                CardBox(border: isOpen ? Theme.danger : Theme.line) {
                    Button {
                        withAnimation(.easeOut(duration: 0.2)) { open = isOpen ? nil : c.id }
                    } label: {
                        HStack(spacing: 10) {
                            Text(c.icon).font(.title3)
                            Text(c.title).font(.headline).foregroundStyle(Theme.text).multilineTextAlignment(.leading)
                            Spacer()
                            Image(systemName: isOpen ? "chevron.up" : "chevron.down").foregroundStyle(Theme.muted)
                        }
                    }
                    if isOpen {
                        ForEach(Array(c.steps.enumerated()), id: \.offset) { i, step in
                            HStack(alignment: .top, spacing: 10) {
                                Text("\(i + 1)").font(.caption.weight(.heavy)).foregroundStyle(Theme.bg)
                                    .frame(width: 24, height: 24).background(Theme.danger, in: Circle())
                                Text(step).font(.subheadline).foregroundStyle(Theme.text)
                            }
                        }
                    }
                }
            }
            // 102 — telefon oynasi raqam terilgan holda ochiladi, qo'ng'iroqni foydalanuvchi o'zi bosadi
            Link(destination: URL(string: "tel:102")!) {
                Text(store.t("r_police")).font(.headline.weight(.heavy)).frame(maxWidth: .infinity, minHeight: 52)
                    .foregroundStyle(.white).background(Theme.danger, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            CardBox(border: Theme.safe, fill: Theme.safe.opacity(0.12)) {
                Text(help.rescue.footer[store.lang.rawValue] ?? "").foregroundStyle(Theme.text)
            }
        }
        .navigationTitle(store.t("r_title"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TelegramView: View {
    @EnvironmentObject var store: Store
    private let help = Engine.shared.help

    var body: some View {
        let items = help.tg[store.lang.rawValue] ?? help.tg["uz"] ?? []
        let n = items.filter { store.tgDone.contains($0.id) }.count
        let level = n >= items.count ? "safe" : n >= 4 ? "suspicious" : "danger"   // Android'dagi TgSafety.level bilan bir xil
        Screen {
            Text(store.t("tg_p")).font(.subheadline).foregroundStyle(Theme.muted)
            CardBox(border: Theme.color(level), fill: Theme.color(level).opacity(0.12)) {
                Text(store.t("tg_score", ["n": n, "k": items.count])).font(.title2.weight(.heavy)).foregroundStyle(Theme.color(level))
                Text(store.t(level == "safe" ? "tg_good" : level == "suspicious" ? "tg_mid" : "tg_bad")).foregroundStyle(Theme.text)
            }
            ForEach(items) { item in
                let on = store.tgDone.contains(item.id)
                CardBox(border: on ? Theme.safe : Theme.line) {
                    Toggle(isOn: Binding(get: { on }, set: { v in
                        if v { store.tgDone.insert(item.id) } else { store.tgDone.remove(item.id) }
                    })) {
                        Text(item.title).font(.headline).foregroundStyle(Theme.text)
                    }
                    .tint(Theme.safe)
                    Text(item.how).font(.subheadline).foregroundStyle(Theme.muted)
                }
            }
            if let tg = URL(string: "tg://settings") {
                Link(destination: tg) { Text(store.t("tg_open")) }.buttonStyle(GhostButtonStyle())
            }
            Text(store.t("tg_priv")).font(.footnote).foregroundStyle(Theme.muted)
        }
        .navigationTitle(store.t("tg_title"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct QuizView: View {
    @EnvironmentObject var store: Store
    @State private var i = 0
    @State private var right = 0
    @State private var answer: Bool?
    @State private var done = false
    private let qs = Engine.shared.help.quiz

    var body: some View {
        Screen {
            if qs.isEmpty {
                Text(store.t("no_engine")).foregroundStyle(Theme.muted)
            } else if done {
                let key = right * 10 >= qs.count * 9 ? "quiz_r3" : right * 10 >= qs.count * 6 ? "quiz_r2" : "quiz_r1"   // Android Quiz.result
                let level = key == "quiz_r3" ? "safe" : key == "quiz_r2" ? "suspicious" : "danger"
                CardBox(border: Theme.color(level), fill: Theme.color(level).opacity(0.12)) {
                    Text(store.t("q_score", ["c": right, "n": qs.count])).font(.largeTitle.weight(.heavy)).foregroundStyle(Theme.color(level))
                    Text(store.t(key)).foregroundStyle(Theme.text)
                }
                Button(store.t("q_again")) { i = 0; right = 0; answer = nil; done = false }.buttonStyle(MainButtonStyle())
                ShareLink(item: store.t("q_share_text", ["c": right, "n": qs.count])) { Text(store.t("q_share")) }
                    .buttonStyle(GhostButtonStyle())
            } else {
                let q = qs[i]
                Text(store.t("q_of", ["i": i + 1, "n": qs.count]) + " · " + store.t("q_p")).font(.subheadline).foregroundStyle(Theme.muted)
                Text(store.lang == .ru ? q.ru : q.uz).font(.body).foregroundStyle(Theme.text)
                    .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))   // iOS 16: UnevenRoundedRectangle yo'q
                if let a = answer {
                    let ok = a == q.scam
                    CardBox(border: ok ? Theme.safe : Theme.danger, fill: (ok ? Theme.safe : Theme.danger).opacity(0.12)) {
                        Text(store.t(ok ? "q_right" : "q_wrong")).font(.title3.weight(.heavy)).foregroundStyle(ok ? Theme.safe : Theme.danger)
                        Text(store.t(q.scam ? "q_scam" : "q_safe")).font(.headline).foregroundStyle(Theme.text)
                        Text(store.lang == .ru ? q.whyRu : q.whyUz).foregroundStyle(Theme.text)
                    }
                    Button(store.t(i == qs.count - 1 ? "q_finish" : "q_next")) {
                        if i == qs.count - 1 {
                            done = true
                            if right > store.quizBest { store.quizBest = right }
                        } else { i += 1; answer = nil }
                    }
                    .buttonStyle(MainButtonStyle(color: Theme.accent))
                } else {
                    HStack(spacing: 10) {
                        Button(store.t("q_scam")) { answer = true; if q.scam { right += 1 } }
                            .buttonStyle(MainButtonStyle(color: Theme.danger, fg: .white))
                        Button(store.t("q_safe")) { answer = false; if !q.scam { right += 1 } }
                            .buttonStyle(MainButtonStyle())
                    }
                }
            }
        }
        .navigationTitle(store.t("q_title"))
        .navigationBarTitleDisplayMode(.inline)
    }
}
