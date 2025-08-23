'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Quaternion as ThreeQuaternion, Euler } from 'three';

// Components
import { PrecomputedTrajectory } from '@/components/simulation/PrecomputedTrajectory';
import { StepTrajectory } from '@/components/simulation/StepTrajectory';
import { InteractiveQuadcopter } from '@/components/3d/InteractiveQuadcopter';
import { Axes } from '@/components/3d/Axes';
import { ControlPanel } from '@/components/ui/ControlPanel';

// Hooks and utilities
import { usePrecomputedSimulation } from '@/hooks/usePrecomputedSimulation';
import { threeJsQuaternionToPhysics } from '@/lib/coordinateTransform';

// Types
import type { Vector3, Quaternion } from '@/lib/types';

// Constants
const DT = 0.04;
const MAX_STEPS = 500;
const MAX_HEIGHT = 1.0;
const MIN_HEIGHT = -1.0;
const MANUAL_THROTTLE = 0.0;

// Helper function to normalize angle to [-180, 180] range
function normalizeAngle(degrees: number): number {
  // First, normalize to [0, 360)
  let normalized = degrees % 360;
  
  // Convert to [-180, 180]
  if (normalized > 180) {
    normalized -= 360;
  } else if (normalized < -180) {
    normalized += 360;
  }
  
  return normalized;
}

export default function Home() {
  // Camera and controls
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [controlMode, setControlMode] = useState<'translate' | 'rotate'>('translate');
  
  // Simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPositionChanged, setHasPositionChanged] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [currentAction, setCurrentAction] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  
  // Step mode
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentState, setCurrentState] = useState<any>(null);
  
  // Initial position controls (Three.js coordinates)
  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);
  const [initialZ, setInitialZ] = useState(0);
  
  // Initial orientation controls (in degrees for UI)
  const [initialRoll, setInitialRoll] = useState(0);
  const [initialPitch, setInitialPitch] = useState(0);
  const [initialYaw, setInitialYaw] = useState(0);
  
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

  // Convert Euler angles (in degrees) to quaternion for physics simulation
  const eulerToQuaternion = (rollDeg: number, pitchDeg: number, yawDeg: number): Quaternion => {
    // Convert degrees to radians with correct mapping for Three.js
    const pitch = pitchDeg * Math.PI / 180;  // X axis rotation
    const yaw = yawDeg * Math.PI / 180;      // Y axis rotation  
    const roll = rollDeg * Math.PI / 180;    // Z axis rotation
    
    // Create Three.js Euler angles and quaternion
    const euler = new Euler(pitch, yaw, roll, 'XYZ');
    const threeQuat = new ThreeQuaternion();
    threeQuat.setFromEuler(euler);
    
    // Convert Three.js quaternion to physics quaternion
    return threeJsQuaternionToPhysics(threeQuat);
  };

  // Get current initial state based on input values
  const getCurrentInitialState = () => ({
    position: [initialX, initialY, initialZ] as Vector3,
    velocity: [0, 0, 0] as Vector3,
    quaternion: eulerToQuaternion(initialRoll, initialPitch, initialYaw),
    angularVelocity: [0, 0, 0] as Vector3,
  });

  const handleReset = async () => {
    console.log('=== RESET CALLED ===');
    console.log('Previous trajectory length:', trajectory.length);
    setIsPlaying(false);
    resetTrajectory();
    
    const newInitialState = getCurrentInitialState();
    console.log('Computing trajectory with initial state:', newInitialState);
    
    // Always use AI control
    await computeTrajectory(newInitialState, true, MANUAL_THROTTLE);
    console.log('New trajectory computed, length:', trajectory.length);
  };

  const handlePlayPause = async () => {
    console.log('=== PLAY/PAUSE CALLED ===');
    console.log('isPlaying:', isPlaying, 'hasPositionChanged:', hasPositionChanged, 'trajectory.length:', trajectory.length);
    
    if (!isPlaying) {
      // If position has changed or no trajectory exists, compute new trajectory
      if (hasPositionChanged || trajectory.length === 0) {
        console.log('Position changed or no trajectory, calling handleReset...');
        await handleReset();
        setHasPositionChanged(false);
        console.log('After reset, trajectory.length:', trajectory.length);
      }
      console.log('Setting isPlaying to true');
      setIsPlaying(true);
    } else {
      console.log('Pausing simulation');
      setIsPlaying(false);
      setCurrentAction([0, 0, 0, 0]);
    }
  };
  
  const handleSimulationComplete = () => {
    console.log('Simulation completed');
    setIsPlaying(false);
    setCurrentAction([0, 0, 0, 0]);
  };
  
  const handleActionUpdate = (action: [number, number, number, number]) => {
    setCurrentAction(action);
  };
  
  // Step mode controls
  const handleNextStep = () => {
    if (currentStep < trajectory.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Reset step when trajectory changes
  useEffect(() => {
    setCurrentStep(0);
  }, [trajectory]);
  
  // Log errors
  useEffect(() => {
    if (error) {
      console.error('Simulation error:', error);
    }
  }, [error]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [3, 3, 3], fov: 60 }}
        style={{ background: 'radial-gradient(ellipse at center, #1b2735 0%, #090a0f 100%)' }}
        shadows
      >
        {/* Lighting setup */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 15, 10]} 
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.4} />
        
        {/* Ground plane with grid */}
        <gridHelper args={[4, 8, '#444444', '#222222']} rotation={[0, 0, 0]} />
        
        <Axes />
        
        {/* Show different modes: step mode, playing, or interactive */}
        {stepMode && trajectory.length > 0 ? (
          <StepTrajectory
            trajectory={trajectory}
            currentStep={currentStep}
            onStateUpdate={setCurrentState}
          />
        ) : trajectory.length > 0 && isPlaying ? (
          <PrecomputedTrajectory
            isPlaying={isPlaying}
            trajectory={trajectory}
            simSpeed={simSpeed}
            onComplete={handleSimulationComplete}
            onActionUpdate={handleActionUpdate}
          />
        ) : (
          <InteractiveQuadcopter
            position={[initialX, initialZ, initialY]}  // Three.js: [x, y, z] where y is up
            rotation={[
              initialPitch * Math.PI / 180,  // Three.js X rotation = pitch
              initialYaw * Math.PI / 180,     // Three.js Y rotation = yaw
              initialRoll * Math.PI / 180     // Three.js Z rotation = roll
            ]}
            onPositionChange={(pos) => {
              setInitialX(pos[0]);     // X stays X
              setInitialY(pos[2]);     // Three.js Z -> our Y 
              setInitialZ(pos[1]);     // Three.js Y -> our Z (vertical)
              setHasPositionChanged(true);
            }}
            onRotationChange={(rot) => {
              // Three.js Euler angles [x, y, z] map to [pitch, yaw, roll] in aviation
              // Normalize angles to [-180, 180] range
              setInitialPitch(normalizeAngle(rot[0] * 180 / Math.PI));  // X rotation = pitch
              setInitialYaw(normalizeAngle(rot[1] * 180 / Math.PI));    // Y rotation = yaw  
              setInitialRoll(normalizeAngle(rot[2] * 180 / Math.PI));   // Z rotation = roll
              setHasPositionChanged(true);
            }}
            isPlaying={isPlaying}
            controlMode={controlMode}
            onDragStart={() => setOrbitEnabled(false)}
            onDragEnd={() => setOrbitEnabled(true)}
          />
        )}
        
        {/* Show loading indicator */}
        {isComputing && (
          <group position={[0, 2, 0]}>
            <mesh>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshBasicMaterial color="yellow" />
            </mesh>
          </group>
        )}
        
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
        // Position
        initialX={initialX}
        initialY={initialY}
        initialZ={initialZ}
        setInitialX={setInitialX}
        setInitialY={setInitialY}
        setInitialZ={setInitialZ}
        
        // Orientation
        initialRoll={initialRoll}
        initialPitch={initialPitch}
        initialYaw={initialYaw}
        setInitialRoll={setInitialRoll}
        setInitialPitch={setInitialPitch}
        setInitialYaw={setInitialYaw}
        
        // Simulation
        isPlaying={isPlaying}
        isComputing={isComputing}
        trajectory={trajectory}
        stepMode={stepMode}
        setStepMode={setStepMode}
        currentStep={currentStep}
        controlMode={controlMode}
        setControlMode={setControlMode}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        
        // Actions
        handlePlayPause={handlePlayPause}
        handleReset={handleReset}
        handlePrevStep={handlePrevStep}
        handleNextStep={handleNextStep}
        
        // Display
        currentState={currentState}
        currentAction={currentAction}
      />
      
      {/* Help text when no trajectory */}
      {stepMode && trajectory.length === 0 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '10px 20px',
          borderRadius: '5px',
          fontSize: '14px',
        }}>
          Click 'Play' first to compute trajectory, then use step controls
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