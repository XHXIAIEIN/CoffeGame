
import { FalloffType, HitZone, ImpactProfile, SlapGrade } from './types';

const computeBeanCount = () => {
  if (typeof navigator === 'undefined') {
    return 120;
  }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const weakDevice = memory <= 4 || cores <= 4;

  return weakDevice ? 96 : 132;
};

export const GAME_CONFIG = {
  BEAN_COUNT: computeBeanCount(),
  MAX_FPS: 60,
  
  GRAVITY: 9.8,
  DAMPING: 0.98,
  BOUNCE: 0.6,
  FRICTION: 0.92,
  TABLE_Y: 0,
  TABLE_SIZE: { width: 4, depth: 3 },
  
  // QTE / Pendulum Config
  PENDULUM_SPEED: 3.5, // Speed of the oscillation
  PENDULUM_RADIUS: 0.8,
  
  // Accuracy thresholds (0.0 is center, 1.0 is edge)
  THRESHOLDS: {
    PERFECT: 0.12, // Very center
    GOOD: 0.45,    // Reasonable margin
  },
  
  SCORE_MULTIPLIERS: {
    PERFECT: 1.5,
    GOOD: 1.0,
    MISS: 0.5,
  },

  IMPACT_PROFILES: {
    [SlapGrade.PERFECT]: {
      radius: 6.0,
      verticalImpulse: 14.0,
      horizontalImpulse: 8.5,
      randomness: 1.2,
      falloffType: FalloffType.EXP,
      falloffK: 0.7,
      secondPulseDelayMs: 60,
      secondPulseScale: 0.4,
      shakeIntensity: 0.4,
      shakeDuration: 0.5,
      ringScale: 8.2,
      ringAlpha: 0.9,
      ringDuration: 0.35,
      ringColor: '#fbbf24',
      particleCount: 24,
      soundVariant: SlapGrade.PERFECT,
      vibratePattern: [0, 20, 30, 30]
    } as ImpactProfile,
    [SlapGrade.GOOD]: {
      radius: 4.0,
      verticalImpulse: 7.0,
      horizontalImpulse: 4.0,
      randomness: 0.5,
      falloffType: FalloffType.EXP,
      falloffK: 1.1,
      shakeIntensity: 0.15,
      shakeDuration: 0.3,
      ringScale: 4.5,
      ringAlpha: 0.7,
      ringDuration: 0.45,
      ringColor: '#ffffff',
      particleCount: 12,
      soundVariant: SlapGrade.GOOD,
      vibratePattern: [0, 20]
    } as ImpactProfile,
    [SlapGrade.MISS]: {
      radius: 1.4,
      verticalImpulse: 1.7,
      horizontalImpulse: 0.65,
      randomness: 0.1,
      falloffType: FalloffType.INV_SQUARE,
      falloffK: 1.8,
      shakeIntensity: 0.04,
      shakeDuration: 0.2,
      ringScale: 1.8,
      ringAlpha: 0.4,
      ringDuration: 0.6,
      ringColor: '#525252',
      particleCount: 4,
      soundVariant: SlapGrade.MISS,
      vibratePattern: [0, 10]
    } as ImpactProfile,
    [SlapGrade.NONE]: {
      radius: 0,
      verticalImpulse: 0,
      horizontalImpulse: 0,
      randomness: 0,
      falloffType: FalloffType.EXP,
      falloffK: 1,
      shakeIntensity: 0,
      shakeDuration: 0,
      ringScale: 0,
      ringAlpha: 0,
      ringDuration: 0,
      ringColor: '#000',
      particleCount: 0,
      soundVariant: SlapGrade.MISS,
      vibratePattern: []
    } as ImpactProfile
  },

  ZONE_MULTIPLIERS: {
    [HitZone.CENTER]: { horizontal: 1.0, vertical: 1.0, spread: 1.0 },
    [HitZone.EDGE]: { horizontal: 1.25, vertical: 0.9, spread: 1.1 },
    [HitZone.CORNER]: { horizontal: 1.4, vertical: 0.85, spread: 1.2 }
  },
  
  COLORS: {
    BEAN: '#3e2723',
    BEAN_VARIANTS: ['#3e2723', '#4e342e', '#5d4037'],
    TABLE: '#8d6e63',
    TABLE_DARK: '#5d4037',
    BG: '#d7ccc8',
    GAUGE_BG: 'rgba(255, 255, 255, 0.3)',
    GAUGE_QK: '#fbbf24', // Perfect zone
    GAUGE_CURSOR: '#ef4444'
  }
};
