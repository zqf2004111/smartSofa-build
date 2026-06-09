import React, { useRef, useEffect, useState } from 'react';

interface MarqueeTextProps {
  children: React.ReactNode;
  className?: string;
  speed?: number; // pixels per second
  gap?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  children,
  className = '',
  speed = 40,
  gap = '  •  ',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerW = containerRef.current.clientWidth;
        const textW = textRef.current.scrollWidth;
        setShouldScroll(textW > containerW);
      }
    };

    checkOverflow();
    // Re-check after fonts/images load
    const timer = setTimeout(checkOverflow, 500);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [children]);

  const textStr = typeof children === 'string' ? children : '';

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap text-center ${className}`}>
      <div
        className={`${shouldScroll ? 'inline-flex animate-marquee' : 'inline-block'}`}
        style={
          shouldScroll
            ? {
                animationDuration: `${Math.max(
                  (textRef.current?.scrollWidth || 200) / speed,
                  4
                )}s`,
              }
            : undefined
        }
      >
        <span ref={textRef} className="inline-block shrink-0">
          {children}
        </span>
        {shouldScroll && (
          <span className="inline-block shrink-0">
            {gap}{children}
          </span>
        )}
      </div>
    </div>
  );
};
