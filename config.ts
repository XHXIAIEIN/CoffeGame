export const GAME_CONFIG = {
  // Performance & Scene
  BEAN_COUNT: 120, // Number of beans (Adaptive based on FPS could be implemented, keeping fixed for stability)
  MAX_FPS: 60,
  
  // Physics
  GRAVITY: 9.8,
  DAMPING: 0.98, // Air resistance
  BOUNCE: 0.6,   // Bounciness of the table
  FRICTION: 0.92, // Sliding friction
  TABLE_Y: 0,    // Height of table surface
  TABLE_SIZE: { width: 4, depth: 3 },
  
  // Interaction
  SLAP_FORCE_BASE: 0.2, // Base upward force
  SLAP_RADIUS: 5.0,    // Radius of the shockwave
  DISPERSION: 1.5,     // Horizontal spread force
  
  // QTE Timing (in milliseconds)
  QTE_DURATION: 1500, // Time for the bar to sweep once
  THRESHOLDS: {
    PERFECT: 50, // +/- ms
    GOOD: 150,   // +/- ms
  },
  
  // Scoring
  SCORE_MULTIPLIERS: {
    PERFECT: 2.0,
    GOOD: 1.2,
    MISS: 0.5,
  },
  
  // Colors
  COLORS: {
    BEAN: '#3e2723',
    BEAN_VARIANTS: ['#3e2723', '#4e342e', '#5d4037'],
    TABLE: '#8d6e63',
    BG: '#d7ccc8'
  }
};