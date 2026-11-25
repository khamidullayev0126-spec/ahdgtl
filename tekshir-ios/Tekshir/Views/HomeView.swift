// 🛡 Himoya — bosh ekran: qalqon, hisoblar, «Tekshirish», Yordam (🆘 ✈️ 🎓), kun maslahati.
import SwiftUI

struct HomeView: View {
    @EnvironmentObject var store: Store
    @Binding var tab: AppTab
    @State private var pulse = false
    private let engine = Engine.shared

    var body: some View {
        Screen {
            Header(title: "Tekshir", pill: store.t("active"))

            // Qalqon va to'lqinlanuvchi halqalar
            ZStack {
                ForEach(0..<2, id: \.self) { i in
                    Circle().stroke(Theme.safe.opacity(0.45), lineWidth: 2)
                        .frame(width: 200, height: 200)
                        .scaleEffect(pulse ? 1.12 : 0.72)
                        .opacity(pulse ? 0 : 0.9)
                        .animation(.easeOut(duration: 2.6).repeatForever(autoreverses: false).delay(Double(i) * 1.3), value: pulse)
                }
                ShieldIcon(size: 120)
            }
            .frame(maxWidth: .infinity, minHeight: 220)
            .onAppear { pulse = true }

            VStack(spacing: 2) {
                Text(store.t("protected")).font(.title2.weight(.heavy)).foregroundStyle(Theme.text)
                Text(store.t("hero_sub")).font(.subheadline).foregroundStyle(Theme.muted)
            }
            .frame(maxWidth: .infinity)

            HStack(spacing: 10) {
                stat("\(store.history.count)", store.t("checked"), Theme.text)
                stat("\(store.history.filter { $0.level == "danger" }.count)", store.t("dangers"), Theme.danger)
                stat("\(engine.tips.count)", store.t("tips"), Theme.text)
            }

            Button(store.t("check_btn")) { tab = .check }.buttonStyle(MainButtonStyle())

            Kicker(text: store.t("help"))
            NavigationLink { RescueView() } label: {
                row("🆘", store.t("h_rescue"), store.t("h_rescue_s"), border: Theme.danger, fill: Theme.danger.opacity(0.13))
            }
            NavigationLink { TelegramView() } label: {
                row("✈️", store.t("h_tg"), store.t("tg_score", ["n": store.tgDone.count, "k": engine.help.tg["uz"]?.count ?? 7]))
            }
            NavigationLink { QuizView() } label: {
                row("🎓", store.t("h_quiz"), store.quizBest >= 0 ? store.t("h_quiz_best", ["n": store.quizBest]) : store.t("h_quiz_s"))
            }

            if let tip = tipOfDay {
                Kicker(text: store.t("tip_day"))
                TipCard(tip: tip, cat: engine.cats.first { $0.id == tip.cat }?.name ?? "")
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var tipOfDay: Tip? {
        let tips = engine.tips
        guard !tips.isEmpty else { return nil }
        let day = Int((Date().timeIntervalSince1970 + 5 * 3600) / 86_400)      // Toshkent vaqti bo'yicha kun
        return tips[day % tips.count]
    }

    private func stat(_ value: String, _ label: String, _ color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title2.weight(.heavy)).foregroundStyle(color)
            Text(label).font(.caption).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity).padding(12)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.line))
    }

    private func row(_ icon: String, _ title: String, _ sub: String, border: Color = Theme.line, fill: Color = Theme.card) -> some View {
        HStack(spacing: 12) {
            Text(icon).font(.title2).frame(width: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline).foregroundStyle(Theme.text)
                Text(sub).font(.caption).foregroundStyle(Theme.muted).multilineTextAlignment(.leading)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(Theme.accent)
        }
        .padding(14)
        .background(fill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(border))
    }
}

struct TipCard: View {
    var tip: Tip
    var cat: String
    var body: some View {
        CardBox {
            if !cat.isEmpty { Kicker(text: cat) }
            Text("\(tip.icon) \(tip.title)").font(.headline).foregroundStyle(Theme.text)
            Text(tip.text).font(.subheadline).foregroundStyle(Theme.muted)
        }
    }
}
