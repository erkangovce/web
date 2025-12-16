import React, { useState, useEffect } from 'react';
import { QrCode, Layers, Settings, History, Trash2, RefreshCw, Download, Wifi, WifiOff } from 'lucide-react';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { ScannerView } from './components/ScannerView';
import { getStoredItems, saveStoredItems, getSettings, saveSettings, clearData, syncToRemote, exportToTxt } from './services/storageService';
import { ScannedItem, AppSettings, ScanMode } from './types';

type View = 'home' | 'settings' | 'scanning' | 'history';

function App() {
  const [view, setView] = useState<View>('home');
  const [mode, setMode] = useState<ScanMode>('single');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load data on mount and setup listeners
  useEffect(() => {
    setItems(getStoredItems());
    setSettingsState(getSettings());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save items whenever they change
  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  const handleScan = (code: string) => {
    const timestamp = Date.now();
    
    setItems(prevItems => {
      let newItems = [...prevItems];

      if (mode === 'series') {
        // Series Mode: Check if item exists, increment quantity
        const existingIndex = newItems.findIndex(item => item.code === code);
        if (existingIndex >= 0) {
          // Move to top and increment
          const existingItem = newItems[existingIndex];
          newItems.splice(existingIndex, 1);
          newItems.unshift({
            ...existingItem,
            quantity: existingItem.quantity + 1,
            timestamp, // Update timestamp to last scanned
            synced: false
          });
        } else {
          // Add new
          newItems.unshift({
            id: crypto.randomUUID(),
            code,
            timestamp,
            quantity: 1,
            synced: false
          });
        }
      } else {
        // Single Mode: Always add new entry
        newItems.unshift({
          id: crypto.randomUUID(),
          code,
          timestamp,
          quantity: 1,
          synced: false
        });
      }
      return newItems;
    });
  };

  const handleSync = async () => {
    if (items.length === 0) return;
    if (!isOnline) {
      alert("Ağ bağlantısı yok. Lütfen Wifi veya mobil verinizi kontrol edin.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const success = await syncToRemote(items, settings);
      if (success) {
        setItems(prev => prev.map(item => ({ ...item, synced: true })));
        setLastSyncTime(new Date());
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = () => {
    if (confirm('Tüm taranan verileri silmek istediğinizden emin misiniz?')) {
      clearData();
      setItems([]);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
    setView('home');
  };

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col min-h-[calc(100vh-64px)] p-6 gap-6 justify-center max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="bg-blue-600 w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-900/50 mb-4">
          <QrCode className="text-white w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">BarkodLink Pro</h2>
        <p className="text-slate-400">Başlamak için bir tarama modu seçin</p>
        {!isOnline && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/50 text-red-400 text-xs border border-red-900">
            <WifiOff size={12} /> Bağlantı Yok (Çevrimdışı)
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <button
          onClick={() => { setMode('single'); setView('scanning'); }}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-6 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">Tekli Okuma</span>
            <QrCode className="text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-sm text-slate-400">Ürünleri tek tek tarayın. Her okuma yeni bir satır oluşturur.</p>
        </button>

        <button
          onClick={() => { setMode('series'); setView('scanning'); }}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-6 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">Seri Okuma</span>
            <Layers className="text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-sm text-slate-400">Stok/Sayım modu. Aynı barkodu okutmak adedi artırır.</p>
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button variant="secondary" onClick={() => setView('history')} icon={<History size={20}/>}>
          Geçmiş Verileri Gör ({items.length})
        </Button>
      </div>
      
      {settings.remotePath && (
        <div className="mt-4 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                {isOnline ? <Wifi size={12} className="text-green-500"/> : <WifiOff size={12} className="text-red-500"/>}
                Bağlı: <span className="font-mono text-slate-400 truncate max-w-[200px]">{settings.remotePath}</span>
            </p>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-bold text-white">Veri Yönetimi</h3>
                <p className="text-xs text-slate-400">{items.filter(i => !i.synced).length} gönderilmemiş kayıt</p>
            </div>
            {lastSyncTime && (
                <div className="text-right">
                    <p className="text-xs text-slate-500">Son Gönderim</p>
                    <p className="text-xs text-white">{lastSyncTime.toLocaleTimeString()}</p>
                </div>
            )}
        </div>
        <div className="grid grid-cols-2 gap-3">
            <Button 
                onClick={handleSync} 
                disabled={isSyncing || items.length === 0 || !isOnline}
                icon={isSyncing ? <RefreshCw className="animate-spin" /> : (isOnline ? <Wifi /> : <WifiOff />)}
            >
                {isSyncing ? 'Gönderiliyor...' : isOnline ? 'Sunucuya Gönder' : 'Bağlantı Yok'}
            </Button>
            <Button 
                variant="secondary"
                onClick={() => exportToTxt(items)}
                icon={<Download />}
            >
                .txt İndir
            </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-400 font-medium">Okunan Barkodlar</h3>
        <button onClick={handleClearData} className="text-red-400 text-sm flex items-center gap-1 hover:text-red-300">
          <Trash2 size={16} /> Tümünü Temizle
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Henüz barkod okunmadı.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex justify-between items-center">
              <div>
                <div className="font-mono text-lg text-white font-medium">{item.code}</div>
                <div className="text-xs text-slate-500">
                  {new Date(item.timestamp).toLocaleString('tr-TR')} 
                  {item.synced && <span className="ml-2 text-green-500">✓ Gönderildi</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 px-3 py-1 rounded text-sm font-bold text-slate-300">
                  Adet: {item.quantity}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 max-w-md mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          handleSaveSettings({
            ...settings,
            remotePath: (form.elements.namedItem('remotePath') as HTMLInputElement).value,
            deviceId: (form.elements.namedItem('deviceId') as HTMLInputElement).value,
          });
        }}
        className="space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Uzak Ağ Yolu (Klasör)</label>
          <input
            name="remotePath"
            defaultValue={settings.remotePath}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="\\192.168.1.1\paylasim\dosya.txt"
          />
          <p className="text-xs text-slate-500 mt-2">
            Metin dosyasının kaydedileceği veya sunucuya gönderileceği ağ yolunu girin. 
            (Örn: \\192.168.2.15\paylasim\barkodlar.txt)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Cihaz Kimliği (ID)</label>
          <input
            name="deviceId"
            defaultValue={settings.deviceId}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-4">
          <Button type="submit" fullWidth>Ayarları Kaydet</Button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {view !== 'scanning' && (
        <Header 
          title={view === 'settings' ? 'Ayarlar' : view === 'history' ? 'Geçmiş Kayıtlar' : 'BarkodLink Pro'} 
          onSettings={() => setView('settings')}
          showBack={view !== 'home'}
          onBack={() => setView('home')}
        />
      )}

      <main>
        {view === 'home' && renderHome()}
        {view === 'settings' && renderSettings()}
        {view === 'history' && renderHistory()}
        {view === 'scanning' && (
          <ScannerView 
            mode={mode} 
            onScan={handleScan} 
            onClose={() => setView(mode === 'single' ? 'history' : 'history')} 
          />
        )}
      </main>
    </div>
  );
}

export default App;