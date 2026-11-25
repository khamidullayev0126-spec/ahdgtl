// 📸 Skrinshot va 🔳 QR — iPhone'ning o'zida (Apple Vision va VisionKit), internetsiz.
// Rasm hech qayerga yuborilmaydi: o'qilgan matn odatdagi Tekshir mexanizmidan o'tadi.
import SwiftUI
import Vision
import VisionKit
import AVFoundation

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

/// 🔳 Kamera bilan QR skaner (VisionKit DataScanner, iOS 16+, A12 va yangiroq iPhone).
struct QRScanner: UIViewControllerRepresentable {
    var onFound: (String) -> Void

    @MainActor static var supported: Bool { DataScannerViewController.isSupported }

    /// Kameraga ruxsat (birinchi marta — iPhone o'zi so'raydi).
    static func requestCamera() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: .video)
        default: return false
        }
    }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.qr])], qualityLevel: .balanced,
                                           recognizesMultipleItems: false, isHighFrameRateTrackingEnabled: false,
                                           isPinchToZoomEnabled: true, isGuidanceEnabled: true, isHighlightingEnabled: true)
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ vc: DataScannerViewController, context: Context) {
        if !vc.isScanning { try? vc.startScanning() }
    }

    static func dismantleUIViewController(_ vc: DataScannerViewController, coordinator: Coordinator) { vc.stopScanning() }

    func makeCoordinator() -> Coordinator { Coordinator(onFound: onFound) }

    @MainActor final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onFound: (String) -> Void
        private var done = false
        init(onFound: @escaping (String) -> Void) { self.onFound = onFound }

        func dataScanner(_ scanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !done else { return }
            for item in addedItems {
                if case .barcode(let code) = item, let value = code.payloadStringValue, !value.isEmpty {
                    done = true
                    scanner.stopScanning()
                    onFound(value)
                    return
                }
            }
        }
    }
}
