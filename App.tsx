import React, { useState, useRef, useEffect, useCallback } from 'react';
import GameScene, { GameSceneHandle } from './components/GameScene';
import QTEOverlay from './components/QTEOverlay';
import { GamePhase, SlapGrade } from './types';
import { audioManager } from './services/audioManager';
import { GAME_CONFIG } from './config';

const App: React.FC = () => {
  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [beanCount, setBeanCount] = useState(0);
  const [grade, setGrade] = useState<SlapGrade>(SlapGrade.NONE);
  
  const sceneRef = useRef<GameSceneHandle>(null);

  // --- Game Loop Logic ---

  const handleStart = () => {
    audioManager.setEnabled(true);
    setPhase(GamePhase.COUNTDOWN);
    setCountdown(3);
    setScore(0);
    setBeanCount(0);
    setGrade(SlapGrade.NONE);
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

  const handleSlap = useCallback((power: number) => {
    if (phase !== GamePhase.QTE) return;

    // Determine Grade
    let currentGrade = SlapGrade.MISS;
    if (power >= 0.95) currentGrade = SlapGrade.PERFECT;
    else if (power >= 0.6) currentGrade = SlapGrade.GOOD;
    
    setGrade(currentGrade);
    setPhase(GamePhase.ACTION);
    
    // Play SFX
    audioManager.playSlap(power);
    sceneRef.current?.shakeCamera();

    // Trigger Physics in Scene
    // For simplicity, we assume center screen slap if triggered via UI button
    // But since the QTE overlay covers the screen, we can pass a center point (0,0) normalized
    // Or we could pass the actual touch event coordinates if we passed the event through.
    // Let's assume hitting the "sweet spot" of the table (center) for the QTE mechanic focus.
    const { moved } = sceneRef.current?.triggerSlap(0, 0, power) || { moved: 0 };
    
    setBeanCount(moved);

    // Wait for physics to settle then show result
    setTimeout(() => {
      // Calculate final score
      const finalScore = sceneRef.current?.getScore() || 0;
      
      // Apply multipliers
      let multiplier = 1;
      if (currentGrade === SlapGrade.PERFECT) multiplier = GAME_CONFIG.SCORE_MULTIPLIERS.PERFECT;
      else if (currentGrade === SlapGrade.GOOD) multiplier = GAME_CONFIG.SCORE_MULTIPLIERS.GOOD;
      else multiplier = GAME_CONFIG.SCORE_MULTIPLIERS.MISS;
      
      setScore(Math.floor(finalScore * multiplier));
      setPhase(GamePhase.RESULT);
      if (currentGrade !== SlapGrade.MISS) audioManager.playWin();
    }, 2000); // 2 seconds of watching beans fly
  }, [phase]);

  const handleReset = () => {
    setPhase(GamePhase.IDLE);
    sceneRef.current?.resetBeans();
  };

  // --- UI Renderers ---

  return (
    <div className="w-full h-screen relative overflow-hidden bg-stone-300">
      {/* 3D Layer */}
      <div className="absolute inset-0 z-0">
        <GameScene 
          ref={sceneRef} 
          isSimulating={true} 
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
                  Wait for signal, then slap!
                </p>
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

      {/* QTE Overlay - Handles its own interaction */}
      <QTEOverlay 
        isActive={phase === GamePhase.QTE} 
        onStop={handleSlap} 
      />
    </div>
  );
};

export default App;