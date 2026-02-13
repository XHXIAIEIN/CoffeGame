import React, { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config';

interface QTEOverlayProps {
  onStop: (power: number) => void;
  isActive: boolean;
}

const QTEOverlay: React.FC<QTEOverlayProps> = ({ onStop, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const [indicatorPos, setIndicatorPos] = useState(0); // 0 to 100%

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = performance.now();
      const loop = () => {
        const now = performance.now();
        const elapsed = now - startTimeRef.current;
        
        // Ping pong motion (0 -> 1 -> 0)
        // t goes from 0 to 1 over QTE_DURATION/2
        const totalDuration = GAME_CONFIG.QTE_DURATION; 
        const cycle = elapsed % totalDuration;
        let progress = cycle / (totalDuration / 2);
        
        if (progress > 1) {
          progress = 2 - progress; // Go back
        }
        
        // Easing for visual flair (sine)
        // 50% is the center sweet spot
        setIndicatorPos(progress * 100);
        
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(frameRef.current);
    }

    return () => cancelAnimationFrame(frameRef.current);
  }, [isActive]);

  const handleInteract = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return;
    e.stopPropagation(); // Prevent double firing if parent catches it
    
    // Calculate power
    // 50% is Perfect. 
    // Calculate distance from 50.
    const dist = Math.abs(indicatorPos - 50); // 0 is perfect, 50 is worst
    
    // Normalize to millisecond error rough equivalent for logic
    // Full sweep is 100%, represents half duration.
    // 1% approx = QTE_DURATION / 2 / 100 ms
    const timeError = dist * (GAME_CONFIG.QTE_DURATION / 200); 
    
    // 1.0 is max power, 0 is min
    let power = 0;
    if (timeError <= GAME_CONFIG.THRESHOLDS.PERFECT) {
       power = 1.0;
    } else if (timeError <= GAME_CONFIG.THRESHOLDS.GOOD) {
       // Linear dropoff from 1.0 to 0.5
       const range = GAME_CONFIG.THRESHOLDS.GOOD - GAME_CONFIG.THRESHOLDS.PERFECT;
       const extra = timeError - GAME_CONFIG.THRESHOLDS.PERFECT;
       power = 1.0 - (extra / range) * 0.4; // Min 0.6
    } else {
       // Miss but weak slap
       power = 0.2;
    }
    
    onStop(power);
  };

  if (!isActive) return null;

  return (
    <div 
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm cursor-pointer"
      onMouseDown={handleInteract}
      onTouchStart={handleInteract}
    >
      <div className="pointer-events-none mb-8">
        <h2 className="text-4xl font-black text-white drop-shadow-lg tracking-widest animate-pulse">TAP!</h2>
      </div>

      <div className="relative w-64 h-8 bg-gray-800 rounded-full border-2 border-white overflow-hidden pointer-events-none shadow-2xl">
        {/* Safe Zones */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 bg-yellow-400 z-0 opacity-80" /> {/* Perfect */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-16 bg-green-500 z-[-1] opacity-50" /> {/* Good */}
        
        {/* Indicator */}
        <div 
          className="absolute top-0 bottom-0 w-2 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)] z-10"
          style={{ left: `${indicatorPos}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      
      <p className="mt-4 text-white font-bold text-shadow-md pointer-events-none">Hit the center!</p>
    </div>
  );
};

export default QTEOverlay;