
import React from 'react';

interface QTEOverlayProps {
  onInteract: (e: React.MouseEvent | React.TouchEvent) => void;
  isActive: boolean;
}

const QTEOverlay: React.FC<QTEOverlayProps> = ({ onInteract, isActive }) => {
  if (!isActive) return null;

  return (
    <div 
      className="absolute inset-0 z-20 cursor-pointer touch-none"
      onClick={onInteract}
      onTouchStart={onInteract}
    >
      {/* Invisible interaction layer */}
    </div>
  );
};

export default QTEOverlay;
