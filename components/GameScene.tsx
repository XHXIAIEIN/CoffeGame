import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import { Vector3, MathUtils, Vector2 } from 'three';
import CoffeeBeans, { CoffeeBeansHandle } from './CoffeeBeans';
import Table from './Table';
import { GAME_CONFIG } from '../config';

interface GameSceneProps {
  isSimulating: boolean;
  onSceneReady: () => void;
}

export interface GameSceneHandle {
  triggerSlap: (screenX: number, screenY: number, power: number) => { moved: number, hitPos: Vector3 };
  resetBeans: () => void;
  getScore: () => number;
  shakeCamera: () => void;
}

// Camera shaker component
const CameraController = ({ shakeTrigger }: { shakeTrigger: number }) => {
  const { camera } = useThree();
  const initialPos = useRef(new Vector3(0, 4, 3));
  
  useFrame(() => {
    if (shakeTrigger > 0) {
      const trauma = Math.pow(shakeTrigger, 2); // Non-linear
      const offset = new Vector3(
        (Math.random() - 0.5) * trauma * 0.5,
        (Math.random() - 0.5) * trauma * 0.5,
        (Math.random() - 0.5) * trauma * 0.5
      );
      camera.position.copy(initialPos.current).add(offset);
      camera.lookAt(0, 0, 0);
    } else {
      // Smooth return
      camera.position.lerp(initialPos.current, 0.1);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

const GameSceneContent = forwardRef<GameSceneHandle, GameSceneProps>(({ isSimulating }, ref) => {
  const beansRef = useRef<CoffeeBeansHandle>(null);
  const { raycaster, camera, scene } = useThree();
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // Decay shake
  useFrame((state, delta) => {
    if (shakeIntensity > 0) {
      setShakeIntensity(prev => Math.max(0, prev - delta * 2));
    }
  });

  useImperativeHandle(ref, () => ({
    triggerSlap: (normalizedX, normalizedY, power) => {
      // Raycast from camera to find table point
      raycaster.setFromCamera(new Vector2(normalizedX, normalizedY), camera);
      
      // Simple plane intersection for speed (y=0 plane)
      // ray origin + t * ray direction = point where y=0
      // origin.y + t * direction.y = 0  => t = -origin.y / direction.y
      const t = -raycaster.ray.origin.y / raycaster.ray.direction.y;
      const hitPos = new Vector3().copy(raycaster.ray.origin).add(raycaster.ray.direction.multiplyScalar(t));
      
      // Clamp to table limits to ensure we don't slap void
      hitPos.x = MathUtils.clamp(hitPos.x, -GAME_CONFIG.TABLE_SIZE.width/2, GAME_CONFIG.TABLE_SIZE.width/2);
      hitPos.z = MathUtils.clamp(hitPos.z, -GAME_CONFIG.TABLE_SIZE.depth/2, GAME_CONFIG.TABLE_SIZE.depth/2);
      hitPos.y = 0; // Ensure flattened

      let moved = 0;
      if (beansRef.current) {
        moved = beansRef.current.applySlap(hitPos, power);
      }
      
      return { moved, hitPos };
    },
    resetBeans: () => {
       beansRef.current?.reset();
    },
    getScore: () => {
       return beansRef.current?.getScore() || 0;
    },
    shakeCamera: () => {
      setShakeIntensity(1.0);
    }
  }));

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 3]} fov={50} />
      <CameraController shakeTrigger={shakeIntensity} />
      
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      <Environment preset="city" />

      <Table />
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