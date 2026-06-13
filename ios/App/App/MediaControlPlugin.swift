import Foundation
import Capacitor
import AVFoundation
import MediaPlayer
import UIKit

@objc(MediaControlPlugin)
public class MediaControlPlugin: CAPPlugin {
    private var audioSessionContext = 0
    private var observingVolume = false
    // Echo suppression for app-initiated writes
    private var lastWrittenVolumePct: Int = -1
    private var lastWrittenAt: TimeInterval = 0
    private let echoSuppressInterval: TimeInterval = 0.8

    override public func load() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // ignore — we still want to observe outputVolume
        }
        AVAudioSession.sharedInstance().addObserver(
            self,
            forKeyPath: "outputVolume",
            options: [.new],
            context: &audioSessionContext
        )
        observingVolume = true
    }

    deinit {
        if observingVolume {
            AVAudioSession.sharedInstance().removeObserver(self, forKeyPath: "outputVolume")
            observingVolume = false
        }
    }

    public override func observeValue(
        forKeyPath keyPath: String?,
        of object: Any?,
        change: [NSKeyValueChangeKey: Any]?,
        context: UnsafeMutableRawPointer?
    ) {
        if context == &audioSessionContext, keyPath == "outputVolume" {
            if let v = change?[.newKey] as? Float {
                let pct = Int(round(v * 100))
                let now = Date.timeIntervalSinceReferenceDate
                if now - lastWrittenAt < echoSuppressInterval
                    && abs(pct - lastWrittenVolumePct) <= 1 {
                    return
                }
                self.notifyListeners("systemVolumeChanged", data: ["volume": pct])
            }
        } else {
            super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
        }
    }

    @objc func getSystemVolume(_ call: CAPPluginCall) {
        let v = AVAudioSession.sharedInstance().outputVolume
        call.resolve(["volume": Int(round(v * 100))])
    }

    @objc func setSystemVolume(_ call: CAPPluginCall) {
        let pct = call.getInt("volume") ?? 0
        let target = max(0.0, min(1.0, Float(pct) / 100.0))
        // Mark window before main-thread dispatch so KVO callbacks during
        // this write are suppressed.
        self.lastWrittenVolumePct = pct
        self.lastWrittenAt = Date.timeIntervalSinceReferenceDate
        DispatchQueue.main.async {
            var found = false
            let volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
            volumeView.isHidden = false
            volumeView.alpha = 0.001

            // Attach to a window so the underlying UISlider is realized.
            var attachedWindow: UIWindow?
            if #available(iOS 13.0, *) {
                for scene in UIApplication.shared.connectedScenes {
                    if let windowScene = scene as? UIWindowScene {
                        if let w = windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first {
                            attachedWindow = w
                            break
                        }
                    }
                }
            }
            if attachedWindow == nil {
                attachedWindow = UIApplication.shared.windows.first
            }
            attachedWindow?.addSubview(volumeView)

            // Give the view a tick to set up its subviews, then set the slider value.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                for sub in volumeView.subviews {
                    if let slider = sub as? UISlider {
                        slider.setValue(target, animated: false)
                        // Trigger value-changed actions so the system picks it up.
                        slider.sendActions(for: .valueChanged)
                        found = true
                        break
                    }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    volumeView.removeFromSuperview()
                    let cur = AVAudioSession.sharedInstance().outputVolume
                    let curPct = Int(round(cur * 100))
                    // Refresh suppression window with actual value
                    self.lastWrittenVolumePct = curPct
                    self.lastWrittenAt = Date.timeIntervalSinceReferenceDate
                    call.resolve([
                        "success": found,
                        "volume": curPct
                    ])
                }
            }
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "a2dpConnected": false,
            "deviceName": "",
            "musicActive": false,
            "notificationEnabled": false,
            "title": "",
            "artist": "",
            "album": "",
            "isPlaying": false,
            "duration": 0,
            "position": 0
        ])
    }

    @objc func sendMediaCommand(_ call: CAPPluginCall) {
        call.resolve(["success": false])
    }

    @objc func openNotificationSettings(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func isNotificationListenerEnabled(_ call: CAPPluginCall) {
        call.resolve(["enabled": true])
    }

    @objc func startDiscovery(_ call: CAPPluginCall) {
        call.resolve(["started": false])
    }

    @objc func stopDiscovery(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func getDiscoveredDevices(_ call: CAPPluginCall) {
        call.resolve([
            "devices": [],
            "isDiscovering": false
        ])
    }

    @objc func bondDevice(_ call: CAPPluginCall) {
        call.resolve(["success": false])
    }

    @objc func connectA2dp(_ call: CAPPluginCall) {
        call.resolve(["success": false])
    }
}
