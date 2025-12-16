import React from 'react';
import { Settings, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  onSettings?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title = "BarkodLink Pro", onBack, onSettings, showBack }) => {
  return (
    <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
      </div>
      
      {onSettings && (
        <button 
          onClick={onSettings}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
        >
          <Settings size={24} />
        </button>
      )}
    </div>
  );
};