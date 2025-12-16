import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Loader2, Barcode, RefreshCcw, AlertTriangle, Lock, Settings, Globe, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { ScanMode } from '../types';

// TypeScript için BarcodeDetector tanımı (Tarayıcıda native olarak varsa)
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

interface ScannerViewProps {
  mode: ScanMode;
  onScan: (code: string) => void;
  onClose: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ mode, onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const scanInterval = useRef<any>(null);

  // Ses efekti için
  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
        audioContext.close();
    }, 100);
  };

  const startCamera = async () => {
    setLoading(true);
    setPermissionError(false);
    setPermissionDenied(false);
    setErrorMessage('');

    // Güvenli bağlam kontrolü
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
       console.warn("Güvenli olmayan bağlam (HTTP).");
    }

    // BarcodeDetector Desteği Kontrolü
    if (!('BarcodeDetector' in window)) {
       console.warn("Barcode Detector API desteklenmiyor.");
       setIsSupported(false);
       // Kamera yine de açılır ama otomatik okumaz
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError(true);
      setErrorMessage("Tarayıcı kamera API'sini desteklemiyor. Lütfen Chrome (Android) veya Safari (iOS) güncel sürüm kullanın.");
      setLoading(false);
      return;
    }

    try {
      const constraints = {
        video: {
            facingMode: 'environment', // Arka kamera
            width: { ideal: 1280 },
            height: { ideal: 720 },
            focusMode: 'continuous' // Otomatik odaklama (destekleniyorsa)
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints as any);
      handleStream(mediaStream);
    } catch (err) {
      console.warn("Kamera başlatma hatası:", err);
      // Fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        handleStream(fallbackStream);
      } catch (finalErr: any) {
        handleCameraError(finalErr);
      }
    }
  };

  const handleCameraError = (error: any) => {
    setPermissionError(true);
    setLoading(false);
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setErrorMessage("Kamera izni reddedildi.");
    } else if (error.name === 'NotFoundError') {
        setErrorMessage("Kamera cihazı bulunamadı.");
    } else if (window.location.protocol === 'http:') {
        setErrorMessage("Güvenlik nedeniyle HTTP üzerinden kamera açılamaz. Lütfen HTTPS kullanın.");
    } else {
        setErrorMessage(`Kamera hatası: ${error.message}`);
    }
  };

  const handleStream = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setLoading(false);
    
    // Video elementine bağla
    if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play error:", e));
            startScanning(); // Görüntü gelince taramaya başla
        };
    }
  };

  const startScanning = async () => {
    if (!('BarcodeDetector' in window)) return;
    
    // Desteklenen formatlar
    const formats = await window.BarcodeDetector.getSupportedFormats();
    const detector = new window.BarcodeDetector({ formats });

    const detectLoop = async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
            scanInterval.current = requestAnimationFrame(detectLoop);
            return;
        }

        try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                // Aynı kodu tekrar tekrar okumayı engelle (debounce)
                if (code !== lastScanned) {
                    handleSuccessScan(code);
                }
            }
        } catch (e) {
            // Hata olursa sessizce devam et
        }
        scanInterval.current = requestAnimationFrame(detectLoop);
    };

    scanInterval.current = requestAnimationFrame(detectLoop);
  };

  const handleSuccessScan = (code: string) => {
    // Görsel Geri Bildirim
    setLastScanned(code);
    
    // Sesli Geri Bildirim
    playBeep();

    // Titreşim (Mobil cihazlar için)
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }

    // İşlem
    onScan(code);

    // 2 saniye bekle (Debounce reset)
    setTimeout(() => {
        setLastScanned(null);
    }, 2000);
  };

  // Feneri Aç/Kapa
  const toggleTorch = () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
        track.applyConstraints({
            advanced: [{ torch: !torchEnabled }]
        } as any).then(() => {
            setTorchEnabled(!torchEnabled);
        }).catch(e => console.log(e));
    } else {
        alert("Cihazınız fener özelliğini desteklemiyor.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (scanInterval.current) cancelAnimationFrame(scanInterval.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manuel Giriş
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessScan(manualCode.trim());
      setManualCode('');
    }
  };

  const simulateScan = () => {
    const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    handleSuccessScan(randomCode);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Üst Kontroller */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                {mode === 'single' ? 'Tekli' : 'Seri'}
            </span>
            </div>
            {stream && (
                <button onClick={toggleTorch} className="p-2 bg-black/40 rounded-full text-white border border-white/10">
                    <Zap size={18} className={torchEnabled ? "text-yellow-400 fill-current" : "text-slate-400"} />
                </button>
            )}
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Kamera Alanı */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-slate-900">
        {!permissionError && !loading ? (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Tarama Çerçevesi */}
            <div className="relative z-10 w-72 h-48 border-2 border-blue-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
               
               {/* Köşe İşaretçileri */}
               <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
               <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
               <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
               <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
            </div>
            
            <div className="relative z-10 mt-6 flex flex-col items-center gap-2">
                <p className="text-white/90 text-sm font-medium bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm">
                Barkodu çerçeve içine alın
                </p>
                {!isSupported && (
                    <p className="text-red-400 text-xs bg-red-900/80 px-3 py-1 rounded border border-red-500/50">
                        Cihazınız otomatik taramayı desteklemiyor. Manuel giriniz.
                    </p>
                )}
            </div>

            {lastScanned && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center animate-bounce">
                <div className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-2">
                    <CheckCircle2 size={32} />
                </div>
                <div className="bg-white text-green-700 px-4 py-1 rounded-full font-bold shadow-lg">
                    {lastScanned}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center p-6 text-center max-w-sm px-4 w-full overflow-y-auto max-h-[80vh]">
            {loading ? (
               <>
                 <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                 <p className="text-slate-400">Kamera ve Barkod Okuyucu Başlatılıyor...</p>
               </>
            ) : (
                <>
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-900 shrink-0">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Erişim Sorunu</h3>
                    
                    {permissionDenied ? (
                        <div className="bg-slate-800/80 p-4 rounded-lg text-left text-sm text-slate-300 mb-6 border border-slate-700 w-full">
                            <p className="mb-3 font-semibold text-white">1. Adres Çubuğuna Tıklayın</p>
                            <div className="flex items-center gap-2 mb-2 text-xs">
                                <Lock className="w-4 h-4 text-blue-400" /> Kilit simgesi veya Ayarlar
                            </div>
                            <p className="mb-3 font-semibold text-white mt-4">2. İzinleri Açın</p>
                            <div className="flex items-center gap-2 mb-2 text-xs">
                                <Settings className="w-4 h-4 text-green-400" /> Kamera > İzin Ver (Allow)
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed bg-red-900/20 p-3 rounded border border-red-900/50">
                          {errorMessage}
                        </p>
                    )}

                    <Button onClick={() => window.location.reload()} variant="primary" fullWidth icon={<RefreshCcw size={18} />}>
                        Yeniden Yükle
                    </Button>
                </>
            )}
          </div>
        )}
      </div>

      {/* Alt Kontroller */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 safe-area-bottom">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
           <div className="relative flex-1">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Barcode className="h-5 w-5 text-slate-500" />
             </div>
             <input
               type="text"
               value={manualCode}
               onChange={(e) => setManualCode(e.target.value)}
               placeholder="Barkod yaz..."
               className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-700 focus:border-blue-500 transition-colors"
               inputMode="numeric"
             />
           </div>
           <Button type="submit" variant="secondary" className="px-4 whitespace-nowrap">
             Ekle
           </Button>
        </form>
        <button 
           type="button" 
           onClick={simulateScan}
           className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400"
         >
           Test Modu: Rastgele Barkod Ekle
         </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};