// 9-bosqich: 📸 skrinshot va 🔳 QR kod.
// Hammasi TELEFONNING O'ZIDA (Google ML Kit, internetsiz): rasm hech qayerga yuborilmaydi.
// Rasmdan o'qilgan matn odatdagi Tekshir mexanizmidan o'tadi (Engine.check).
package uz.ahdigital.tekshir.guard

import android.content.Context
import android.net.Uri
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** text — rasmdagi yozuv, qr — rasmdagi QR kodlar ichidagi ma'lumot. */
data class ImageText(val text: String, val qr: List<String>)

object ImageScan {
    /** Rasmni o'qiydi. null — rasmni ochib bo'lmadi. */
    suspend fun read(ctx: Context, uri: Uri): ImageText? {
        val img = try { InputImage.fromFilePath(ctx, uri) } catch (_: Exception) { return null }
        val text = runCatching {
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).use { it.process(img).await().text }
        }.getOrDefault("")
        val qr = runCatching {
            val opts = BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
            BarcodeScanning.getClient(opts).use { c -> c.process(img).await().mapNotNull { it.rawValue } }
        }.getOrDefault(emptyList())
        return ImageText(text.trim(), qr.distinct())
    }

    /**
     * Kamera bilan QR skanerlash — Google Play xizmatlarining tayyor oynasi.
     * Kamera ruxsati KERAK EMAS: kamerani Google oynasi ochadi, Tekshir faqat QR ichidagi matnni oladi.
     * onResult(null) — foydalanuvchi bekor qildi; onFail — skaner ishlamadi (Play xizmatlari yo'q yoki eski).
     */
    fun scanQr(ctx: Context, onResult: (String?) -> Unit, onFail: () -> Unit) {
        val opts = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        try {
            GmsBarcodeScanning.getClient(ctx, opts).startScan()
                .addOnSuccessListener { onResult(it.rawValue) }
                .addOnCanceledListener { onResult(null) }
                .addOnFailureListener { onFail() }
        } catch (_: Exception) { onFail() }
    }

    private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { c ->
        addOnSuccessListener { c.resume(it) }
        addOnFailureListener { c.resumeWithException(it) }
        addOnCanceledListener { c.cancel() }
    }
}
