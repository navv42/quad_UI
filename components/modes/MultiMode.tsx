'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Quaternion as ThreeQuaternion, Euler } from 'three';
import { preloadModels } from '@/components/3d/QuadcopterModel';
import { ONNXInference } from '@/lib/inference/ONNXInference';

// Components
import { Quadcopter } from '@/components/3d/Quadcopter';
import { Trail } from '@/components/3d/Trail';
import { MultiControlPanel, getQuadcopterColor } from '@/components/ui/MultiControlPanel';

// Hooks and utilities
import { useMultiSimulation } from '@/hooks/useMultiSimulation';
import { threeJsQuaternionToPhysics } from '@/lib/coordinateTransform';
import { getRandomFormation } from '@/lib/formations/formations';

// Types
import type { Vector3, Quaternion } from '@/lib/types';
import type { QuadcopterState } from '@/lib/types/quadcopter';

// Constants
const DT = 0.04;
const MAX_STEPS = 125;
const MAX_HEIGHT = 1.0;
const MIN_HEIGHT = -1.0;

// Helper to generate initial positions for quadcopters
function getInitialPosition(index: number): Vector3 {
  const spacing = 0.2;
  // Arrange quadcopters in a line: [-0.2, 0, 0], [0.2, 0, 0], [-0.4, 0, 0], [0.4, 0, 0], etc.
  const position = Math.floor(index / 2) + 1;
  const side = index % 2 === 0 ? -1 : 1;
  return [side * position * spacing, 0, 0];
}

export function MultiMode() {
  // Loading state for ONNX
  const [isOnnxLoading, setIsOnnxLoading] = useState(true);
  
  // Preload models and ONNX on mount
  useEffect(() => {
    preloadModels();
    
    // Preload ONNX model
    ONNXInference.getInstance()
      .then(() => {
        console.log('ONNX model preloaded successfully');
        setIsOnnxLoading(false);
      })
      .catch(err => {
        console.error('Failed to preload ONNX model:', err);
        setIsOnnxLoading(false);
      });
  }, []);
  
  // Camera and controls
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1.0);
  
  // Multi-quadcopter state
  const [quadcopterCount, setQuadcopterCount] = useState(2);
  const [quadcopters, setQuadcopters] = useState<QuadcopterState[]>([]);
  const [savedInitialStates, setSavedInitialStates] = useState<QuadcopterState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPausedMidSimulation, setIsPausedMidSimulation] = useState(false);
  const pausedFrameRef = useRef(0);
  
  // Initialize quadcopters when count changes
  useEffect(() => {
    const newQuadcopters: QuadcopterState[] = [];
    for (let i = 0; i < quadcopterCount; i++) {
      const position = getInitialPosition(i);
      newQuadcopters.push({
        id: `quad-${i}`,
        position,
        rotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        isPlaying: false,
        trajectory: [],
        currentFrame: 0,
        modelId: 'quad_2'
      });
    }
    setQuadcopters(newQuadcopters);
    
    // Reset playing state when changing count
    setIsPlaying(false);
    setIsPausedMidSimulation(false);
  }, [quadcopterCount]);
  
  // Use multi-simulation hook
  const {
    trajectories,
    isComputing,
    error,
    computeTrajectories,
    reset: resetTrajectories,
  } = useMultiSimulation({
    dt: DT,
    maxSteps: MAX_STEPS,
    maxHeight: MAX_HEIGHT,
    minHeight: MIN_HEIGHT,
  });
  
  // Convert Euler angles to quaternion
  const eulerToQuaternion = (roll: number, pitch: number, yaw: number): Quaternion => {
    const euler = new Euler(pitch, yaw, roll, 'YXZ');
    const threeQuat = new ThreeQuaternion();
    threeQuat.setFromEuler(euler);
    return threeJsQuaternionToPhysics(threeQuat);
  };
  
  // Update individual quadcopter
  const updateQuadcopter = (index: number, updates: Partial<QuadcopterState>) => {
    setQuadcopters(prev => {
      const newQuads = [...prev];
      newQuads[index] = { ...newQuads[index], ...updates };
      return newQuads;
    });
  };
  
  // Handle randomize positions
  const handleRandomize = () => {
    const newQuadcopters = quadcopters.map((quad) => ({
      ...quad,
      position: [
        (Math.random() * 2 - 1),
        (Math.random() * 2 - 1),
        (Math.random() * 2 - 1)
      ] as Vector3,
      rotation: [
        (Math.random() * 2 * Math.PI - Math.PI),
        (Math.random() * 2 * Math.PI - Math.PI),
        (Math.random() * 2 * Math.PI - Math.PI)
      ] as [number, number, number]
    }));
    setQuadcopters(newQuadcopters);
  };
  
  // Handle formation positioning
  const handleFormation = () => {
    const formation = getRandomFormation(quadcopterCount);
    const newQuadcopters = quadcopters.map((quad, index) => {
      const formationData = formation[index];
      if (!formationData) return quad;
      
      // Convert Three.js quaternion to Euler angles for our state
      const euler = new Euler().setFromQuaternion(formationData.orientation);
      
      return {
        ...quad,
        position: [
          formationData.position.x,
          formationData.position.y,
          formationData.position.z
        ] as Vector3,
        rotation: [
          euler.x,
          euler.y,
          euler.z
        ] as [number, number, number],
        velocity: [0, 0, 0] as Vector3,
        angularVelocity: [0, 0, 0] as Vector3
      };
    });
    setQuadcopters(newQuadcopters);
  };
  
  // Handle reset
  const handleReset = () => {
    if (savedInitialStates.length > 0) {
      setQuadcopters(savedInitialStates.map(state => ({
        ...state,
        isPlaying: false,
        trajectory: [],
        currentFrame: 0
      })));
    } else {
      // Reset to default positions
      const newQuadcopters: QuadcopterState[] = [];
      for (let i = 0; i < quadcopterCount; i++) {
        const position = getInitialPosition(i);
        newQuadcopters.push({
          id: `quad-${i}`,
          position,
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
          angularVelocity: [0, 0, 0],
          isPlaying: false,
          trajectory: [],
          currentFrame: 0,
          modelId: 'quad_2'
        });
      }
      setQuadcopters(newQuadcopters);
    }
    
    setIsPlaying(false);
    setIsPausedMidSimulation(false);
    resetTrajectories();
  };
  
  // Handle play/pause
  const handlePlayPause = async () => {
    if (!isPlaying) {
      if (isPausedMidSimulation && trajectories.length > 0) {
        // Resume from pause
        setIsPlaying(true);
        setQuadcopters(prev => prev.map(quad => ({
          ...quad,
          isPlaying: true,
          currentFrame: pausedFrameRef.current
        })));
      } else {
        // Start new simulation
        setSavedInitialStates([...quadcopters]);
        resetTrajectories();
        
        // Prepare initial states for simulation
        const initialStates = quadcopters.map(quad => ({
          position: quad.position,
          velocity: quad.velocity,
          quaternion: eulerToQuaternion(
            quad.rotation[0],
            quad.rotation[1],
            quad.rotation[2]
          ),
          angularVelocity: quad.angularVelocity,
        }));
        
        console.log('Computing trajectories for', quadcopters.length, 'quadcopters');
        await computeTrajectories(initialStates);
        setIsPausedMidSimulation(false);
      }
    } else {
      // Pause
      pausedFrameRef.current = quadcopters[0]?.currentFrame || 0;
      setIsPausedMidSimulation(true);
      setIsPlaying(false);
      setQuadcopters(prev => prev.map(quad => ({
        ...quad,
        isPlaying: false
      })));
    }
  };
  
  // Sync trajectories to quadcopters
  useEffect(() => {
    if (trajectories.length > 0) {
      setQuadcopters(prev => prev.map((quad, index) => ({
        ...quad,
        trajectory: trajectories[index] || [],
        isPlaying: true,
        currentFrame: 0
      })));
      setIsPlaying(true);
    }
  }, [trajectories]);
  
  // Check if any quadcopter is still playing
  useEffect(() => {
    const anyPlaying = quadcopters.some(q => q.isPlaying);
    if (!anyPlaying && isPlaying) {
      setIsPlaying(false);
    }
  }, [quadcopters, isPlaying]);
  
  const boxSize = 2;
  const boxDivisions = 1;
  const boxColor = '#666666';
  const boxHalfSize = boxSize / 2;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [2, 2, 2], fov: 60 }}
        style={{ background: 'radial-gradient(ellipse at center,rgb(10, 38, 69) 0%,rgb(60, 63, 78) 100%)' }}
      >
        {/* Lighting setup */}
        <ambientLight intensity={2.5} />
        
        <group>
          {/* Origin marker */}
          <mesh>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>

          {/* Box boundaries */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} position={[0, -boxHalfSize, 0]} />
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} position={[0, boxHalfSize, 0]} />
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -boxHalfSize]} />
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, boxHalfSize]} />
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[0, 0, Math.PI / 2]} position={[-boxHalfSize, 0, 0]} />
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[0, 0, Math.PI / 2]} position={[boxHalfSize, 0, 0]} />
        </group>
        
        {/* Render all quadcopters and their trails */}
        {quadcopters.map((quad, index) => (
          <React.Fragment key={quad.id}>
            {/* Trail for each quadcopter */}
            {quad.trajectory.length > 0 && (
              <Trail
                trajectory={quad.trajectory}
                currentFrame={quad.currentFrame}
                color={getQuadcopterColor(index)}
                opacity={0.6}
                lineWidth={2}
              />
            )}
            
            {/* Quadcopter */}
            <Quadcopter
              state={quad}
              onUpdate={(updates) => updateQuadcopter(index, updates)}
              isInteractive={!isPlaying}
              simSpeed={simSpeed}
              onDragStart={() => setOrbitEnabled(false)}
              onDragEnd={() => setOrbitEnabled(true)}
            />
          </React.Fragment>
        ))}
        
        <OrbitControls 
          enabled={orbitEnabled}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={10}
          maxPolarAngle={Math.PI * 0.9}
        />
      </Canvas>
      
      {/* Multi Control Panel */}
      <MultiControlPanel
        quadcopterCount={quadcopterCount}
        setQuadcopterCount={setQuadcopterCount}
        isPlaying={isPlaying}
        isComputing={isComputing}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        handlePlayPause={handlePlayPause}
        handleReset={handleReset}
        handleRandomize={handleRandomize}
        handleFormation={handleFormation}
        isPausedMidSimulation={isPausedMidSimulation}
      />
      
      {/* ONNX Loading indicator */}
      {isOnnxLoading && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          Loading AI model...
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'red',
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <h3>Simulation Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}