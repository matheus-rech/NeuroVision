/**
 * PituitaryModel3D - Transsphenoidal Surgery Training Visualization
 * =================================================================
 *
 * Realistic 3D visualization for pituitary surgery training.
 * Features modular anatomical structures with correct spatial relationships.
 *
 * Model Sources (to be imported):
 * - BodyParts3D (CC-BY-SA 2.1): https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
 * - AnatomyTOOL Open 3D Model: https://anatomytool.org/open3dmodel
 *
 * Current: Anatomically-positioned placeholder geometry
 * TODO: Replace with GLTF models from above sources
 */

import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { SurgicalInstruments } from './SurgicalInstruments';
import { INSTRUMENTS } from './HandTracker';

// Anatomical constants (in mm, scaled to scene units)
const SCALE = 0.05; // 1mm = 0.05 scene units

const ANATOMY = {
  // Distances from midline (X), anterior-posterior from sella (Z), vertical from sella floor (Y)
  sella: { width: 12, depth: 10, height: 8 }, // Average sella dimensions
  pituitary: { width: 10, depth: 8, height: 6 },
  carotidDistance: 20, // Intercarotid distance (mm)
  chiasmHeight: 10, // Height above sella
  sphenoidDepth: 15, // Depth of sphenoid sinus
};

/**
 * Individual anatomical structure component
 */
function AnatomicalStructure({
  name,
  position,
  geometry,
  color,
  opacity = 0.7,
  visible = true,
  isHighlighted = false,
  isCritical = false,
  showLabel = true,
  onClick,
}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && (isHighlighted || isCritical)) {
      // Pulsing effect for highlighted/critical structures
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered ? '#ffffff' : color}
          transparent
          opacity={hovered ? 0.9 : opacity}
          emissive={isCritical ? '#ff0000' : isHighlighted ? '#00ff00' : '#000000'}
          emissiveIntensity={isCritical ? 0.3 : isHighlighted ? 0.2 : 0}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {showLabel && (
        <Html
          position={[0, geometry.parameters?.height * 0.6 || 0.3, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className={`px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap
            ${isCritical ? 'bg-red-600/90' : isHighlighted ? 'bg-green-600/90' : 'bg-gray-800/80'}`}>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Skull base with sella turcica
 */
function SkullBase({ opacity = 0.3, showLabels = true }) {
  const geometry = useMemo(() => {
    // Simplified skull base shape
    const shape = new THREE.Shape();
    shape.moveTo(-3, 0);
    shape.quadraticCurveTo(-3, 2, -2, 2.5);
    shape.lineTo(2, 2.5);
    shape.quadraticCurveTo(3, 2, 3, 0);
    shape.lineTo(3, -1);
    shape.lineTo(-3, -1);
    shape.closePath();

    // Sella turcica depression
    const sellaHole = new THREE.Path();
    sellaHole.moveTo(-0.6, 0);
    sellaHole.quadraticCurveTo(-0.6, -0.4, 0, -0.5);
    sellaHole.quadraticCurveTo(0.6, -0.4, 0.6, 0);
    shape.holes.push(sellaHole);

    const extrudeSettings = { depth: 2, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#e8dcc8"
          transparent
          opacity={opacity}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showLabels && (
        <Html position={[0, 0, 1.5]}>
          <div className="px-2 py-1 rounded text-xs font-medium text-gray-300 bg-gray-900/60 whitespace-nowrap">
            Skull Base
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Sphenoid sinus cavity
 */
function SphenoidSinus({ opacity = 0.2, showLabels = true }) {
  const geometry = useMemo(() => {
    // Sphenoid sinus - air-filled cavity anterior to sella
    return new THREE.BoxGeometry(
      ANATOMY.sella.width * SCALE * 1.5,
      ANATOMY.sella.height * SCALE * 1.2,
      ANATOMY.sphenoidDepth * SCALE
    );
  }, []);

  return (
    <AnatomicalStructure
      name="Sphenoid Sinus"
      position={[0, 0, ANATOMY.sphenoidDepth * SCALE * 0.7]}
      geometry={geometry}
      color="#4a90a4"
      opacity={opacity}
      showLabel={showLabels}
    />
  );
}

/**
 * Sella turcica (Turkish saddle)
 */
function SellaTurcica({ opacity = 0.4, showLabels = true, isHighlighted = false }) {
  const geometry = useMemo(() => {
    // Saddle-shaped depression
    return new THREE.BoxGeometry(
      ANATOMY.sella.width * SCALE,
      ANATOMY.sella.height * SCALE,
      ANATOMY.sella.depth * SCALE
    );
  }, []);

  return (
    <AnatomicalStructure
      name="Sella Turcica"
      position={[0, 0, 0]}
      geometry={geometry}
      color="#d4a574"
      opacity={opacity}
      showLabel={showLabels}
      isHighlighted={isHighlighted}
    />
  );
}

/**
 * Pituitary gland with anterior/posterior distinction
 */
function PituitaryGland({ opacity = 0.8, showLabels = true, tumorCase = null }) {
  const anteriorGeometry = useMemo(() => {
    return new THREE.SphereGeometry(ANATOMY.pituitary.width * SCALE * 0.4, 16, 16);
  }, []);

  const posteriorGeometry = useMemo(() => {
    return new THREE.SphereGeometry(ANATOMY.pituitary.width * SCALE * 0.2, 16, 16);
  }, []);

  return (
    <group position={[0, ANATOMY.sella.height * SCALE * 0.3, 0]}>
      {/* Anterior pituitary (adenohypophysis) */}
      <AnatomicalStructure
        name="Anterior Pituitary"
        position={[0, 0, 0.1]}
        geometry={anteriorGeometry}
        color="#ff9999"
        opacity={opacity}
        showLabel={showLabels}
      />

      {/* Posterior pituitary (neurohypophysis) */}
      <AnatomicalStructure
        name="Posterior Pituitary"
        position={[0, 0, -0.15]}
        geometry={posteriorGeometry}
        color="#ffcccc"
        opacity={opacity}
        showLabel={false}
      />
    </group>
  );
}

/**
 * Tumor visualization (varies by case)
 */
function Tumor({ caseType = 'micro', opacity = 0.7, showLabels = true }) {
  const config = useMemo(() => {
    switch (caseType) {
      case 'micro':
        return { size: 8, position: [0, 0.2, 0], color: '#9333ea' };
      case 'macro':
        return { size: 25, position: [0, 0.5, 0], color: '#7c3aed' };
      case 'invasive':
        return { size: 30, position: [0.3, 0.4, 0], color: '#6d28d9' };
      default:
        return { size: 8, position: [0, 0.2, 0], color: '#9333ea' };
    }
  }, [caseType]);

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(config.size * SCALE * 0.5, 24, 24);
  }, [config.size]);

  return (
    <AnatomicalStructure
      name={`Tumor (${caseType})`}
      position={config.position}
      geometry={geometry}
      color={config.color}
      opacity={opacity}
      showLabel={showLabels}
      isHighlighted={true}
    />
  );
}

/**
 * Optic chiasm - critical structure
 */
function OpticChiasm({ opacity = 0.7, showLabels = true, isCritical = false }) {
  const geometry = useMemo(() => {
    // X-shaped optic chiasm
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0.05);
    shape.lineTo(-0.1, 0.05);
    shape.lineTo(0, 0.15);
    shape.lineTo(0.1, 0.05);
    shape.lineTo(0.4, 0.05);
    shape.lineTo(0.4, -0.05);
    shape.lineTo(0.1, -0.05);
    shape.lineTo(0, -0.15);
    shape.lineTo(-0.1, -0.05);
    shape.lineTo(-0.4, -0.05);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  }, []);

  return (
    <group position={[0, ANATOMY.chiasmHeight * SCALE, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#ffeb3b"
          transparent
          opacity={opacity}
          emissive={isCritical ? '#ff0000' : '#ffeb3b'}
          emissiveIntensity={isCritical ? 0.5 : 0.1}
        />
      </mesh>
      {showLabels && (
        <Html position={[0, 0.3, 0]}>
          <div className={`px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap
            ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-yellow-600/80'}`}>
            Optic Chiasm {isCritical && '⚠️'}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Carotid arteries - critical structures
 */
function CarotidArteries({ opacity = 0.8, showLabels = true, isCritical = false }) {
  const tubeGeometry = useMemo(() => {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -1, 0.5),
      new THREE.Vector3(0, -0.3, 0.3),
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(0, 0.8, -0.2),
    ]);
    return new THREE.TubeGeometry(path, 20, 0.08, 8, false);
  }, []);

  const carotidX = (ANATOMY.carotidDistance / 2) * SCALE;

  return (
    <group>
      {/* Left carotid */}
      <group position={[-carotidX, 0, 0]}>
        <mesh geometry={tubeGeometry}>
          <meshStandardMaterial
            color="#dc2626"
            emissive={isCritical ? '#ff0000' : '#dc2626'}
            emissiveIntensity={isCritical ? 0.5 : 0.2}
          />
        </mesh>
        {showLabels && (
          <Html position={[0, 0.5, 0]}>
            <div className={`px-1 py-0.5 rounded text-xs font-medium text-white
              ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-red-800/80'}`}>
              L. Carotid
            </div>
          </Html>
        )}
      </group>

      {/* Right carotid */}
      <group position={[carotidX, 0, 0]}>
        <mesh geometry={tubeGeometry}>
          <meshStandardMaterial
            color="#dc2626"
            emissive={isCritical ? '#ff0000' : '#dc2626'}
            emissiveIntensity={isCritical ? 0.5 : 0.2}
          />
        </mesh>
        {showLabels && (
          <Html position={[0, 0.5, 0]}>
            <div className={`px-1 py-0.5 rounded text-xs font-medium text-white
              ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-red-800/80'}`}>
              R. Carotid
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

/**
 * Nasal cavity entry corridor
 */
function NasalCorridor({ opacity = 0.15, showLabels = true }) {
  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.3, 0.5, 3, 16, 1, true);
  }, []);

  return (
    <group position={[0, 0, 2]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#8b5cf6"
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showLabels && (
        <Html position={[0, 0, 1.8]}>
          <div className="px-2 py-1 rounded text-xs font-medium text-purple-300 bg-purple-900/60 whitespace-nowrap">
            Nasal Corridor
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Surgical trajectory line
 */
function SurgicalTrajectory({ currentPhase = 0, totalPhases = 6 }) {
  const points = useMemo(() => [
    [0, 0, 3.5],    // Nostril entry
    [0, 0, 2],      // Mid nasal
    [0, 0, 0.8],    // Sphenoid
    [0, 0, 0.3],    // Sellar floor
    [0, 0.2, 0],    // Dura
    [0, 0.3, 0],    // Target
  ], []);

  const progress = currentPhase / totalPhases;
  const currentPoint = Math.floor(progress * (points.length - 1));

  return (
    <group>
      {/* Full trajectory (dashed) */}
      <Line
        points={points}
        color="#3b82f6"
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Completed trajectory (solid) */}
      {currentPhase > 0 && (
        <Line
          points={points.slice(0, currentPoint + 1)}
          color="#10b981"
          lineWidth={3}
        />
      )}

      {/* Current position marker */}
      {currentPhase > 0 && currentPhase < totalPhases && (
        <mesh position={points[currentPoint]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Scene lighting and controls with animated camera
 */
function SceneSetup({
  children,
  viewMode = 'overview',
  cameraPosition = null,
  cameraTarget = null,
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const controlsRef = useRef();

  // Smooth camera animation
  useFrame(() => {
    if (cameraPosition && cameraTarget) {
      // Animate camera position
      camera.position.lerp(
        new THREE.Vector3(cameraPosition[0], cameraPosition[1], cameraPosition[2]),
        0.05
      );

      // Animate look target
      targetRef.current.lerp(
        new THREE.Vector3(cameraTarget[0], cameraTarget[1], cameraTarget[2]),
        0.05
      );

      // Update controls target for smooth orbit
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetRef.current);
      }

      camera.lookAt(targetRef.current);
    }
  });

  // Set camera based on viewMode when no external control
  useEffect(() => {
    if (cameraPosition && cameraTarget) return; // External control active

    switch (viewMode) {
      case 'endoscope':
        camera.position.set(0, 0, 4);
        camera.lookAt(0, 0, 0);
        break;
      case 'lateral':
        camera.position.set(4, 1, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'superior':
        camera.position.set(0, 4, 0);
        camera.lookAt(0, 0, 0);
        break;
      default:
        camera.position.set(2, 2, 3);
        camera.lookAt(0, 0, 0);
    }
  }, [camera, viewMode, cameraPosition, cameraTarget]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />
      <pointLight position={[0, 2, 2]} intensity={0.3} color="#fff" />

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={10}
      />

      {children}
    </>
  );
}

/**
 * Main PituitaryModel3D component
 */
// Critical structure positions for collision detection (in scene units)
const CRITICAL_ZONES = {
  chiasm: { center: [0, ANATOMY.chiasmHeight * SCALE, -0.1], radius: 0.25 },
  leftCarotid: { center: [-(ANATOMY.carotidDistance / 2) * SCALE, 0, 0], radius: 0.15 },
  rightCarotid: { center: [(ANATOMY.carotidDistance / 2) * SCALE, 0, 0], radius: 0.15 },
};

/**
 * Check collision between instrument and critical structures
 */
function checkCollision(instrumentPos) {
  for (const [name, zone] of Object.entries(CRITICAL_ZONES)) {
    const dx = instrumentPos.x - zone.center[0];
    const dy = instrumentPos.y - zone.center[1];
    const dz = instrumentPos.z - zone.center[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < zone.radius) {
      return {
        isColliding: true,
        structureName: name === 'chiasm' ? 'Optic Chiasm' : name.replace(/([A-Z])/g, ' $1').trim(),
        distance,
      };
    }
  }
  return { isColliding: false, structureName: null, distance: null };
}

export function PituitaryModel3D({
  tumorCase = 'micro',
  currentPhase = 0,
  showLabels = true,
  viewMode = 'overview',
  visibleStructures = {
    skullBase: true,
    sphenoid: true,
    sella: true,
    pituitary: true,
    tumor: true,
    chiasm: true,
    carotids: true,
    nasalCorridor: true,
    trajectory: true,
  },
  structureOpacity = {
    skullBase: 0.3,
    sphenoid: 0.2,
    sella: 0.4,
    pituitary: 0.8,
    tumor: 0.7,
    chiasm: 0.7,
    carotids: 0.8,
    nasalCorridor: 0.15,
  },
  highlightedStructure = null,
  criticalStructures = [],
  className = '',
  // Instrument props (from hand tracking)
  instrumentType = INSTRUMENTS.NONE,
  instrumentPosition = { x: 0, y: 0, z: 2 },
  isInstrumentActive = false,
  onCollision = null,
  // Camera control (from guided navigation)
  cameraPosition = null,
  cameraTarget = null,
}) {
  const [internalViewMode, setInternalViewMode] = useState(viewMode);
  const [collision, setCollision] = useState({ isColliding: false });

  // Check for collisions when instrument moves
  useEffect(() => {
    if (instrumentType !== INSTRUMENTS.NONE) {
      const result = checkCollision(instrumentPosition);
      setCollision(result);
      if (result.isColliding && onCollision) {
        onCollision(result);
      }
    } else {
      setCollision({ isColliding: false });
    }
  }, [instrumentPosition, instrumentType, onCollision]);

  // Dynamic critical structures based on collision
  const activeCriticalStructures = useMemo(() => {
    const structures = [...criticalStructures];
    if (collision.isColliding) {
      if (collision.structureName === 'Optic Chiasm') structures.push('chiasm');
      if (collision.structureName?.includes('Carotid')) structures.push('carotids');
    }
    return structures;
  }, [criticalStructures, collision]);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneSetup
          viewMode={internalViewMode}
          cameraPosition={cameraPosition}
          cameraTarget={cameraTarget}
        >
          {/* Anatomical structures */}
          {visibleStructures.skullBase && (
            <SkullBase opacity={structureOpacity.skullBase} showLabels={showLabels} />
          )}

          {visibleStructures.nasalCorridor && (
            <NasalCorridor opacity={structureOpacity.nasalCorridor} showLabels={showLabels} />
          )}

          {visibleStructures.sphenoid && (
            <SphenoidSinus opacity={structureOpacity.sphenoid} showLabels={showLabels} />
          )}

          {visibleStructures.sella && (
            <SellaTurcica
              opacity={structureOpacity.sella}
              showLabels={showLabels}
              isHighlighted={highlightedStructure === 'sella'}
            />
          )}

          {visibleStructures.pituitary && (
            <PituitaryGland opacity={structureOpacity.pituitary} showLabels={showLabels} />
          )}

          {visibleStructures.tumor && (
            <Tumor
              caseType={tumorCase}
              opacity={structureOpacity.tumor}
              showLabels={showLabels}
            />
          )}

          {visibleStructures.chiasm && (
            <OpticChiasm
              opacity={structureOpacity.chiasm}
              showLabels={showLabels}
              isCritical={activeCriticalStructures.includes('chiasm')}
            />
          )}

          {visibleStructures.carotids && (
            <CarotidArteries
              opacity={structureOpacity.carotids}
              showLabels={showLabels}
              isCritical={activeCriticalStructures.includes('carotids')}
            />
          )}

          {visibleStructures.trajectory && (
            <SurgicalTrajectory currentPhase={currentPhase} totalPhases={6} />
          )}

          {/* Virtual Surgical Instruments */}
          <SurgicalInstruments
            instrumentType={instrumentType}
            position={instrumentPosition}
            isActive={isInstrumentActive}
            collision={collision}
          />

          {/* Grid for reference */}
          <gridHelper args={[4, 20, '#1f2937', '#1f2937']} position={[0, -1, 0]} />
        </SceneSetup>
      </Canvas>

      {/* Collision warning overlay */}
      {collision.isColliding && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="px-4 py-2 bg-red-600/90 rounded-lg text-white text-lg font-bold animate-pulse">
            ⚠️ DANGER: {collision.structureName}
          </div>
        </div>
      )}

      {/* View mode controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        {['overview', 'endoscope', 'lateral', 'superior'].map((mode) => (
          <button
            key={mode}
            onClick={() => setInternalViewMode(mode)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              internalViewMode === mode
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-gray-900/90 rounded-lg p-3 text-xs">
        <div className="font-medium text-gray-300 mb-2">Structures</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-gray-400">Tumor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-400">Optic Chiasm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            <span className="text-gray-400">Carotids</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-400"></span>
            <span className="text-gray-400">Pituitary</span>
          </div>
        </div>
      </div>

      {/* Case indicator */}
      <div className="absolute top-3 left-3 bg-gray-900/90 rounded-lg px-3 py-2">
        <div className="text-xs text-gray-400">Training Case</div>
        <div className="text-sm font-medium text-white capitalize">{tumorCase}adenoma</div>
      </div>
    </div>
  );
}

export default PituitaryModel3D;
