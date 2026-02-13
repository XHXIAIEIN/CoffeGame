
import React, { useState, useRef, useEffect, useCallback } from 'react';
import GameScene, { GameSceneHandle } from './components/GameScene';
import QTEOverlay from './components/QTEOverlay';
import { GamePhase, HitZone, SlapGrade } from './types';
import { audioManager } from './services/audioManager';
import { analytics } from './services/analytics';
import { GAME_CONFIG } from './config';

const App: React.FC = () => {
  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [beanCount, setBeanCount] = useState(0);
  const [grade, setGrade] = useState<SlapGrade>(SlapGrade.NONE);
  const [accuracy, setAccuracy] = useState(0);
  
  const sceneRef = useRef<GameSceneHandle>(null);

  useEffect(() => {
    const start = performance.now();
    analytics.open();
    const raf = requestAnimationFrame(() => {
      analytics.loadTime(Math.round(performance.now() - start));
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  const handleStart = () => {
    audioManager.setEnabled(true);
    analytics.start();
    setPhase(GamePhase.COUNTDOWN);
    setCountdown(3);
    setScore(0);
    setBeanCount(0);
    setGrade(SlapGrade.NONE);
    setAccuracy(0);
    sceneRef.current?.resetBeans();
    
    // Countdown Timer
    let count = 3;
    audioManager.playCountdown();
    
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        audioManager.playCountdown();
      } else {
        clearInterval(interval);
        setCountdown(0);
        audioManager.playGo();
        setPhase(GamePhase.QTE);
      }
    }, 1000);
  };

  const handleInteract = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== GamePhase.QTE) return;
    
    // e.stopPropagation(); // Optional, depending on event bubbling
    
    const isTouch = 'touches' in e || 'changedTouches' in e;
    // @ts-ignore
    const touchList = e.touches || e.changedTouches;
    const clientX = isTouch ? touchList[0]?.clientX ?? window.innerWidth / 2 : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? touchList[0]?.clientY ?? window.innerHeight / 2 : (e as React.MouseEvent).clientY;

    const normalizedX = (clientX / window.innerWidth) * 2 - 1;
    const normalizedY = -(clientY / window.innerHeight) * 2 + 1;

    // Resolve Slap
    const result = sceneRef.current?.resolveSlap(normalizedX, normalizedY);
    
    if (result) {
      const { grade: currentGrade, zone, moved } = result;
      const profile = GAME_CONFIG.IMPACT_PROFILES[currentGrade];

      setGrade(currentGrade);
      setPhase(GamePhase.ACTION);
      setBeanCount(moved);
      
      audioManager.playSlap(profile.soundVariant);

      if (navigator.vibrate && profile.vibratePattern.length > 0) {
        navigator.vibrate(profile.vibratePattern);
      }
      
      analytics.slap({
        dtMs: 0, 
        power: 0, // Simplified for pendulum
        grade: currentGrade,
        zone
      });

      setTimeout(() => {
        const finalScore = sceneRef.current?.getScore() || 0;
        
        let multiplier = 1;
        if (currentGrade === SlapGrade.PERFECT) multiplier = GAME_CONFIG.SCORE_MULTIPLIERS.PERFECT;
        else if (currentGrade === SlapGrade.GOOD) multiplier = GAME_CONFIG.SCORE_MULTIPLIERS.GOOD;
        else multiplier = GAME_CONFIG.SCORE_MULTIPLIERS.MISS;
        
        const QTscore = Math.floor(finalScore * multiplier);
        setScore(QTscore);
        setPhase(GamePhase.RESULT);
        if (currentGrade !== SlapGrade.MISS) audioManager.playWin();
        analytics.result({ score: QTscore, moved, grade: currentGrade });
      }, 1800);
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-stone-300">
      {/* 3D Layer */}
      <div className="absolute inset-0 z-0">
        <GameScene 
          ref={sceneRef} 
          isSimulating={true} 
          gamePhase={phase}
          onSceneReady={() => {}} 
        />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Top Header */}
        <div className="flex justify-between items-start">
           <div>
             <h1 className="text-3xl font-black text-amber-900 tracking-tighter drop-shadow-md">COFFEE SLAP</h1>
             {phase === GamePhase.IDLE && (
                <p className="text-amber-800 font-bold text-sm bg-amber-100/50 px-2 py-1 rounded inline-block mt-1">
                  Tap when the marker hits the center!
                </p>
             )}
             {phase === GamePhase.QTE && (
                 <div className="mt-2 text-xl font-bold text-amber-700 animate-pulse">
                    WAIT FOR IT...
                 </div>
             )}
           </div>
        </div>

        {/* Center Notifications */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
          
          {phase === GamePhase.COUNTDOWN && (
            <div className="text-9xl font-black text-white text-shadow-lg scale-150 animate-bounce">
              {countdown}
            </div>
          )}

          {phase === GamePhase.ACTION && grade !== SlapGrade.NONE && (
            <div className={`text-6xl font-black transform -rotate-12 transition-all duration-300 ${
              grade === SlapGrade.PERFECT ? 'text-yellow-400 scale-125' : 
              grade === SlapGrade.GOOD ? 'text-green-400 scale-110' : 'text-gray-400'
            } text-shadow-lg`}>
              {grade}!
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="w-full flex justify-center pb-8 pointer-events-auto">
          
          {phase === GamePhase.IDLE && (
            <button 
              onClick={handleStart}
              className="bg-amber-600 hover:bg-amber-500 text-white text-2xl font-bold py-4 px-12 rounded-full shadow-lg transform transition active:scale-95 border-b-4 border-amber-800 animate-pulse"
            >
              START
            </button>
          )}

          {phase === GamePhase.RESULT && (
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl text-center w-full max-w-sm border-4 border-amber-100 animate-fade-in-up">
              <h2 className="text-gray-500 font-bold uppercase tracking-wider text-sm mb-1">Total Score</h2>
              <div className="text-6xl font-black text-amber-600 mb-2">{score}</div>
              
                <div className="flex justify-center gap-4 text-sm text-gray-600 mb-6 bg-amber-50 p-3 rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-bold">{beanCount}</span>
                    <span>Beans</span>
                  </div>
                  <div className="w-px bg-amber-200"></div>
                  <div className="flex flex-col">
                    <span className="font-bold">{grade}</span>
                    <span>Rating</span>
                  </div>
                </div>

              <button 
                onClick={handleStart}
                className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl shadow-md active:bg-amber-700 transition"
              >
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invisible interaction layer for QTE */}
      <QTEOverlay 
        isActive={phase === GamePhase.QTE} 
        onInteract={handleInteract}
      />
    </div>
  );
};

export default App;
