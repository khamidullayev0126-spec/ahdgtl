// 📸 Skrinshot — rasmdagi matn va QR iPhone'ning o'zida (Apple Vision), internetsiz. Ilova va ulashish kengaytmasi uchun umumiy.
// Rasm hech qayerga yuborilmaydi: o'qilgan matn odatdagi Tekshir mexanizmidan o'tadi.
import SwiftUI
import Vision

enum ImageScan {
    struct Out { var text: String; var qr: [String] }

    /// Rasmdagi matn (o'zbek lotin, rus) va QR kodlarni o'qiydi.
    static func read(_ image: UIImage) async -> Out {
        guard let cg = image.cgImage else { return Out(text: "", qr: []) }
        let orientation = CGImagePropertyOrientation(image.imageOrientation)
        return await withCheckedContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                let textReq = VNRecognizeTextRequest()
                textReq.recognitionLevel = .accurate
                textReq.usesLanguageCorrection = false        // havola va raqamlarni «tuzatib» yubormasin
                let supported = (try? textReq.supportedRecognitionLanguages()) ?? []
                textReq.recognitionLanguages = ["en-US", "ru-RU"].filter { supported.contains($0) }   // o'zbek lotini — lotin harflari
                let qrReq = VNDetectBarcodesRequest()
                qrReq.symbologies = [.qr]
                let handler = VNImageRequestHandler(cgImage: cg, orientation: orientation, options: [:])
                try? handler.perform([textReq, qrReq])
                let text = (textReq.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
                var seen = Set<String>()
                let qr = (qrReq.results ?? []).compactMap { $0.payloadStringValue }.filter { seen.insert($0).inserted }
                cont.resume(returning: Out(text: text.trimmingCharacters(in: .whitespacesAndNewlines), qr: qr))
            }
        }
    }
}

extension CGImagePropertyOrientation {
    init(_ o: UIImage.Orientation) {
        switch o {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
