export type ScanMode = 'single' | 'series';

export interface ScannedItem {
  id: string;
  code: string;
  timestamp: number;
  quantity: number;
  synced: boolean;
}

export interface AppSettings {
  remotePath: string;
  autoSync: boolean;
  deviceId: string;
}

export interface ScanSession {
  mode: ScanMode;
  startTime: number;
}
