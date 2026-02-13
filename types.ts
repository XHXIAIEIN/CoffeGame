import { Vector3 } from 'three';
import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

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

export enum HitZone {
  CENTER = 'CENTER',
  EDGE = 'EDGE',
  CORNER = 'CORNER'
}

export enum FalloffType {
  EXP = 'EXP',
  INV_SQUARE = 'INV_SQUARE'
}

export interface ImpactProfile {
  radius: number;
  verticalImpulse: number;
  horizontalImpulse: number;
  randomness: number;
  falloffType: FalloffType;
  falloffK: number;
  secondPulseDelayMs?: number;
  secondPulseScale?: number;

  shakeIntensity: number;
  shakeDuration: number;

  ringScale: number;
  ringAlpha: number;
  ringDuration: number;
  ringColor: string;

  particleCount: number;
  soundVariant: SlapGrade;
  vibratePattern: number[];
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

export interface QTEResult {
  power: number;
  dtMs: number;
  normalizedX: number;
  normalizedY: number;
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

export interface SlapTelemetry {
  dtMs: number;
  power: number;
  grade: SlapGrade;
  zone: HitZone;
  moved: number;
  score: number;
}