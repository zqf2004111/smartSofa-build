import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val: number) => void;
  initialTime: number;
}

export const TimerModal: React.FC<TimerModalProps> = ({ isOpen, onClose, onConfirm, initialTime }) => {
  const { language } = useDevice();
  const t = useTranslation(language);
  const options = [0, 5, 10, 15, 20, 25, 30];
  const itemHeight = 48;
  const listSize = 300;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => {
    const arr = [];
    for (let i = 0; i < listSize / options.length; i++) {
        arr.push(...options);
    }
    return arr;
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      const midBlock = Math.floor((listSize / options.length) / 2);
      const initialIndex = options.indexOf(initialTime ?? 0);
      const target = midBlock * options.length + (initialIndex >= 0 ? initialIndex : 0);
      setActiveIndex(target);
      setDragOffset(0);
    }
  }, [isOpen, initialTime, listSize, options.length]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientY - startY.current);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const deltaY = e.clientY - startY.current;
    let indexDelta = -Math.round(deltaY / itemHeight);
    
    let newIndex = activeIndex + indexDelta;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= list.length) newIndex = list.length - 1;

    setActiveIndex(newIndex);
    setDragOffset(0);
  };

  if (!isOpen) return null;

  const currentVisualIndex = activeIndex - dragOffset / itemHeight;
  const translateY = 96 - activeIndex * itemHeight + dragOffset;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity" onClick={onClose}>
      <div 
        className="bg-[#FAFAFA] rounded-[24px] w-[280px] p-5 shadow-xl animate-in zoom-in-95 duration-200 relative pb-6" 
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[14px] font-semibold text-gray-900 px-2 mt-2">{t('timer')}</h2>
        
        <div 
          className="relative h-[240px] w-full mt-1 touch-none overflow-hidden cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="absolute top-[96px] left-0 right-0 h-[48px] pointer-events-none flex items-center justify-end pr-[22%] z-10">
             <span className="text-[18px] font-medium text-[#333333]">{t('setTimerSuffix').trim()}</span>
          </div>
          
          <div 
             className="absolute w-full left-0 top-0"
             style={{
                transform: `translateY(${translateY}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
             }}
          >
             {list.map((val, i) => {
                if (Math.abs(i - currentVisualIndex) > 5) return null;

                const distance = Math.abs(i - currentVisualIndex);
                let scale = 1;
                let opacity = 1;
                
                if (distance < 1) {
                   scale = 1 - 0.25 * distance; 
                   opacity = 1 - 0.7 * distance; 
                } else if (distance < 2) {
                   scale = 0.75 - 0.15 * (distance - 1); 
                   opacity = 0.3 - 0.15 * (distance - 1);
                } else {
                   scale = 0.6;
                   opacity = 0.15;
                }

                const isSelected = distance < 0.5;
                const fontWeight = isSelected ? 600 : 400;
                const color = isSelected ? '#222222' : '#999999';

                return (
                  <div 
                    key={i} 
                    className="absolute w-full flex items-center justify-center select-none"
                    style={{
                       height: `${itemHeight}px`,
                       top: `${i * itemHeight}px`,
                    }}
                  >
                    <span 
                      className="font-sans absolute pr-[35px]"
                      style={{
                        transform: `scale(${scale})`,
                        opacity: opacity,
                        fontWeight: fontWeight,
                        color: color,
                        fontSize: '38px',
                        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                      }}
                    >
                       {val < 10 ? `0${val}` : val}
                    </span>
                  </div>
                );
             })}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={() => onConfirm(list[activeIndex] ?? 0)}
            className="w-full bg-[#0A5BC4] text-white rounded-full py-2.5 text-[15px] font-semibold tracking-wide shadow-sm"
          >
            {t('confirm')}
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-white text-gray-900 border border-[#0A5BC4] rounded-full py-2.5 text-[15px] font-semibold tracking-wide"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
