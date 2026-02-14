
import React from 'react';
import { GAME_CONFIG } from '../config';

const Table = () => {
  return (
    <group position={[0, GAME_CONFIG.TABLE_Y - 0.1, 0]}>
      {/* Table Top */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <boxGeometry args={[GAME_CONFIG.TABLE_SIZE.width, 0.2, GAME_CONFIG.TABLE_SIZE.depth]} />
        <meshStandardMaterial 
          color={GAME_CONFIG.COLORS.TABLE} 
          roughness={0.6}
        />
      </mesh>
      
      {/* Legs (Decorative - Static) */}
      <mesh position={[1.5, -1, 1]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2]} />
        <meshStandardMaterial color={GAME_CONFIG.COLORS.TABLE_DARK} />
      </mesh>
      <mesh position={[-1.5, -1, 1]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2]} />
        <meshStandardMaterial color={GAME_CONFIG.COLORS.TABLE_DARK} />
      </mesh>
      <mesh position={[1.5, -1, -1]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2]} />
        <meshStandardMaterial color={GAME_CONFIG.COLORS.TABLE_DARK} />
      </mesh>
      <mesh position={[-1.5, -1, -1]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2]} />
        <meshStandardMaterial color={GAME_CONFIG.COLORS.TABLE_DARK} />
      </mesh>
    </group>
  );
};

export default Table;
