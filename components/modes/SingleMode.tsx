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
import { ControlPanel } from '@/components/ui/ControlPanel';

// Hooks and utilities
import { usePrecomputedSimulation } from '@/hooks/usePrecomputedSimulation';
import { threeJsQuaternionToPhysics } from '@/lib/coordinateTransform';

// Types
import type { Vector3, Quaternion } from '@/lib/types';
import type { QuadcopterState, TrajectoryPoint } from '@/lib/types/quadcopter';

// Constants
const DT = 0.04;
const MAX_STEPS = 125;
const MAX_HEIGHT = 1.0;
const MIN_HEIGHT = -1.0;
const MANUAL_THROTTLE = 0.0;

export function SingleMode() {
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
        setIsOnnxLoading(false); // Still allow app to work
      });
  }, []);
  
  // Camera and controls
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [currentAction, setCurrentAction] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  
  // Quadcopter state management
  const [quadcopter, setQuadcopter] = useState<QuadcopterState>({
    id: 'quad-1',
    position: [0, 0, 0],
    rotation: [0, 0, 0], // [roll, pitch, yaw] in radians
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
    isPlaying: false,
    trajectory: [],
    currentFrame: 0,
    modelId: 'quad_2'
  });
  
  // Store the last user-set initial position (before simulation)
  const [savedInitialState, setSavedInitialState] = useState<{
    position: Vector3;
    rotation: [number, number, number];
    velocity: Vector3;
    angularVelocity: Vector3;
  }>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0]
  });
  
  // Track if we're paused mid-simulation
  const [isPausedMidSimulation, setIsPausedMidSimulation] = useState(false);
  const pausedFrameRef = useRef(0);
  
  // Helper to update quadcopter state
  const updateQuadcopter = (updates: Partial<QuadcopterState>) => {
    setQuadcopter(prev => ({ ...prev, ...updates }));
  };
  
  // Use precomputed simulation hook
  const {
    trajectory,
    isComputing,
    error,
    computeTrajectory,
    reset: resetTrajectory,
  } = usePrecomputedSimulation({
    dt: DT,
    maxSteps: MAX_STEPS,
    maxHeight: MAX_HEIGHT,
    minHeight: MIN_HEIGHT,
  });

  // Convert Euler angles (in radians) to quaternion for physics simulation
  const eulerToQuaternion = (roll: number, pitch: number, yaw: number): Quaternion => {
    // Create Three.js Euler angles and quaternion with YXZ order for proper aviation controls
    const euler = new Euler(pitch, yaw, roll, 'YXZ');
    const threeQuat = new ThreeQuaternion();
    threeQuat.setFromEuler(euler);
    
    // Convert Three.js quaternion to physics quaternion
    return threeJsQuaternionToPhysics(threeQuat);
  };

  // Get current initial state based on quadcopter state
  const getCurrentInitialState = () => ({
    position: quadcopter.position,
    velocity: quadcopter.velocity,
    quaternion: eulerToQuaternion(
      quadcopter.rotation[0], 
      quadcopter.rotation[1], 
      quadcopter.rotation[2]
    ),
    angularVelocity: quadcopter.angularVelocity,
  });

  const handleReset = () => {
    // Reset quadcopter to last saved initial position
    updateQuadcopter({
      position: savedInitialState.position,
      rotation: savedInitialState.rotation,
      velocity: savedInitialState.velocity,
      angularVelocity: savedInitialState.angularVelocity,
      isPlaying: false,
      trajectory: [],
      currentFrame: 0
    });


    
    resetTrajectory();
    setCurrentAction([0, 0, 0, 0]);
    setIsPausedMidSimulation(false);
  };
  
  const handleZeroPosition = () => {
    // Set quadcopter to origin with zero orientation
    updateQuadcopter({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      velocity: [0, 0, 0],
      angularVelocity: [0, 0, 0],
      isPlaying: false,
      trajectory: [],
      currentFrame: 0
    });
    
    resetTrajectory();
    setCurrentAction([0, 0, 0, 0]);
    setIsPausedMidSimulation(false);
  };

  const handlePlayPause = async () => {
    if (!quadcopter.isPlaying) {
      // Check if we're resuming from a pause
      if (isPausedMidSimulation && quadcopter.trajectory.length > 0) {
        // Resume from paused frame
        updateQuadcopter({ 
          isPlaying: true,
          currentFrame: pausedFrameRef.current
        });
      } else {
        // Starting fresh - save current state as initial state
        setSavedInitialState({
          position: [...quadcopter.position],
          rotation: [...quadcopter.rotation],
          velocity: [...quadcopter.velocity],
          angularVelocity: [...quadcopter.angularVelocity]
        });
        
        // Always compute new trajectory from current values when playing
        resetTrajectory();
        
        const newInitialState = getCurrentInitialState();
        console.log('Computing trajectory from current initial values:', newInitialState);
        
        // Compute trajectory with AI control
        await computeTrajectory(newInitialState, true, MANUAL_THROTTLE);
        
        // Note: trajectory will be set via useEffect below
        setIsPausedMidSimulation(false);
      }
    } else {
      // Pause - save current frame for resume
      pausedFrameRef.current = quadcopter.currentFrame;
      setIsPausedMidSimulation(true);
      updateQuadcopter({ isPlaying: false });
      setCurrentAction([0, 0, 0, 0]);
    }
  };
  
  // Sync trajectory from hook to quadcopter state
  useEffect(() => {
    if (trajectory.length > 0) {
      updateQuadcopter({ 
        trajectory: trajectory as TrajectoryPoint[], 
        isPlaying: true,
        currentFrame: 0
      });
    }
  }, [trajectory]);
  
  // Update action display based on current frame
  useEffect(() => {
    if (quadcopter.isPlaying && quadcopter.trajectory.length > 0) {
      const currentPoint = quadcopter.trajectory[quadcopter.currentFrame];
      if (currentPoint?.action) {
        setCurrentAction(currentPoint.action);
      }
    }
  }, [quadcopter.currentFrame, quadcopter.isPlaying]);
  
  // Log errors
  useEffect(() => {
    if (error) {
      console.error('Simulation error:', error);
    }
  }, [error]);

  const boxSize = 2; // The total width, height, and depth of the box
  const boxDivisions = 1; // The number of grid lines on each face
  const boxColor = '#666666'; // The color of the grid lines
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
          {/* A small red sphere to clearly mark the origin point (0,0,0) */}
          <mesh>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>

          {/* Floor Grid (bottom face) */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} position={[0, -boxHalfSize, 0]} />

          {/* Ceiling Grid (top face) */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} position={[0, boxHalfSize, 0]} />

          {/* Back Wall Grid */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -boxHalfSize]} />

          {/* Front Wall Grid */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, boxHalfSize]} />

          {/* Left Wall Grid */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[0, 0, Math.PI / 2]} position={[-boxHalfSize, 0, 0]} />

          {/* Right Wall Grid */}
          <gridHelper args={[boxSize, boxDivisions, boxColor, boxColor]} rotation={[0, 0, Math.PI / 2]} position={[boxHalfSize, 0, 0]} />
        </group>
        
        {/* Trail visualization */}
        {quadcopter.trajectory.length > 0 && (
          <Trail
            trajectory={quadcopter.trajectory}
            currentFrame={quadcopter.currentFrame}
            color="#00ff88"
            opacity={0.6}
            lineWidth={2}
          />
        )}
        
        {/* Unified Quadcopter component */}
        <Quadcopter
          state={quadcopter}
          onUpdate={updateQuadcopter}
          isInteractive={!quadcopter.isPlaying}
          simSpeed={simSpeed}
          onDragStart={() => setOrbitEnabled(false)}
          onDragEnd={() => setOrbitEnabled(true)}
        />
        
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
      
      {/* Control Panel */}
      <ControlPanel
        // Position (convert from physics to display)
        initialX={quadcopter.position[0]}
        initialY={quadcopter.position[1]}
        initialZ={quadcopter.position[2]}
        setInitialX={(x) => updateQuadcopter({ position: [x, quadcopter.position[1], quadcopter.position[2]] })}
        setInitialY={(y) => updateQuadcopter({ position: [quadcopter.position[0], y, quadcopter.position[2]] })}
        setInitialZ={(z) => updateQuadcopter({ position: [quadcopter.position[0], quadcopter.position[1], z] })}
        
        // Orientation (convert radians to degrees for display)
        initialRoll={quadcopter.rotation[0] * 180 / Math.PI}
        initialPitch={quadcopter.rotation[1] * 180 / Math.PI}
        initialYaw={quadcopter.rotation[2] * 180 / Math.PI}
        setInitialRoll={(r) => updateQuadcopter({ rotation: [r * Math.PI / 180, quadcopter.rotation[1], quadcopter.rotation[2]] })}
        setInitialPitch={(p) => updateQuadcopter({ rotation: [quadcopter.rotation[0], p * Math.PI / 180, quadcopter.rotation[2]] })}
        setInitialYaw={(y) => updateQuadcopter({ rotation: [quadcopter.rotation[0], quadcopter.rotation[1], y * Math.PI / 180] })}
        
        // Simulation
        isPlaying={quadcopter.isPlaying}
        isComputing={isComputing}
        trajectory={quadcopter.trajectory}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        
        // Actions
        handlePlayPause={handlePlayPause}
        handleReset={handleReset}
        handleZeroPosition={handleZeroPosition}
        currentAction={currentAction}
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