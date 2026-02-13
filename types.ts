import { Vector3 } from 'three';

export enum GamePhase {
  IDLE = 'IDLE',       // Waiting to start
  COUNTDOWN = 'COUNTDOWN', // 3, 2, 1
  QTE = 'QTE',         // Bar is moving, waiting for input
  ACTION = 'ACTION',   // Physics active, shockwave happening
  RESULT = 'RESULT'    // Score display
}

export enum SlapGrade {
  PERFECT = 'PERFECT',
  GOOD = 'GOOD',
  MISS = 'MISS',
  NONE = 'NONE'
}

export interface GameState {
  phase: GamePhase;
  score: number;
  beanCount: number;
  grade: SlapGrade;
}

export interface SlapData {
  position: Vector3;
  power: number;
  grade: SlapGrade;
}

export interface BeanData {
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: [number, number, number];
  angVel: [number, number, number];
  mass: number;
  scale: number;
  value: number;
}
