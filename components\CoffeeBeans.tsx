import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, InstancedMesh, Vector3, Color } from 'three';
import { GAME_CONFIG } from '../config';
import { BeanData, FalloffType, HitZone, ImpactProfile } from '../types';

const tempObject = new Object3D();

interface CoffeeBeansProps {
  isSimulating: boolean;
}

export interface CoffeeBeansHandle {
  reset: () => void;
  applySlap: (hitPoint: Vector3, profile: ImpactProfile, zone: HitZone) => number;
  getScore: () => number;
}

const CoffeeBeans = forwardRef<CoffeeBeansHandle, CoffeeBeansProps>(({ isSimulating }, ref) => {
  const meshRef = useRef<InstancedMesh>(null);
  const physicsData = useRef<BeanData[]>([]);
  const frameCountRef = useRef(0);

  const initBeans = () => {
    const data: BeanData[] = [];
    const color = new Color();
    
    for (let i = 0; i < GAME_CONFIG.BEAN_COUNT; i++) {
      const x = (Math.random() - 0.5) * (GAME_CONFIG.TABLE_SIZE.width - 0.4);
      const z = (Math.random() - 0.5) * (GAME_CONFIG.TABLE_SIZE.depth - 0.4);
      const y = GAME_CONFIG.TABLE_Y + 0.1 + Math.random() * 0.2;

      const sizeType = Math.random(); 
      let scale = 1;
      let mass = 1;
      let value = 2;

      if (sizeType < 0.3) { scale = 0.8; mass = 0.6; value = 1; } 
      else if (sizeType > 0.8) { scale = 1.3; mass = 1.6; value = 4; } 

      data.push({
        position: [x, y, z],
        velocity: [0, 0, 0],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        angVel: [0, 0, 0],
        mass,
        scale,
        value
      });

      tempObject.position.set(x, y, z);
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      
      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, tempObject.matrix);
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
    applySlap: (hitPoint: Vector3, profile: ImpactProfile, zone: HitZone) => {
      let movedCount = 0;
      const zoneBoost = GAME_CONFIG.ZONE_MULTIPLIERS[zone];
      
      physicsData.current.forEach((bean) => {
        const dx = bean.position[0] - hitPoint.x;
        const dy = bean.position[1] - hitPoint.y;
        const dz = bean.position[2] - hitPoint.z;
        
        const distSq = dx*dx + dy*dy + dz*dz;
        const dist = Math.sqrt(distSq);

        // Strict radius check based on profile
        if (dist < profile.radius * zoneBoost.spread) {
          const r = dist / (profile.radius * zoneBoost.spread);
          const falloff = profile.falloffType === FalloffType.EXP
            ? Math.exp(-r * profile.falloffK)
            : 1 / (1 + (r * r * profile.falloffK));

          if (falloff > 0.01) {
             movedCount++;
             
             const rx = (Math.random() - 0.5) * profile.randomness;
             const rz = (Math.random() - 0.5) * profile.randomness;

             let dirX = dx / (dist + 0.001) + rx;
             let dirZ = dz / (dist + 0.001) + rz;
             
             const vForce = profile.verticalImpulse * zoneBoost.vertical * falloff * (1 / bean.mass);
             const hForce = profile.horizontalImpulse * zoneBoost.horizontal * falloff * (1 / bean.mass);

             bean.velocity[0] += dirX * hForce;
             bean.velocity[1] += vForce; 
             bean.velocity[2] += dirZ * hForce;

             const spinForce = 10 * falloff;
             bean.angVel[0] = (Math.random() - 0.5) * spinForce;
             bean.angVel[1] = (Math.random() - 0.5) * spinForce;
             bean.angVel[2] = (Math.random() - 0.5) * spinForce;
          }
        }
      });
      return movedCount;
    },
    getScore: () => {
      let score = 0;
      physicsData.current.forEach(bean => {
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

    const currentFps = delta > 0 ? 1 / delta : 60;
    const lowFps = currentFps < 28;
    const updateStride = lowFps ? 2 : 1;
    frameCountRef.current += 1;
    if (frameCountRef.current % updateStride !== 0) return;

    const dt = Math.min(delta, 0.05); 
    const drag = Math.pow(GAME_CONFIG.DAMPING, dt * 60);

    physicsData.current.forEach((bean, i) => {
      // Gravity
      if (bean.position[1] > GAME_CONFIG.TABLE_Y + 0.05) {
        bean.velocity[1] -= GAME_CONFIG.GRAVITY * dt;
      }

      // Integration
      bean.position[0] += bean.velocity[0] * dt;
      bean.position[1] += bean.velocity[1] * dt;
      bean.position[2] += bean.velocity[2] * dt;

      bean.rotation[0] += bean.angVel[0] * dt;
      bean.rotation[1] += bean.angVel[1] * dt;
      bean.rotation[2] += bean.angVel[2] * dt;
      
      // Damping
      bean.velocity[0] *= drag;
      bean.velocity[1] *= drag;
      bean.velocity[2] *= drag;

      // Table Collision
      if (bean.position[1] < GAME_CONFIG.TABLE_Y + 0.05) {
        const onTable = Math.abs(bean.position[0]) < GAME_CONFIG.TABLE_SIZE.width / 2 && 
                        Math.abs(bean.position[2]) < GAME_CONFIG.TABLE_SIZE.depth / 2;

        if (onTable) {
           bean.position[1] = GAME_CONFIG.TABLE_Y + 0.05;
           bean.velocity[1] *= -GAME_CONFIG.BOUNCE;
           bean.velocity[0] *= GAME_CONFIG.FRICTION;
           bean.velocity[2] *= GAME_CONFIG.FRICTION;
           bean.angVel[0] *= GAME_CONFIG.FRICTION;
           bean.angVel[2] *= GAME_CONFIG.FRICTION;

           if (Math.abs(bean.velocity[1]) < 0.1) bean.velocity[1] = 0;
        } else if (bean.position[1] < -5) {
            bean.velocity = [0,0,0]; 
        }
      }

      // Visuals
      tempObject.position.set(bean.position[0], bean.position[1], bean.position[2]);
      tempObject.rotation.set(bean.rotation[0], bean.rotation[1], bean.rotation[2]);
      tempObject.scale.set(bean.scale, bean.scale * 0.8, bean.scale);
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
      <icosahedronGeometry args={[0.08, 1]} /> 
      <meshStandardMaterial roughness={0.4} color={GAME_CONFIG.COLORS.BEAN} />
    </instancedMesh>
  );
});

export default CoffeeBeans;
