import React, { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { X, ScanLine } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setError('');
      setScanned(false);
      return;
    }

    let active = true;
    let skipFrames = 0;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();
          tick();
        }
      } catch (e: any) {
        console.error('[QR] Camera error:', e);
        setError(e?.message || 'Camera access denied');
      }
    };

    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        skipFrames++;
        if (skipFrames % 3 !== 0) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const maxSize = 640;
          let w = video.videoWidth;
          let h = video.videoHeight;
          if (w > h && w > maxSize) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else if (h > maxSize) {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code?.data) {
            active = false;
            setScanned(true);
            stopCamera();
            onScan(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, onScan, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-12 pb-4">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white">
          <X size={20} />
        </button>
        <span className="text-white font-medium text-[15px]">Scan QR Code</span>
        <div className="w-10" />
      </div>

      {/* Video */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
        {/* Scan overlay */}
        {!scanned && !error && (
          <div className="relative z-10">
            <div className="w-[240px] h-[240px] border-2 border-white/60 rounded-[20px] relative">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#0A5BC4] rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#0A5BC4] rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#0A5BC4] rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#0A5BC4] rounded-br-lg" />
              {/* Scan line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#0A5BC4] animate-[scan_2s_linear_infinite] shadow-[0_0_8px_rgba(10,91,196,0.8)]" />
            </div>
            <p className="text-white/70 text-[13px] text-center mt-6">Align QR code within frame</p>
          </div>
        )}

        {scanned && (
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#0A5BC4] flex items-center justify-center mb-4">
              <ScanLine size={28} className="text-white" />
            </div>
            <p className="text-white font-medium text-[16px]">QR Code detected</p>
          </div>
        )}

        {error && (
          <div className="relative z-10 px-8 text-center">
            <p className="text-red-400 font-medium text-[16px] mb-2">Camera Error</p>
            <p className="text-white/70 text-[14px]">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-[#0A5BC4] text-white rounded-xl text-[14px] font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 1; }
          50% { top: 100%; opacity: 1; }
          51% { opacity: 0; }
          100% { top: 0; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
