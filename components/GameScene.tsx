
import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, ContactShadows, Text } from '@react-three/drei';
import { Vector3, MathUtils, Vector2, Mesh, MeshBasicMaterial, DoubleSide, Shape } from 'three';
import CoffeeBeans, { CoffeeBeansHandle } from './CoffeeBeans';
import Table from './Table';
import { GAME_CONFIG } from '../config';
import { GamePhase, HitZone, ImpactProfile, SlapGrade } from '../types';

interface GameSceneProps {
  isSimulating: boolean;
  gamePhase: GamePhase;
  onSceneReady: () => void;
}

export interface GameSceneHandle {
  resolveSlap: (screenX: number, screenY: number) => { grade: SlapGrade, hitPos: Vector3, moved: number, zone: HitZone };
  resetBeans: () => void;
  getScore: () => number;
}

// Pendulum Gauge Component
// An arc with a moving cursor.
const PendulumGauge = ({ active, valueRef }: { active: boolean, valueRef: React.MutableRefObject<number> }) => {
  const cursorRef = useRef<Mesh>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!cursorRef.current) return;
    
    if (!active) {
       cursorRef.current.visible = false;
       timeRef.current = 0;
       return;
    }
    cursorRef.current.visible = true;

    // Oscillate time: sin wave
    timeRef.current += delta * GAME_CONFIG.PENDULUM_SPEED;
    
    // Value between -1 (Left) and 1 (Right). 0 is center.
    const val = Math.sin(timeRef.current);
    valueRef.current = val;

    // Map value to angle
    // Arc spans say 120 degrees (-60 to +60)
    const angle = -val * (Math.PI / 3);
    const radius = GAME_CONFIG.PENDULUM_RADIUS;
    
    cursorRef.current.position.x = Math.sin(angle) * radius;
    cursorRef.current.position.z = Math.cos(angle) * radius;
    cursorRef.current.rotation.y = angle;
  });

  return (
    <group position={[0, GAME_CONFIG.TABLE_Y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {active && (
            <>
                {/* Background Arc */}
                <mesh rotation={[0, 0, Math.PI / 6]}>
                    <ringGeometry args={[GAME_CONFIG.PENDULUM_RADIUS - 0.05, GAME_CONFIG.PENDULUM_RADIUS + 0.05, 32, 1, Math.PI / 3, Math.PI * 1.33]} />
                    <meshBasicMaterial color="white" opacity={0.3} transparent side={DoubleSide} />
                </mesh>
                
                {/* Perfect Zone (Center) */}
                <mesh position={[0, GAME_CONFIG.PENDULUM_RADIUS, 0]}>
                    <planeGeometry args={[0.2, 0.15]} />
                    <meshBasicMaterial color={GAME_CONFIG.COLORS.GAUGE_QK} side={DoubleSide} />
                </mesh>
                
                {/* Moving Cursor */}
                <mesh ref={cursorRef}>
                     <boxGeometry args={[0.08, 0.2, 0.05]} />
                     <meshBasicMaterial color={GAME_CONFIG.COLORS.GAUGE_CURSOR} />
                </mesh>
                
                {/* Helper Text */}
                <Text 
                    position={[0, 0, 0]} 
                    rotation={[Math.PI/2, 0, 0]} 
                    fontSize={0.25} 
                    color="white" 
                    anchorX="center" 
                    anchorY="middle"
                    fillOpacity={0.8}
                >
                    TAP CENTER
                </Text>
            </>
        )}
    </group>
  );
};

// Camera shaker component
const CameraController = ({ shakeData }: { shakeData: { intensity: number, duration: number, active: boolean } }) => {
  const { camera } = useThree();
  const initialPos = useRef(new Vector3(0, 4, 3));
  const timeElapsed = useRef(0);
  
  // Ensure we look at the table on mount and every frame
  useFrame((state, delta) => {
    if (shakeData.active && timeElapsed.current < shakeData.duration) {
      timeElapsed.current += delta;
      
      const progress = 1 - (timeElapsed.current / shakeData.duration);
      const currentIntensity = shakeData.intensity * Math.pow(progress, 2);

      const offset = new Vector3(
        (Math.random() - 0.5) * currentIntensity,
        (Math.random() - 0.5) * currentIntensity,
        (Math.random() - 0.5) * currentIntensity
      );
      camera.position.copy(initialPos.current).add(offset);
      camera.lookAt(0, 0, 0);
    } else {
      // Smoothly return to initial position if displaced
      if (camera.position.distanceTo(initialPos.current) > 0.001) {
          camera.position.lerp(initialPos.current, 0.1);
      }
      // Always look at center
      camera.lookAt(0, 0, 0);
    }
  });
  
  if (!shakeData.active) {
      timeElapsed.current = 0;
  }

  return null;
};

// Visual Shockwave Ring
const Shockwave = ({ profile, active, position }: { profile: ImpactProfile | null, active: boolean, position: Vector3 }) => {
  const meshRef = useRef<Mesh>(null);
  const timeRef = useRef(0);
  
  useFrame((state, delta) => {
    if (!active || !profile || !meshRef.current) {
        if (meshRef.current) meshRef.current.visible = false;
        timeRef.current = 0;
        return;
    }
    
    meshRef.current.visible = true;
    timeRef.current += delta;
    
    const progress = Math.min(timeRef.current / profile.ringDuration, 1);
    
    const scale = MathUtils.lerp(0.1, profile.ringScale, Math.pow(progress, 0.5)); 
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.position.copy(position).setY(0.12);
    
    const opacity = (1 - Math.pow(progress, 3)) * profile.ringAlpha;
    const material = meshRef.current.material as MeshBasicMaterial;
    material.opacity = opacity;
    material.color.set(profile.ringColor);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
      <ringGeometry args={[0.4, 0.5, 32]} />
      <meshBasicMaterial transparent opacity={0} color="#fff" depthWrite={false} />
    </mesh>
  );
};

const ImpactDust = ({ active, profile, position }: { active: boolean, profile: ImpactProfile | null, position: Vector3 }) => {
  const meshRef = useRef<Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current || !active || !profile) {
      if (meshRef.current) meshRef.current.visible = false;
      timeRef.current = 0;
      return;
    }

    timeRef.current += delta;
    const t = Math.min(timeRef.current / Math.max(0.2, profile.ringDuration), 1);
    meshRef.current.visible = true;
    meshRef.current.position.copy(position).setY(0.13);
    meshRef.current.scale.setScalar(MathUtils.lerp(0.15, 1.5 + profile.particleCount * 0.02, t));
    const material = meshRef.current.material as MeshBasicMaterial;
    material.opacity = (1 - t) * 0.35;
    material.color.set(profile.ringColor);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.5, 20]} />
      <meshBasicMaterial transparent opacity={0} color="#fff" depthWrite={false} />
    </mesh>
  );
};

const getHitZone = (hitPos: Vector3): HitZone => {
  const xRatio = Math.abs(hitPos.x) / (GAME_CONFIG.TABLE_SIZE.width / 2);
  const zRatio = Math.abs(hitPos.z) / (GAME_CONFIG.TABLE_SIZE.depth / 2);
  const edge = Math.max(xRatio, zRatio);
  const corner = xRatio > 0.72 && zRatio > 0.72;

  if (corner) return HitZone.CORNER;
  if (edge > 0.62) return HitZone.EDGE;
  return HitZone.CENTER;
};

const GameSceneContent = forwardRef<GameSceneHandle, GameSceneProps>(({ isSimulating, gamePhase }, ref) => {
  const beansRef = useRef<CoffeeBeansHandle>(null);
  const { raycaster, camera } = useThree();
  
  const [shakeData, setShakeData] = useState({ intensity: 0, duration: 0, active: false });
  const [shockwaveData, setShockwaveData] = useState<{ profile: ImpactProfile | null, active: boolean }>({ profile: null, active: false });
  const [impactPos, setImpactPos] = useState(new Vector3(0, 0, 0));
  const shockwaveTimerRef = useRef<number | undefined>(undefined);
  
  // Track Pendulum Value (-1 to 1)
  const pendulumValueRef = useRef(0);

  useImperativeHandle(ref, () => ({
    resolveSlap: (normalizedX, normalizedY) => {
      // 1. Calculate Grade based on Pendulum
      const rawVal = Math.abs(pendulumValueRef.current);
      let grade = SlapGrade.MISS;
      
      if (rawVal <= GAME_CONFIG.THRESHOLDS.PERFECT) {
          grade = SlapGrade.PERFECT;
      } else if (rawVal <= GAME_CONFIG.THRESHOLDS.GOOD) {
          grade = SlapGrade.GOOD;
      } else {
          grade = SlapGrade.MISS;
      }

      const profile = GAME_CONFIG.IMPACT_PROFILES[grade] || GAME_CONFIG.IMPACT_PROFILES[SlapGrade.MISS];

      // 2. Trigger Visuals
      setShakeData({ 
        intensity: profile.shakeIntensity, 
        duration: profile.shakeDuration, 
        active: true 
      });
      
      setShockwaveData({ profile, active: true });
      if (shockwaveTimerRef.current) clearTimeout(shockwaveTimerRef.current);
      shockwaveTimerRef.current = window.setTimeout(() => {
         setShakeData(prev => ({ ...prev, active: false }));
         setShockwaveData(prev => ({ ...prev, active: false }));
      }, Math.max(profile.shakeDuration, profile.ringDuration) * 1000);

      // 3. Calculate Hit Position (Raycast)
      raycaster.setFromCamera(new Vector2(normalizedX, normalizedY), camera);
      const t = -raycaster.ray.origin.y / raycaster.ray.direction.y;
      const hitPos = new Vector3().copy(raycaster.ray.origin).add(raycaster.ray.direction.multiplyScalar(t));
      
      hitPos.x = MathUtils.clamp(hitPos.x, -GAME_CONFIG.TABLE_SIZE.width/2, GAME_CONFIG.TABLE_SIZE.width/2);
      hitPos.z = MathUtils.clamp(hitPos.z, -GAME_CONFIG.TABLE_SIZE.depth/2, GAME_CONFIG.TABLE_SIZE.depth/2);
      hitPos.y = 0;
      setImpactPos(hitPos.clone());
      const zone = getHitZone(hitPos);

      // 4. Apply Physics
      let moved = 0;
      if (beansRef.current) {
        moved = beansRef.current.applySlap(hitPos, profile, zone);
      }

      if (grade === SlapGrade.PERFECT && profile.secondPulseDelayMs && profile.secondPulseScale) {
        window.setTimeout(() => {
          const pulseProfile: ImpactProfile = {
            ...profile,
            verticalImpulse: profile.verticalImpulse * profile.secondPulseScale!,
            horizontalImpulse: profile.horizontalImpulse * profile.secondPulseScale!,
            radius: profile.radius * 1.1
          };
          beansRef.current?.applySlap(hitPos, pulseProfile, zone);
        }, profile.secondPulseDelayMs);
      }
      
      return { grade, hitPos, moved, zone };
    },
    resetBeans: () => {
       beansRef.current?.reset();
    },
    getScore: () => {
       return beansRef.current?.getScore() || 0;
    }
  }));

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 3]} fov={50} />
      <CameraController shakeData={shakeData} />
      
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      <Environment preset="city" />

      <Table />
      
      {/* Pendulum Indicator */}
      <PendulumGauge 
        active={gamePhase === GamePhase.QTE} 
        valueRef={pendulumValueRef}
      />
      
      <Shockwave profile={shockwaveData.profile} active={shockwaveData.active} position={impactPos} />
      <ImpactDust profile={shockwaveData.profile} active={shockwaveData.active} position={impactPos} />
      
      <CoffeeBeans ref={beansRef} isSimulating={isSimulating} />
      
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2} far={1} />
    </>
  );
});

const GameScene = forwardRef<GameSceneHandle, GameSceneProps>((props, ref) => {
  return (
    <Canvas shadows dpr={[1, 2]} className="touch-none select-none">
      <GameSceneContent ref={ref} {...props} />
    </Canvas>
  );
});

export default GameScene;
