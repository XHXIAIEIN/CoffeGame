import React, { useRef, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, InstancedMesh, Vector3, MathUtils, Color } from 'three';
import { GAME_CONFIG } from '../config';
import { BeanData } from '../types';

// Geometry for the bean (capsule-ish)
// We use a simple shape to keep poly count low
const tempObject = new Object3D();
const tempVec3 = new Vector3();

interface CoffeeBeansProps {
  isSimulating: boolean;
}

export interface CoffeeBeansHandle {
  reset: () => void;
  applySlap: (hitPoint: Vector3, forceMultiplier: number) => number; // Returns number of moved beans
  getScore: () => number;
}

const CoffeeBeans = forwardRef<CoffeeBeansHandle, CoffeeBeansProps>(({ isSimulating }, ref) => {
  const meshRef = useRef<InstancedMesh>(null);
  
  // Physics state stored in Mutable Refs for performance (avoiding React renders)
  const physicsData = useRef<BeanData[]>([]);

  // Initialize Beans
  const initBeans = () => {
    const data: BeanData[] = [];
    const color = new Color();
    
    for (let i = 0; i < GAME_CONFIG.BEAN_COUNT; i++) {
      // Random position on table
      const x = (Math.random() - 0.5) * (GAME_CONFIG.TABLE_SIZE.width - 0.4);
      const z = (Math.random() - 0.5) * (GAME_CONFIG.TABLE_SIZE.depth - 0.4);
      const y = GAME_CONFIG.TABLE_Y + 0.1 + Math.random() * 0.2; // Slight pile up

      // Properties
      const sizeType = Math.random(); 
      let scale = 1;
      let mass = 1;
      let value = 2;

      if (sizeType < 0.3) { scale = 0.8; mass = 0.6; value = 1; } // Small
      else if (sizeType > 0.8) { scale = 1.3; mass = 1.6; value = 4; } // Big

      data.push({
        position: [x, y, z],
        velocity: [0, 0, 0],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        angVel: [0, 0, 0],
        mass,
        scale,
        value
      });

      // Visual Init
      tempObject.position.set(x, y, z);
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      tempObject.scale.set(scale, scale, scale); // Flattened sphere roughly
      tempObject.updateMatrix();
      
      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, tempObject.matrix);
        // Random color variant
        const c = GAME_CONFIG.COLORS.BEAN_VARIANTS[Math.floor(Math.random() * GAME_CONFIG.COLORS.BEAN_VARIANTS.length)];
        meshRef.current.setColorAt(i, color.set(c));
      }
    }
    
    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }

    physicsData.current = data;
  };

  useEffect(() => {
    initBeans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => {
      initBeans();
    },
    applySlap: (hitPoint: Vector3, forceMultiplier: number) => {
      let movedCount = 0;
      
      physicsData.current.forEach((bean) => {
        // Calculate distance from slap center
        const dx = bean.position[0] - hitPoint.x;
        const dy = bean.position[1] - hitPoint.y; // Should be near 0 relative to table
        const dz = bean.position[2] - hitPoint.z;
        
        const distSq = dx*dx + dy*dy + dz*dz;
        const dist = Math.sqrt(distSq);

        if (dist < GAME_CONFIG.SLAP_RADIUS) {
          // Falloff: 1 at center, 0 at radius
          const falloff = Math.max(0, 1 - (dist / GAME_CONFIG.SLAP_RADIUS));
          // Non-linear punch for "Sweet Spot" feel
          const impact = Math.pow(falloff, 1.5) * forceMultiplier; 

          if (impact > 0.01) {
             movedCount++;
             
             // Explosion vector (Up + Away)
             // Randomize slightly for chaos
             const rx = (Math.random() - 0.5) * 0.2;
             const rz = (Math.random() - 0.5) * 0.2;

             // Normalize direction
             let dirX = dx / (dist + 0.001) + rx;
             let dirZ = dz / (dist + 0.001) + rz;
             
             // Force calculation
             // Vertical kick
             const vForce = GAME_CONFIG.SLAP_FORCE_BASE * 50 * impact / bean.mass;
             // Horizontal dispersal
             const hForce = GAME_CONFIG.DISPERSION * 20 * impact / bean.mass;

             bean.velocity[0] += dirX * hForce;
             bean.velocity[1] += vForce + (Math.random() * 5); // Add some noise
             bean.velocity[2] += dirZ * hForce;

             // Spin it
             bean.angVel[0] = (Math.random() - 0.5) * 10 * impact;
             bean.angVel[1] = (Math.random() - 0.5) * 10 * impact;
             bean.angVel[2] = (Math.random() - 0.5) * 10 * impact;
          }
        }
      });
      return movedCount;
    },
    getScore: () => {
      let score = 0;
      physicsData.current.forEach(bean => {
        // Simple scoring: if velocity > 0 or position changed significantly from start
        // Or check if off table
        const x = Math.abs(bean.position[0]);
        const z = Math.abs(bean.position[2]);
        const offTable = x > GAME_CONFIG.TABLE_SIZE.width / 2 || z > GAME_CONFIG.TABLE_SIZE.depth / 2;
        
        if (offTable) {
            score += bean.value * 2;
        } else if (bean.position[1] > 0.5) {
            score += bean.value; // Still flying high
        }
      });
      return score;
    }
  }));

  useFrame((state, delta) => {
    if (!isSimulating || !meshRef.current) return;

    // Cap delta to prevent explosion on frame drops
    const dt = Math.min(delta, 0.05); 
    const drag = Math.pow(GAME_CONFIG.DAMPING, dt * 60);

    let active = false;

    // Simple Euler integration
    physicsData.current.forEach((bean, i) => {
      // Gravity
      if (bean.position[1] > GAME_CONFIG.TABLE_Y + 0.05) {
        bean.velocity[1] -= GAME_CONFIG.GRAVITY * dt;
        active = true;
      }

      // Velocity update
      bean.position[0] += bean.velocity[0] * dt;
      bean.position[1] += bean.velocity[1] * dt;
      bean.position[2] += bean.velocity[2] * dt;

      // Rotation
      bean.rotation[0] += bean.angVel[0] * dt;
      bean.rotation[1] += bean.angVel[1] * dt;
      bean.rotation[2] += bean.angVel[2] * dt;
      
      // Damping
      bean.velocity[0] *= drag;
      bean.velocity[1] *= drag;
      bean.velocity[2] *= drag;

      // Floor Collision (Table Level)
      if (bean.position[1] < GAME_CONFIG.TABLE_Y + 0.05) {
        // Check if on table bounds
        const onTable = Math.abs(bean.position[0]) < GAME_CONFIG.TABLE_SIZE.width / 2 && 
                        Math.abs(bean.position[2]) < GAME_CONFIG.TABLE_SIZE.depth / 2;

        if (onTable) {
           bean.position[1] = GAME_CONFIG.TABLE_Y + 0.05;
           bean.velocity[1] *= -GAME_CONFIG.BOUNCE;
           // Friction
           bean.velocity[0] *= GAME_CONFIG.FRICTION;
           bean.velocity[2] *= GAME_CONFIG.FRICTION;
           bean.angVel[0] *= GAME_CONFIG.FRICTION;
           bean.angVel[2] *= GAME_CONFIG.FRICTION;

           // Stop if slow
           if (Math.abs(bean.velocity[1]) < 0.1) bean.velocity[1] = 0;
        } else if (bean.position[1] < -5) {
            // Abyss cleanup (respawn or stop processing?)
            // For this game, let them fall, stop logic if too low
            bean.velocity = [0,0,0]; 
        }
      }

      // Update Visuals
      tempObject.position.set(bean.position[0], bean.position[1], bean.position[2]);
      tempObject.rotation.set(bean.rotation[0], bean.rotation[1], bean.rotation[2]);
      tempObject.scale.set(bean.scale, bean.scale * 0.8, bean.scale); // Slightly flattened
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, GAME_CONFIG.BEAN_COUNT]}
      castShadow
      receiveShadow
    >
      {/* Low poly sphere/capsule geometry */}
      <icosahedronGeometry args={[0.08, 1]} /> 
      <meshStandardMaterial roughness={0.4} color={GAME_CONFIG.COLORS.BEAN} />
    </instancedMesh>
  );
});

export default CoffeeBeans;