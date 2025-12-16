import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Zap, Loader2, Barcode } from 'lucide-react';
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
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // Initialize Camera
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        if (mounted) setPermissionError(true);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Manual Entry
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
    // Clear the "Last scanned" message after a delay
    setTimeout(() => setLastScanned(null), 2000);
  }, [onScan]);

  // Simulation function for demo purposes (since we can't guarantee a real barcode in front of the screen)
  const simulateScan = () => {
    const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    processCode(randomCode);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            {mode === 'single' ? 'Single Scan' : 'Series / Inventory'}
          </span>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-sm">
          <X size={24} />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-slate-900">
        {!permissionError ? (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            {/* Scanner Overlay UI */}
            <div className="relative z-10 w-72 h-48 border-2 border-blue-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
               {/* Laser Line Animation */}
               <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
               
               {/* Corner Markers */}
               <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-0.5 -ml-0.5"></div>
               <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-0.5 -mr-0.5"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-0.5 -ml-0.5"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-0.5 -mr-0.5"></div>
            </div>
            
            <p className="relative z-10 mt-8 text-white/70 text-sm font-medium">
              Align barcode within frame
            </p>

            {lastScanned && (
              <div className="absolute bottom-32 z-20 bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce">
                Scanned: {lastScanned}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center p-6 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
              <Camera size={32} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Camera Access Required</h3>
            <p className="text-slate-400 text-sm mb-6">
              We couldn't access your camera. Please check permissions or use manual entry below.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls / Manual Entry */}
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
               placeholder="Enter barcode manually..."
               className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-700 focus:border-blue-500 transition-colors"
               autoFocus
             />
           </div>
           <Button type="submit" variant="secondary" className="px-6">
             Add
           </Button>
        </form>
        
        {/* Simulation Button for Demo Purposes */}
        <div className="mt-4 flex justify-center">
             <button 
               type="button" 
               onClick={simulateScan}
               className="text-xs text-slate-500 underline hover:text-blue-400"
             >
               (Simulate Scan Event)
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