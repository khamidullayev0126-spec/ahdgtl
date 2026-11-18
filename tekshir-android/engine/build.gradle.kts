plugins { kotlin("jvm") version "2.0.21" }

dependencies {
    // Android'da org.json tizimning o'zida bor; kompyuterda sinash uchun alohida kutubxona
    implementation("org.json:json:20240303")
    testImplementation(kotlin("test"))
}

kotlin { jvmToolchain(21) }
tasks.test { useJUnitPlatform(); testLogging { events("failed"); showStandardStreams = true } }
