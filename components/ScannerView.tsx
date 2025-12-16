import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Loader2, Barcode, RefreshCcw, AlertTriangle, Lock, Settings, Globe } from 'lucide-react';
import { Button } from './Button';
import { ScanMode } from '../types';

interface ScannerViewProps {
  mode: ScanMode;
  onScan: (code: string) => void;
  onClose: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ mode, onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false); // Kullanıcı açıkça reddetti mi?
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Kamerayı başlatma fonksiyonu
  const startCamera = async () => {
    setLoading(true);
    setPermissionError(false);
    setPermissionDenied(false);
    setErrorMessage('');

    // Güvenli bağlam kontrolü (HTTPS veya localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
       console.warn("Güvenli olmayan bağlam (HTTP) tespit edildi. Kamera çalışmayabilir.");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError(true);
      setErrorMessage("Tarayıcınız kamera erişimini desteklemiyor veya güvenli olmayan bir bağlantı (HTTP) kullanıyorsunuz. Lütfen HTTPS kullanın.");
      setLoading(false);
      return;
    }

    try {
      // Önce arka kamerayı dene
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      handleStream(mediaStream);
    } catch (err) {
      console.warn("Arka kamera açılamadı, genel kamera izni deneniyor...", err);
      try {
        // Fallback: Herhangi bir video kaynağı
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });
        handleStream(fallbackStream);
      } catch (finalErr: any) {
        console.error("Kamera hatası:", finalErr);
        setPermissionError(true);
        
        let msg = "Kamera başlatılamadı.";
        
        if (finalErr.name === 'NotAllowedError' || finalErr.name === 'PermissionDeniedError') {
            msg = "Kamera izni reddedildi.";
            setPermissionDenied(true);
        } else if (finalErr.name === 'NotFoundError') {
            msg = "Kamera cihazı bulunamadı.";
        } else if (finalErr.name === 'NotReadableError') {
            msg = "Kamera donanımına erişilemiyor (başka bir uygulama kullanıyor olabilir).";
        } else if (window.location.protocol === 'http:') {
            msg = "Güvenlik nedeniyle HTTP üzerinden kamera açılamaz. Lütfen HTTPS kullanın.";
        } else {
            msg = `Hata detayı: ${finalErr.message || finalErr.name}`;
        }
        
        setErrorMessage(msg);
        setLoading(false);
      }
    }
  };

  const handleStream = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setLoading(false); 
  };

  // Stream ve Video Element Eşleşmesi
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.log("Otomatik oynatma hatası (önemsiz):", e));
    }
  }, [stream, loading]);

  // İlk yükleme
  useEffect(() => {
    let mounted = true;
    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Temizlik
  useEffect(() => {
    return () => {
       if (stream) {
           stream.getTracks().forEach(track => track.stop());
       }
    };
  }, [stream]);


  // Manuel Giriş İşlemleri
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processCode(manualCode.trim());
      setManualCode('');
    }
  };

  const processCode = useCallback((code: string) => {
    setLastScanned(code);
    onScan(code);
    setTimeout(() => setLastScanned(null), 2000);
  }, [onScan]);

  const simulateScan = () => {
    const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    processCode(randomCode);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Üst Kontroller */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            {mode === 'single' ? 'Tekli Okuma' : 'Seri / Stok'}
          </span>
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
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            {/* Tarama Çerçevesi */}
            <div className="relative z-10 w-72 h-48 border-2 border-blue-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
               <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
               <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-0.5 -ml-0.5"></div>
               <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-0.5 -mr-0.5"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-0.5 -ml-0.5"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-0.5 -mr-0.5"></div>
            </div>
            
            <p className="relative z-10 mt-8 text-white/70 text-sm font-medium bg-black/50 px-4 py-1 rounded-full">
              Barkodu çerçeve içine alın
            </p>

            {lastScanned && (
              <div className="absolute bottom-32 z-20 bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce">
                Okundu: {lastScanned}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center p-6 text-center max-w-sm px-4 w-full overflow-y-auto max-h-[80vh]">
            {loading ? (
               <>
                 <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                 <p className="text-slate-400">Kamera başlatılıyor...</p>
                 <p className="text-xs text-slate-600 mt-2">Lütfen bekleyin...</p>
               </>
            ) : (
                <>
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-900 shrink-0">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Kamera İzni Gerekli</h3>
                    
                    {permissionDenied ? (
                        <div className="bg-slate-800/80 p-4 rounded-lg text-left text-sm text-slate-300 mb-6 border border-slate-700 w-full">
                            <p className="mb-3 font-semibold text-white">İzin nasıl açılır?</p>
                            
                            <div className="flex items-start gap-3 mb-3">
                                <Lock className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <span className="text-white">Adım 1:</span> Adres çubuğundaki (URL) <span className="text-blue-400 font-bold">Kilit</span> veya <span className="text-blue-400 font-bold">Ayarlar</span> simgesine tıklayın.
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 mb-3">
                                <Settings className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <span className="text-white">Adım 2:</span> "İzinler" veya "Site Ayarları" kısmından <span className="text-green-400 font-bold">Kamera</span>'yı bulup "İzin Ver" (Allow) seçin.
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <span className="text-white">Adım 3:</span> Sayfayı yenileyin veya "Tekrar Dene" butonuna basın.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                          {errorMessage}
                        </p>
                    )}

                    <div className="space-y-3 w-full">
                      <Button onClick={() => window.location.reload()} variant="primary" fullWidth icon={<RefreshCcw size={18} />}>
                          Sayfayı Yenile
                      </Button>
                      <Button onClick={onClose} variant="secondary" fullWidth>
                          İptal
                      </Button>
                    </div>
                </>
            )}
          </div>
        )}
      </div>

      {/* Alt Kontroller / Manuel Giriş */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 pb-8 safe-area-bottom">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
           <div className="relative flex-1">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Barcode className="h-5 w-5 text-slate-500" />
             </div>
             <input
               type="text"
               value={manualCode}
               onChange={(e) => setManualCode(e.target.value)}
               placeholder="Barkodu manuel girin..."
               className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-700 focus:border-blue-500 transition-colors"
               autoFocus={false} 
             />
           </div>
           <Button type="submit" variant="secondary" className="px-6">
             Ekle
           </Button>
        </form>
        
        <div className="mt-4 flex justify-center">
             <button 
               type="button" 
               onClick={simulateScan}
               className="text-xs text-slate-500 underline hover:text-blue-400"
             >
               (Test: Rastgele Barkod Oluştur)
             </button>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};