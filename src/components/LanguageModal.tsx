import React from 'react';
import { useDevice } from '../context';
import { useTranslation, Language } from '../i18n';
import { Check } from 'lucide-react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage } = useDevice();
  const t = useTranslation(language);

  if (!isOpen) return null;

  const languages: { code: Language; label: string } = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 transition-opacity" onClick={onClose}>
      <div 
        className="bg-[#FAFAFA] rounded-t-[24px] sm:rounded-[24px] w-full max-w-md p-5 pb-8 sm:pb-5 shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 relative">
          <button onClick={onClose} className="text-[#0A5BC4] font-medium text-[15px]">{t('cancel')}</button>
          <h2 className="text-[17px] font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">{t('language')}</h2>
          <div className="w-[50px]"></div>
        </div>

        <div className="space-y-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl border ${
                language === lang.code ? 'bg-[#EEF5FD] border-[#0A5BC4]' : 'bg-white border-transparent'
              }`}
            >
              <span className={`text-[16px] font-medium ${language === lang.code ? 'text-[#0A5BC4]' : 'text-gray-900'}`}>
                {lang.label}
              </span>
              {language === lang.code && <Check size={20} className="text-[#0A5BC4]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
