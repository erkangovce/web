import { ScannedItem, AppSettings } from '../types';

const STORAGE_KEYS = {
  ITEMS: 'barcodelink_items',
  SETTINGS: 'barcodelink_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  remotePath: '\\\\192.168.1.10\\shared\\scans.txt',
  autoSync: false,
  deviceId: 'DEV-' + Math.floor(Math.random() * 10000),
};

export const getStoredItems = (): ScannedItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load items", e);
    return [];
  }
};

export const saveStoredItems = (items: ScannedItem[]) => {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
};

export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const clearData = () => {
  localStorage.removeItem(STORAGE_KEYS.ITEMS);
};

// Simulated Network Sync
export const syncToRemote = async (items: ScannedItem[], settings: AppSettings): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log(`Attempting to write to ${settings.remotePath}...`);
    // Simulate network latency
    setTimeout(() => {
      // In a real web app, we cannot directly write to SMB shares due to browser security.
      // We would typically POST to a backend service that handles the file system access.
      // This is a simulation of that success.
      console.log("Data synced successfully:", items);
      resolve(true);
    }, 1500);
  });
};

export const exportToTxt = (items: ScannedItem[]) => {
  const content = items.map(item => 
    `${item.code}\t${item.quantity}\t${new Date(item.timestamp).toISOString()}`
  ).join('\n');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scan_export_${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};