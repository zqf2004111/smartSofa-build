import React, { useState } from 'react';
import { User, Bell, Shield, HelpCircle, ChevronRight, Edit2, Plus, ChevronLeft, Globe } from 'lucide-react';
import { useDevice } from '../context';
import { useTranslation } from '../i18n';
import { LanguageModal } from '../components/LanguageModal';

export function YouView() {
  const [view, setView] = useState<'main' | 'account'>('main');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const { language } = useDevice();
  const t = useTranslation(language);

  if (view === 'account') {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in slide-in-from-right-4 duration-300 px-5 pt-8 pb-24 relative">
        <button onClick={() => setView('main')} className="absolute top-4 left-4 p-2 text-gray-600 z-10 active:scale-95 transition-transform" aria-label="Back">
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>

        {/* Avatar Ring */}
        <div className="flex flex-col items-center mb-10 mt-4">
          <div className="relative">
            <div className="w-[104px] h-[104px] rounded-full border-[3px] border-[#00D1FF] p-1 shadow-[0_4px_12px_rgba(0,209,255,0.2)]">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" 
                alt="Alex Thompson"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {/* Edit Badge */}
            <button className="absolute bottom-0 right-0 w-[30px] h-[30px] bg-[#0A5BC4] rounded-full flex items-center justify-center border-2 border-[#f8fafc] shadow-sm hover:scale-105 transition-transform">
              <Edit2 size={13} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="w-full bg-white rounded-[18px] p-[18px] px-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/50 flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <User size={20} className="text-gray-500" strokeWidth={2} />
            <span className="text-[16px] font-medium text-gray-900 tracking-tight">{t('account')}</span>
          </div>
          <span className="text-[15px] font-medium text-gray-500">376377878</span>
        </div>

        {/* Change Password Button */}
        <button className="w-full bg-white rounded-[18px] py-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/50 flex items-center justify-center mb-10 active:scale-[0.98] transition-transform">
          <span className="text-[16px] font-medium text-[#0A5BC4]">{t('changePassword')}</span>
        </button>

        {/* Personal Info Section */}
        <div>
          <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-widest mb-3 ml-1">{t('personalInfo')}</h3>
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100/50 overflow-hidden">
            
            {/* Name */}
            <div className="w-full flex items-center justify-between p-5 border-b border-gray-50">
              <div className="flex items-center space-x-4">
                <User size={20} className="text-gray-600" strokeWidth={2} />
                <span className="text-[16px] font-medium text-gray-900 tracking-tight">{t('name')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[15px] font-medium text-gray-500">Alex Thompson</span>
                <Edit2 size={16} className="text-gray-400" />
              </div>
            </div>
            
            {/* Gender */}
            <div className="w-full flex items-center justify-between p-5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <circle cx="8" cy="10" r="4"/>
                  <path d="M8 14v5"/>
                  <path d="M6 17h4"/>
                  <circle cx="16" cy="10" r="4"/>
                  <path d="M18.8 7.2L22 4"/>
                  <path d="M18 4h4v4"/>
                </svg>
                <span className="text-[16px] font-medium text-gray-900 tracking-tight">{t('gender')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[15px] font-medium text-gray-500">Male</span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>

            {/* Age */}
            <div className="w-full flex items-center justify-between p-5 border-b border-gray-50">
              <div className="flex items-center space-x-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-gray-600">
                  <path d="M12 2l2.4 1.8L17.5 3l1.2 2.8 3 1.1-.8 2.9L23 12l-2 2.2.8 2.9-3 1.1-1.2 2.8-3.1-.8L12 22l-2.4-1.8L6.5 21l-1.2-2.8-3-1.1.8-2.9L1 12l2-2.2-.8-2.9 3-1.1 1.2-2.8 3.1.8L12 2z"/>
                  <path d="M10.5 16h-1.5l3-8h1l3 8h-1.5l-.8-2.5h-3.4L10.5 16zm1.1-3.5h2.8l-1.4-4.2-1.4 4.2z" fill="#fff"/>
                </svg>
                <span className="text-[16px] font-medium text-gray-900 tracking-tight">{t('age')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[15px] font-medium text-gray-500">35</span>
                <Edit2 size={16} className="text-gray-400" />
              </div>
            </div>

            {/* Height */}
            <div className="w-full flex items-center justify-between p-5 border-b border-gray-50">
              <div className="flex items-center space-x-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <path d="M12 22V2M12 2l4 4M12 2L8 6M6 22h12"/>
                </svg>
                <span className="text-[16px] font-medium text-gray-900 tracking-tight">{t('height')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[15px] font-medium text-gray-500">5'9''</span>
                <Edit2 size={16} className="text-gray-400" />
              </div>
            </div>

            {/* Weight */}
            <div className="w-full flex items-center justify-between p-5">
              <div className="flex items-center space-x-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                  <path d="M12 9v-2M12 17v-2" />
                </svg>
                <span className="text-[16px] font-medium text-gray-900 tracking-tight">{t('weight')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[15px] font-medium text-gray-500">140lbs</span>
                <Edit2 size={16} className="text-gray-400" />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-300 px-5 pt-8 pb-24">
      
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          {/* Avatar Ring */}
          <div className="w-[104px] h-[104px] rounded-full border-[3px] border-[#00D1FF] p-1">
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" 
              alt="Alex Thompson"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          {/* Edit Badge */}
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#0A5BC4] rounded-full flex items-center justify-center border-2 border-[#f8fafc] shadow-sm hover:scale-105 transition-transform">
            <Edit2 size={14} className="text-white" strokeWidth={2.5} />
          </button>
        </div>
        <h2 className="text-[22px] font-medium text-gray-900 tracking-tight">Alex Thompson</h2>
      </div>

      {/* Account Management Card */}
      <button 
        onClick={() => setView('account')}
        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-8 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center space-x-3">
          <User size={22} className="text-gray-500" strokeWidth={2} />
          <span className="text-[16px] font-medium text-gray-900">{t('accountManagement')}</span>
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </button>

      {/* Family Member Section */}
      <div className="mb-8">
        <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-widest mb-3 ml-1">{t('familyMember')}</h3>
        <button className="w-full bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform">
          <div className="text-left">
            <h4 className="text-[17px] font-medium text-gray-900 mb-1">Alex's home</h4>
            <p className="text-[13px] text-gray-500">{t('oneFamilyMember')}</p>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden z-10">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" 
                alt="Family Member"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center -ml-2 z-0">
              <Plus size={16} className="text-gray-600" />
            </div>
            <ChevronRight size={20} className="text-gray-400 ml-2" />
          </div>
        </button>
      </div>

      {/* App Settings Section */}
      <div>
        <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-widest mb-3 ml-1">{t('appSettings')}</h3>
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          
          <button 
            onClick={() => setIsLanguageModalOpen(true)}
            className="w-full flex items-center justify-between p-5 border-b border-gray-50 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <Globe size={22} className="text-gray-500" strokeWidth={2} />
              <span className="text-[16px] font-medium text-gray-900">{t('language')}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-[14px]">
                {language === 'zh' ? '中文' : language === 'es' ? 'Español' : 'English'}
              </span>
              <ChevronRight size={20} />
            </div>
          </button>

          <button className="w-full flex items-center justify-between p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <Bell size={22} className="text-gray-500" strokeWidth={2} />
              <span className="text-[16px] font-medium text-gray-900">{t('notifications')}</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button className="w-full flex items-center justify-between p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <Shield size={22} className="text-gray-500" strokeWidth={2} />
              <span className="text-[16px] font-medium text-gray-900">{t('privacySecurity')}</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button className="w-full flex items-center justify-between p-5 active:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <HelpCircle size={22} className="text-gray-500" strokeWidth={2} />
              <span className="text-[16px] font-medium text-gray-900">{t('supportCenter')}</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>

        </div>
      </div>

      <LanguageModal 
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />

    </div>
  );
}
