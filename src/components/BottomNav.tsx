import React from 'react';
import { Home, MonitorPlay, UserCircle2 } from 'lucide-react';
import { useDevice } from '../context';
import { useTranslation } from '../i18n';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const { language } = useDevice();
  const t = useTranslation(language);

  const tabs = [
    { id: 'home', label: t('homeTab').toUpperCase(), icon: Home },
    { id: 'media', label: t('media').toUpperCase(), icon: MonitorPlay },
    { id: 'you', label: t('you').toUpperCase(), icon: UserCircle2 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-8 py-3 pb-5 flex justify-between items-center rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.03)] z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex flex-col items-center justify-center space-y-1.5 w-16 transition-colors select-none ${
              isActive ? 'text-[#0A5BC4]' : 'text-gray-400'
            }`}
          >
            <div className={`px-4 py-1 rounded-2xl transition-transform ${isActive ? 'bg-[#EEF5FD]' : 'hover:bg-gray-50'}`}>
               <Icon size={22} className={isActive ? 'fill-current text-[#0A5BC4]' : 'text-gray-400'} />
            </div>
            <span className={`text-[10px] font-semibold tracking-wide select-none ${isActive ? 'text-[#0A5BC4]' : 'text-gray-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
