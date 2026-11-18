// Faqat kompyuterda sinash uchun: tekshiruv mexanizmini Android'siz kompilyatsiya qilib, testlarni ishga tushiradi.
// Android ilovaning o'zi Android Studio'da (app/ papkasi) yig'iladi.
pluginManagement { repositories { mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { mavenCentral() } }
rootProject.name = "tekshir-engine"
