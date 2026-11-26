// 🔳 Kamera bilan QR skaner — faqat ilovada (VisionKit). Rasm hech qayerga yuborilmaydi.
import SwiftUI
import VisionKit
import AVFoundation

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
