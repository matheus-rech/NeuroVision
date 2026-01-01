/**
 * SurgicalInstruments - Virtual 3D Surgical Instruments
 * ======================================================
 *
 * Renders virtual surgical instruments in the 3D scene based on
 * hand tracking input. Instruments match those used in transsphenoidal
 * pituitary surgery (per PitVQA dataset annotations).
 *
 * Instruments:
 * - Ring Curette: For tumor removal
 * - Suction Aspirator: For fluid/debris removal
 * - Endoscope: For visualization (affects camera)
 * - Bipolar Forceps: For hemostasis
 * - Micro-Dissector: For tissue separation
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { INSTRUMENTS } from './HandTracker';

/**
 * Ring Curette - Circular instrument for tumor scooping
 */
function RingCurette({ position, rotation, isActive }) {
  const meshRef = useRef();

  // Curette geometry: long shaft with ring at end
  const shaftGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8);
  }, []);

  const ringGeometry = useMemo(() => {
    return new THREE.TorusGeometry(0.06, 0.01, 8, 16);
  }, []);

  useFrame((state) => {
    if (meshRef.current && isActive) {
      // Subtle vibration when active
      meshRef.current.position.x += Math.sin(state.clock.elapsedTime * 20) * 0.001;
    }
  });

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      {/* Shaft */}
      <mesh geometry={shaftGeometry} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ring at tip */}
      <mesh geometry={ringGeometry} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={isActive ? '#50fa7b' : '#c0c0c0'}
          metalness={0.8}
          roughness={0.2}
          emissive={isActive ? '#50fa7b' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Handle */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#404040" roughness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Suction Aspirator - Tube for removing fluid/debris
 */
function SuctionAspirator({ position, rotation, isActive }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current && isActive) {
      // Pulsing suction effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.02;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      {/* Main tube */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 1.2, 12]} />
        <meshStandardMaterial
          color="#e0e0e0"
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Tip opening */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.05, 12]} />
        <meshStandardMaterial
          color={isActive ? '#ff6b6b' : '#808080'}
          emissive={isActive ? '#ff6b6b' : '#000000'}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </mesh>

      {/* Suction effect (when active) */}
      {isActive && (
        <mesh position={[0, -0.1, 0]}>
          <coneGeometry args={[0.03, 0.15, 8]} />
          <meshBasicMaterial color="#ff6b6b" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Handle */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 8]} />
        <meshStandardMaterial color="#303030" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Bipolar Forceps - Two-pronged instrument for hemostasis
 */
function BipolarForceps({ position, rotation, isActive }) {
  const leftProngRef = useRef();
  const rightProngRef = useRef();

  useFrame((state) => {
    if (isActive && leftProngRef.current && rightProngRef.current) {
      // Opening/closing animation
      const angle = Math.sin(state.clock.elapsedTime * 5) * 0.1;
      leftProngRef.current.rotation.z = -angle;
      rightProngRef.current.rotation.z = angle;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Left prong */}
      <group ref={leftProngRef} position={[-0.02, 0, 0]}>
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.015, 0.8, 0.01]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.9}
            roughness={0.1}
            emissive={isActive ? '#ffff00' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
          />
        </mesh>
      </group>

      {/* Right prong */}
      <group ref={rightProngRef} position={[0.02, 0, 0]}>
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.015, 0.8, 0.01]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.9}
            roughness={0.1}
            emissive={isActive ? '#ffff00' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
          />
        </mesh>
      </group>

      {/* Handle body */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.03, 0.035, 0.4, 8]} />
        <meshStandardMaterial color="#202020" roughness={0.8} />
      </mesh>

      {/* Electrical indicator */}
      {isActive && (
        <pointLight position={[0, 0, 0]} color="#ffff00" intensity={0.5} distance={0.3} />
      )}
    </group>
  );
}

/**
 * Micro-Dissector - Fine instrument for tissue separation
 */
function MicroDissector({ position, rotation, isActive }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Shaft */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.0, 8]} />
        <meshStandardMaterial color="#b8b8b8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Angled tip */}
      <mesh position={[0, 0, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.025, 0.08, 0.008]} />
        <meshStandardMaterial
          color={isActive ? '#4ecdc4' : '#a0a0a0'}
          metalness={0.9}
          roughness={0.1}
          emissive={isActive ? '#4ecdc4' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Handle */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.25, 6]} />
        <meshStandardMaterial color="#252525" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Endoscope indicator (doesn't render instrument, affects view)
 */
function EndoscopeIndicator({ isActive }) {
  if (!isActive) return null;

  return (
    <Html position={[0, 1.5, 0]} center>
      <div className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm whitespace-nowrap">
        🔭 Endoscope Mode - Move hand to look around
      </div>
    </Html>
  );
}

/**
 * Collision detection sphere (visual feedback)
 */
function CollisionIndicator({ position, isColliding, structureName }) {
  if (!isColliding) return null;

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
      </mesh>
      <Html center>
        <div className="px-2 py-1 bg-red-600 rounded text-white text-xs font-bold animate-pulse">
          ⚠️ {structureName}
        </div>
      </Html>
    </group>
  );
}

/**
 * Main SurgicalInstruments Component
 */
export function SurgicalInstruments({
  instrumentType = INSTRUMENTS.NONE,
  position = { x: 0, y: 0, z: 0 },
  isActive = false,
  collision = null, // { isColliding: bool, structureName: string }
}) {
  // Convert position to array for Three.js
  const pos = [position.x, position.y, position.z];

  // Calculate rotation based on position (instrument points toward center)
  const rotation = useMemo(() => {
    const angleX = Math.atan2(position.y, position.z + 3) * 0.5;
    const angleY = Math.atan2(position.x, position.z + 3) * 0.5;
    return [angleX, angleY, 0];
  }, [position]);

  // Don't render if no instrument
  if (instrumentType === INSTRUMENTS.NONE) {
    return null;
  }

  return (
    <group>
      {/* Render appropriate instrument */}
      {instrumentType === INSTRUMENTS.CURETTE && (
        <RingCurette position={pos} rotation={rotation} isActive={isActive} />
      )}

      {instrumentType === INSTRUMENTS.SUCTION && (
        <SuctionAspirator position={pos} rotation={rotation} isActive={isActive} />
      )}

      {instrumentType === INSTRUMENTS.FORCEPS && (
        <BipolarForceps position={pos} rotation={rotation} isActive={isActive} />
      )}

      {instrumentType === INSTRUMENTS.DISSECTOR && (
        <MicroDissector position={pos} rotation={rotation} isActive={isActive} />
      )}

      {instrumentType === INSTRUMENTS.ENDOSCOPE && (
        <EndoscopeIndicator isActive={isActive} />
      )}

      {/* Collision warning */}
      {collision?.isColliding && (
        <CollisionIndicator
          position={pos}
          isColliding={collision.isColliding}
          structureName={collision.structureName}
        />
      )}

      {/* Instrument tip light */}
      {isActive && instrumentType !== INSTRUMENTS.ENDOSCOPE && (
        <pointLight position={pos} color="#ffffff" intensity={0.3} distance={0.5} />
      )}
    </group>
  );
}

export default SurgicalInstruments;
