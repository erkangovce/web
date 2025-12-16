import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Barcode, AlertTriangle, Lock, Settings, CheckCircle2, RefreshCcw, Camera, ImagePlus } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ type: 'permission' | 'device' | 'generic', message: string } | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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
      // Ses hatası önemsiz
    }
  };

  const handleSuccessScan = useCallback((code: string) => {
    setLastScanned(code);
    playBeep();
    
    if (navigator.vibrate) navigator.vibrate(200);

    onScan(code);

    setTimeout(() => {
       setLastScanned(null);
    }, 2500);
  }, [onScan]);

  const startScanner = useCallback(async () => {
    setLoading(true);
    setErrorState(null);

    if (!codeReader.current) {
      codeReader.current = new BrowserMultiFormatReader();
    }

    try {
      if (!videoRef.current) return;

      // Canlı yayın denemesi
      await codeReader.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: 'environment',
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          }
        },
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            if (code !== lastScanned) {
               handleSuccessScan(code);
            }
          }
        }
      );
      
      setLoading(false);

    } catch (err: any) {
      console.error("Canlı kamera hatası:", err);
      setLoading(false);
      
      // Hata olsa bile kullanıcıya "Fotoğraf Çek" seçeneği sunacağımız için
      // durumu özel bir hata mesajıyla yönetelim.
      let message = "Canlı kamera başlatılamadı.";
      let type: 'permission' | 'device' | 'generic' = 'generic';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Canlı kamera izni reddedildi.";
        type = 'permission';
      } else if (err.name === 'NotFoundError') {
        message = "Kamera bulunamadı.";
        type = 'device';
      } else {
        message = `Uygulama içi kamera açılamadı. Lütfen aşağıdaki 'Fotoğraf Çek' butonunu kullanın.`;
      }
      
      setErrorState({ type, message });
    }
  }, [lastScanned, handleSuccessScan]);

  // Fotoğraf yükleme/çekme işleyicisi (Yedek Yöntem)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsProcessingImage(true);
    setLoading(true);

    if (!codeReader.current) {
      codeReader.current = new BrowserMultiFormatReader();
    }

    try {
      // Resmi URL'ye çevir
      const imageUrl = URL.createObjectURL(file);
      
      // ZXing ile resimden okumayı dene
      const result = await codeReader.current.decodeFromImageUrl(imageUrl);
      
      if (result) {
        handleSuccessScan(result.getText());
        // Başarılı olursa hata ekranını temizle (eğer varsa)
        setErrorState(null); 
      }
      
      URL.revokeObjectURL(imageUrl);
    } catch (err) {
      alert("Bu fotoğrafta barkod bulunamadı. Lütfen barkodun net çıktığından emin olun ve tekrar deneyin.");
    } finally {
      setIsProcessingImage(false);
      setLoading(false);
      // Inputu temizle ki aynı dosyayı tekrar seçebilsin
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerNativeCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    let timeout = setTimeout(() => {
       startScanner();
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, [startScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessScan(manualCode.trim());
      setManualCode('');
    }
  };

  // Hata veya Alternatif Mod Ekranı
  const renderFallbackMode = () => (
    <div className="flex flex-col items-center p-6 text-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border-2 border-slate-600 shadow-xl">
        <Camera size={40} className="text-blue-400" />
      </div>
      
      <h3 className="text-white font-bold text-xl mb-2">Canlı Kamera Açılamadı</h3>
      
      <p className="text-slate-400 text-sm mb-8 leading-relaxed">
        Uygulama izinleri veya cihaz uyumluluğu nedeniyle canlı tarama yapılamıyor. Sorun değil, fotoğraf çekerek devam edebilirsiniz.
      </p>

      <Button 
        onClick={triggerNativeCamera} 
        variant="primary" 
        fullWidth 
        className="mb-4 py-4 text-lg shadow-blue-500/20"
        icon={isProcessingImage ? <Loader2 className="animate-spin"/> : <Camera size={24} />}
      >
        {isProcessingImage ? 'İşleniyor...' : 'Fotoğraf Çek / Yükle'}
      </Button>

      <Button onClick={onClose} variant="secondary" fullWidth>
        İptal
      </Button>
      
      <div className="mt-4 text-xs text-slate-500">
        <p>İpucu: Barkodun net ve aydınlık olduğundan emin olun.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Gizli Dosya Inputu (Native Kamera için köprü) */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

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

      {/* Ana Görünüm Alanı */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-slate-900">
        
        {/* Video (Varsa göster, yoksa gizle ama DOM'da kalsın) */}
        <video 
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loading || errorState ? 'opacity-0' : 'opacity-100'}`}
            playsInline
            muted
        />

        {/* Yükleniyor */}
        {loading && !isProcessingImage && !errorState && (
           <div className="z-30 flex flex-col items-center">
             <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
             <p className="text-slate-400 font-medium">Kamera Başlatılıyor...</p>
           </div>
        )}

        {/* Fotoğraf İşleniyor */}
        {isProcessingImage && (
           <div className="z-50 absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur">
             <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
             <h3 className="text-xl text-white font-bold">Barkod Analiz Ediliyor...</h3>
           </div>
        )}

        {/* Hata Durumu (Fallback Modu) */}
        {errorState && (
            <div className="z-30 bg-slate-900 absolute inset-0 flex items-center justify-center">
                {renderFallbackMode()}
            </div>
        )}

        {/* Canlı Tarama Arayüzü (Her şey yolundaysa) */}
        {!loading && !errorState && !isProcessingImage && (
            <>
                <div className="relative z-10 w-72 h-48 border-2 border-blue-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500"></div>
                </div>
                
                <div className="relative z-10 mt-6 flex flex-col items-center gap-3">
                    <p className="text-white/80 text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur">
                        Barkodu okutun
                    </p>
                    {/* Canlı modda bile fotoğraf çekme opsiyonu verelim */}
                    <button 
                      onClick={triggerNativeCamera}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs transition-colors border border-white/20"
                    >
                      <ImagePlus size={16} />
                      Okumuyor mu? Fotoğraf Çek
                    </button>
                </div>
            </>
        )}

        {/* Başarılı Okuma Pop-up */}
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
               placeholder="Barkod girin..."
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