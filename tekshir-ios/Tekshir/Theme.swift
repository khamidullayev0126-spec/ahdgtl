// Ranglar va umumiy bo'laklar — Android ilova va veb-ilova bilan bir xil uslub (to'q fon, yashil/sariq/qizil holatlar).
import SwiftUI

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: alpha)
    }
}

enum Theme {
    static let bg = Color(hex: 0x0A1020)
    static let surface = Color(hex: 0x111A2E)
    static let card = Color(hex: 0x16213A)
    static let line = Color(hex: 0x24314F)
    static let text = Color(hex: 0xE8EEFC)
    static let muted = Color(hex: 0x8B97B5)
    static let accent = Color(hex: 0x38BDF8)
    static let safe = Color(hex: 0x22C55E)
    static let warn = Color(hex: 0xF5B301)
    static let danger = Color(hex: 0xEF4444)

    static func color(_ level: String) -> Color { level == "danger" ? danger : level == "suspicious" ? warn : safe }
    static func icon(_ level: String) -> String { level == "danger" ? "✕" : level == "suspicious" ? "!" : "✓" }
}

/// Karta: to'q fon, ingichka chegara, yumaloq burchak.
struct CardBox<Content: View>: View {
    var border: Color = Theme.line
    var fill: Color = Theme.card
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(fill, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(border, lineWidth: 1))
    }
}

struct Kicker: View {
    var text: String
    var body: some View {
        Text(text.uppercased()).font(.caption.weight(.heavy)).tracking(0.6).foregroundStyle(Theme.accent)
    }
}

/// Yashil tugma
struct MainButtonStyle: ButtonStyle {
    var color: Color = Theme.safe
    var fg: Color = Theme.bg
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.heavy))
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(fg)
            .background(color, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

/// Chegarali (ikkinchi darajali) tugma
struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.bold))
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(Theme.text)
            .background(Theme.surface.opacity(configuration.isPressed ? 0.6 : 1), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.line, lineWidth: 1))
    }
}

/// Qalqon belgisi (rasm fayli kerak emas)
struct ShieldShape: Shape {
    func path(in r: CGRect) -> Path {
        let k = min(r.width, r.height) / 120
        var p = Path()
        p.move(to: CGPoint(x: 60 * k, y: 8 * k))
        p.addLine(to: CGPoint(x: 100 * k, y: 23 * k))
        p.addLine(to: CGPoint(x: 100 * k, y: 53 * k))
        p.addCurve(to: CGPoint(x: 60 * k, y: 108 * k), control1: CGPoint(x: 100 * k, y: 80 * k), control2: CGPoint(x: 83 * k, y: 98 * k))
        p.addCurve(to: CGPoint(x: 20 * k, y: 53 * k), control1: CGPoint(x: 37 * k, y: 98 * k), control2: CGPoint(x: 20 * k, y: 80 * k))
        p.addLine(to: CGPoint(x: 20 * k, y: 23 * k))
        p.closeSubpath()
        return p
    }
}

struct ShieldIcon: View {
    var size: CGFloat
    var body: some View {
        ZStack {
            ShieldShape().fill(LinearGradient(colors: [Theme.safe, Color(hex: 0x0EA5E9)], startPoint: .topLeading, endPoint: .bottomTrailing))
            Path { p in
                let k = size / 120
                p.move(to: CGPoint(x: 42 * k, y: 60 * k)); p.addLine(to: CGPoint(x: 54 * k, y: 72 * k)); p.addLine(to: CGPoint(x: 78 * k, y: 46 * k))
            }
            .stroke(Color(hex: 0x04130A), style: StrokeStyle(lineWidth: 9 * size / 120, lineCap: .round, lineJoin: .round))
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

/// Ekran sarlavhasi: qalqon + nom
struct Header: View {
    var title: String
    var pill: String? = nil
    var body: some View {
        HStack(spacing: 10) {
            ShieldIcon(size: 34)
            Text(title).font(.title3.weight(.heavy)).foregroundStyle(Theme.text)
            Spacer()
            if let pill {
                Text("● " + pill).font(.caption.weight(.bold)).foregroundStyle(Theme.safe)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Theme.safe.opacity(0.12), in: Capsule())
            }
        }
    }
}

/// Barcha ekranlar uchun umumiy fon va aylantirish
struct Screen<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) { content }
                .padding(16)
        }
        .background(Theme.bg.ignoresSafeArea())
        .scrollDismissesKeyboard(.interactively)
    }
}
