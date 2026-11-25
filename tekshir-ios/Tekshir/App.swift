// Tekshir — iPhone ilovasi. 5 ta bo'lim: Himoya, Tekshirish, Tarix, Maslahat, Sozlama.
import SwiftUI

@main
struct TekshirApp: App {
    @StateObject private var store = Store()
    @StateObject private var checker = Checker()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(checker)
                .preferredColorScheme(.dark)
        }
    }
}

enum AppTab: Hashable { case home, check, history, tips, settings }

struct RootView: View {
    @EnvironmentObject var store: Store
    @State private var tab: AppTab = .home

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { HomeView(tab: $tab) }
                .tabItem { Label(store.t("tab_home"), systemImage: "shield.lefthalf.filled") }.tag(AppTab.home)
            NavigationStack { CheckView() }
                .tabItem { Label(store.t("tab_check"), systemImage: "magnifyingglass") }.tag(AppTab.check)
            NavigationStack { HistoryView() }
                .tabItem { Label(store.t("tab_hist"), systemImage: "clock") }.tag(AppTab.history)
            NavigationStack { TipsView() }
                .tabItem { Label(store.t("tab_tips"), systemImage: "lightbulb") }.tag(AppTab.tips)
            NavigationStack { SettingsView() }
                .tabItem { Label(store.t("tab_set"), systemImage: "gearshape") }.tag(AppTab.settings)
        }
        .tint(Theme.safe)
        .onAppear {
            // Pastki menyu va sarlavhalar to'q fonda
            let tb = UITabBarAppearance(); tb.configureWithOpaqueBackground(); tb.backgroundColor = UIColor(Theme.surface)
            UITabBar.appearance().standardAppearance = tb; UITabBar.appearance().scrollEdgeAppearance = tb
            let nb = UINavigationBarAppearance(); nb.configureWithOpaqueBackground(); nb.backgroundColor = UIColor(Theme.bg)
            nb.titleTextAttributes = [.foregroundColor: UIColor(Theme.text)]; nb.largeTitleTextAttributes = [.foregroundColor: UIColor(Theme.text)]
            UINavigationBar.appearance().standardAppearance = nb; UINavigationBar.appearance().scrollEdgeAppearance = nb
        }
    }
}
