import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Barcode, AlertTriangle, Lock, Settings, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Button } from './Button';
import { ScanMode } from '../types';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface ScannerViewProps {
  mode: ScanMode;
  onScan: (code: string) => void;
  onClose: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ mode, onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ type: 'permission' | 'device' | 'generic', message: string } | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // Ses oynatma
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

      oscillator.start();
      setTimeout(() => {
          oscillator.stop();
          audioContext.close();
      }, 100);
    } catch (e) {
      console.error("Ses çalınamadı", e);
    }
  };

  const startScanner = useCallback(async () => {
    setLoading(true);
    setErrorState(null);

    // 1. ZXing Okuyucuyu Hazırla
    if (!codeReader.current) {
      codeReader.current = new BrowserMultiFormatReader();
    }

    try {
      // 2. Video elementini bekle
      if (!videoRef.current) {
        console.error("Video elementi bulunamadı");
        return;
      }

      // 3. Kamerayı başlat ve taramaya başla
      // decodeFromVideoDevice metodunu kullanıyoruz, bu hem stream'i açar hem de decode eder.
      // undefined vererek varsayılan arka kamerayı seçmesini istiyoruz.
      await codeReader.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: 'environment', // Arka kamera önceliği
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          }
        },
        videoRef.current,
        (result, err) => {
          // Tarama sonucu varsa
          if (result) {
            const code = result.getText();
            // Debounce: Aynı kodu üst üste çok hızlı okumasın
            if (code !== lastScanned) {
               handleSuccessScan(code);
            }
          }
          // Hata varsa (genellikle "bulunamadı" hatası sürekli döner, bunu yoksayıyoruz)
          if (err && !(err instanceof NotFoundException)) {
            // Ciddi hata
            console.warn("Tarama hatası:", err);
          }
        }
      );
      
      setLoading(false);

    } catch (err: any) {
      console.error("Kamera başlatılamadı:", err);
      setLoading(false);
      
      let message = "Kamera başlatılamadı.";
      let type: 'permission' | 'device' | 'generic' = 'generic';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Kamera izni reddedildi.";
        type = 'permission';
      } else if (err.name === 'NotFoundError') {
        message = "Kamera bulunamadı.";
        type = 'device';
      } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        message = "Güvenlik nedeniyle HTTP üzerinden kamera açılamaz. Lütfen HTTPS kullanın.";
      } else {
        message = `Hata: ${err.message || err}`;
      }
      
      setErrorState({ type, message });
    }
  }, [lastScanned]);

  const handleSuccessScan = (code: string) => {
    // Ekranda göster
    setLastScanned(code);
    playBeep();
    
    // Titreşim
    if (navigator.vibrate) navigator.vibrate(200);

    // Üst bileşene bildir
    onScan(code);

    // 2.5 saniye sonra ekrandaki "Okundu" yazısını kaldır
    setTimeout(() => {
       setLastScanned(null);
    }, 2500);
  };

  useEffect(() => {
    // Component mount olduğunda başlat
    let timeout = setTimeout(() => {
       startScanner();
    }, 500); // DOM'un tam oturması için kısa bir gecikme

    return () => {
      clearTimeout(timeout);
      // Temizlik: Kamerayı durdur
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessScan(manualCode.trim());
      setManualCode('');
    }
  };

  // Hata ekranı render fonksiyonu
  const renderError = () => (
    <div className="flex flex-col items-center p-6 text-center max-w-sm w-full">
      <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-900">
        <AlertTriangle size={32} />
      </div>
      <h3 className="text-white font-bold text-lg mb-2">Kamera Sorunu</h3>
      
      {errorState?.type === 'permission' ? (
        <div className="bg-slate-800/80 p-4 rounded-lg text-left text-sm text-slate-300 mb-6 border border-slate-700 w-full">
            <p className="mb-3 font-semibold text-white">İzin Vermek İçin:</p>
            <div className="flex items-start gap-3 mb-3">
                <Lock className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>Tarayıcı adres çubuğundaki kilit simgesine tıklayın.</div>
            </div>
            <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-green-400 mt-0.5" />
                <div>"Kamera" iznini aktif hale getirin ve sayfayı yenileyin.</div>
            </div>
        </div>
      ) : (
        <p className="text-slate-300 text-sm mb-6 bg-red-950/50 p-3 rounded border border-red-900/30">
          {errorState?.message}
        </p>
      )}

      <div className="flex flex-col gap-3 w-full">
        <Button onClick={() => window.location.reload()} variant="primary" fullWidth icon={<RefreshCcw size={18} />}>
            Sayfayı Yenile
        </Button>
        <Button onClick={onClose} variant="secondary" fullWidth>
            Kapat
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Üst Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            {mode === 'single' ? 'Tekli Mod' : 'Seri Mod'}
          </span>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-sm hover:bg-white/20">
          <X size={24} />
        </button>
      </div>

      {/* Kamera Alanı */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-slate-900">
        {/* Video Elementi: Her zaman DOM'da olmalı ki kütüphane bağlanabilsin */}
        <video 
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loading || errorState ? 'opacity-0' : 'opacity-100'}`}
            playsInline
            muted
        />

        {/* Yükleniyor Göstergesi */}
        {loading && !errorState && (
           <div className="z-30 flex flex-col items-center">
             <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
             <p className="text-slate-400 font-medium">Kamera Başlatılıyor...</p>
           </div>
        )}

        {/* Hata Ekranı */}
        {errorState && (
            <div className="z-30 bg-slate-900/95 absolute inset-0 flex items-center justify-center">
                {renderError()}
            </div>
        )}

        {/* Tarama Arayüzü (Kamera aktifken) */}
        {!loading && !errorState && (
            <>
                <div className="relative z-10 w-72 h-48 border-2 border-blue-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                    {/* Köşeler */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500"></div>
                </div>
                <p className="relative z-10 mt-6 text-white/80 text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur">
                    Barkodu okutun
                </p>
            </>
        )}

        {/* Başarılı Okuma Bildirimi */}
        {lastScanned && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-2xl transform scale-110">
                    <div className="bg-green-100 p-3 rounded-full mb-3">
                        <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{lastScanned}</h2>
                    <p className="text-slate-500 text-sm">Başarıyla Eklendi</p>
                </div>
            </div>
        )}
      </div>

      {/* Alt Alan */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 safe-area-bottom z-20">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
           <div className="relative flex-1">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Barcode className="h-5 w-5 text-slate-500" />
             </div>
             <input
               type="text"
               value={manualCode}
               onChange={(e) => setManualCode(e.target.value)}
               placeholder="Okumuyorsa elle girin..."
               className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-700 focus:border-blue-500"
               inputMode="numeric"
             />
           </div>
           <Button type="submit" variant="secondary" className="px-5 font-bold">
             EKLE
           </Button>
        </form>
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};