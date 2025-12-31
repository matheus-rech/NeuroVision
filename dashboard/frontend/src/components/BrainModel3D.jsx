import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Brain mesh component - stylized brain representation
 */
function BrainMesh({ opacity = 0.6 }) {
  const meshRef = useRef();

  // Create brain-like geometry using merged spheres
  const geometry = useMemo(() => {
    const group = new THREE.Group();

    // Main brain sphere (slightly flattened)
    const mainGeo = new THREE.SphereGeometry(2, 32, 32);
    mainGeo.scale(1, 0.85, 1.1);

    // Create merged geometry for brain lobes
    const positions = mainGeo.attributes.position;
    const vertex = new THREE.Vector3();

    // Add surface detail to simulate gyri/sulci
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      // Add some noise for brain-like surface
      const noise = Math.sin(vertex.x * 4) * 0.05 +
                   Math.sin(vertex.y * 3) * 0.05 +
                   Math.sin(vertex.z * 5) * 0.03;
      vertex.multiplyScalar(1 + noise);

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    mainGeo.computeVertexNormals();
    return mainGeo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle breathing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.002;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#ffa0a0"
        transparent
        opacity={opacity}
        roughness={0.8}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Trajectory visualization - entry to target path
 */
function TrajectoryPath({ entryPoint, targetPoint, currentDepth = 0, maxDepth = 100 }) {
  const lineRef = useRef();

  // Convert normalized coordinates to 3D space
  const entry = useMemo(() => {
    if (!entryPoint) return [0, 2.5, 0];
    return [
      (entryPoint[0] - 0.5) * 4,
      2.5,
      (entryPoint[1] - 0.5) * 4,
    ];
  }, [entryPoint]);

  const target = useMemo(() => {
    if (!targetPoint) return [0, -1, 0];
    return [
      (targetPoint[0] - 0.5) * 4,
      -1,
      (targetPoint[1] - 0.5) * 4,
    ];
  }, [targetPoint]);

  // Calculate current position along trajectory
  const currentPosition = useMemo(() => {
    const progress = currentDepth / maxDepth;
    return entry.map((e, i) => e + (target[i] - e) * progress);
  }, [entry, target, currentDepth, maxDepth]);

  return (
    <group>
      {/* Planned trajectory line (dashed) */}
      <Line
        points={[entry, target]}
        color="#3b82f6"
        lineWidth={2}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />

      {/* Completed path (solid) */}
      {currentDepth > 0 && (
        <Line
          points={[entry, currentPosition]}
          color="#10b981"
          lineWidth={3}
        />
      )}

      {/* Entry point marker */}
      <mesh position={entry}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
      </mesh>
      <Html position={entry} style={{ pointerEvents: 'none' }}>
        <div className="bg-green-500/80 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap transform -translate-x-1/2 -translate-y-8">
          Entry
        </div>
      </Html>

      {/* Target point marker */}
      <mesh position={target}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Html position={target} style={{ pointerEvents: 'none' }}>
        <div className="bg-red-500/80 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap transform -translate-x-1/2 translate-y-4">
          Target
        </div>
      </Html>

      {/* Current position indicator */}
      {currentDepth > 0 && (
        <mesh position={currentPosition}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Critical structures markers
 */
function CriticalStructures({ structures = [] }) {
  const defaultStructures = [
    { name: 'Motor Cortex', position: [1.2, 1.5, 0.5], color: '#ef4444', risk: 'high' },
    { name: 'Tumor', position: [0.3, 0.8, -0.3], color: '#8b5cf6', risk: 'target' },
    { name: 'Vessel', position: [-0.5, 0.6, 0.4], color: '#3b82f6', risk: 'medium' },
  ];

  const allStructures = structures.length > 0 ? structures : defaultStructures;

  return (
    <group>
      {allStructures.map((structure, index) => (
        <group key={index} position={structure.position}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color={structure.color}
              transparent
              opacity={0.7}
              emissive={structure.color}
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Pulsing ring for high-risk structures */}
          {structure.risk === 'high' && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.2, 0.25, 32]} />
              <meshStandardMaterial
                color="#ef4444"
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          <Html style={{ pointerEvents: 'none' }}>
            <div className={`px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap transform -translate-x-1/2 -translate-y-6
              ${structure.risk === 'high' ? 'bg-red-500/80' :
                structure.risk === 'target' ? 'bg-purple-500/80' : 'bg-blue-500/80'}`}>
              {structure.name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

/**
 * Depth indicator gauge
 */
function DepthGauge({ currentDepth, maxDepth }) {
  const percentage = Math.min(100, (currentDepth / maxDepth) * 100);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
      <div className="text-xs text-gray-400 font-medium">DEPTH</div>
      <div className="relative w-3 h-48 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-blue-500 rounded-full transition-all duration-300"
          style={{ height: `${percentage}%` }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="absolute left-full ml-1 w-2 h-px bg-gray-600"
            style={{ bottom: `${tick}%` }}
          />
        ))}
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-white">{currentDepth.toFixed(1)}</div>
        <div className="text-xs text-gray-500">/ {maxDepth} mm</div>
      </div>
    </div>
  );
}

/**
 * Scene setup with camera controls
 */
function Scene({ children, autoRotate = false }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.2} color="#fff" />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={15}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.2}
      />

      {children}
    </>
  );
}

/**
 * Main 3D Brain Model component
 */
export function BrainModel3D({
  trajectory,
  entryPoint,
  targetPoint,
  currentDepth = 0,
  maxDepth = 100,
  structures = [],
  showDepthGauge = true,
  className = '',
  role = 'surgeon',
}) {
  const [autoRotate, setAutoRotate] = useState(role !== 'surgeon');

  // Trainee mode shows more detail
  const brainOpacity = role === 'trainee' ? 0.4 : 0.6;

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <Canvas
        className="brain-canvas"
        camera={{ fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene autoRotate={autoRotate}>
          <BrainMesh opacity={brainOpacity} />
          <TrajectoryPath
            entryPoint={entryPoint}
            targetPoint={targetPoint}
            currentDepth={currentDepth}
            maxDepth={maxDepth}
          />
          <CriticalStructures structures={structures} />

          {/* Grid helper for training mode */}
          {role === 'trainee' && (
            <gridHelper args={[6, 12, '#1f2937', '#1f2937']} position={[0, -2, 0]} />
          )}
        </Scene>
      </Canvas>

      {/* Depth gauge overlay */}
      {showDepthGauge && (
        <DepthGauge currentDepth={currentDepth} maxDepth={maxDepth} />
      )}

      {/* Controls overlay */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-lg text-xs font-medium transition-colors ${
            autoRotate
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gray-800/80 text-gray-400 border border-gray-700'
          }`}
        >
          {autoRotate ? 'Auto' : 'Manual'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-gray-900/80 rounded-lg p-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-gray-300">Entry Point</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-gray-300">Target</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-gray-300">Current</span>
        </div>
      </div>
    </div>
  );
}

export default BrainModel3D;
