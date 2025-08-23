import React, { useRef, useEffect } from 'react';
import { Group } from 'three';
import { Vector3, Quaternion } from '@/lib/physics/types';
import { QuadcopterModel } from '../3d/QuadcopterModel';
import { physicsQuaternionToThreeJsSimple } from '@/lib/coordinateTransform';

interface TrajectoryPoint {
  position: Vector3;
  quaternion: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
  action: [number, number, number, number];
  timestamp: number;
}

interface StepTrajectoryProps {
  trajectory: TrajectoryPoint[];
  currentStep: number;
  onStateUpdate: (state: any) => void;
}

export function StepTrajectory({ 
  trajectory,
  currentStep,
  onStateUpdate
}: StepTrajectoryProps) {
  const meshRef = useRef<Group>(null);
  
  useEffect(() => {
    if (!meshRef.current || trajectory.length === 0 || currentStep >= trajectory.length) return;
    
    const point = trajectory[currentStep];
    
    // Update position (convert physics to Three.js coordinates)
    // Physics: [x, y, z] where z is up
    // Three.js: [x, y, z] where y is up
    meshRef.current.position.set(
      point.position[0],
      point.position[2],  // Physics Z -> Three.js Y
      point.position[1]   // Physics Y -> Three.js Z
    );
    
    // Update rotation with coordinate transformation
    const threeQuat = physicsQuaternionToThreeJsSimple(point.quaternion);
    meshRef.current.quaternion.copy(threeQuat);
    
    // Send state data for display
    onStateUpdate({
      step: currentStep,
      timestamp: point.timestamp.toFixed(3),
      position: point.position.map(v => v.toFixed(6)),
      velocity: point.velocity.map(v => v.toFixed(6)),
      quaternion: point.quaternion.map(v => v.toFixed(6)),
      angularVelocity: point.angularVelocity.map(v => v.toFixed(6)),
      action: point.action.map(v => v.toFixed(6))
    });
    
  }, [trajectory, currentStep, onStateUpdate]);
  
  return (
    <group ref={meshRef}>
      <QuadcopterModel scale={0.00001} showDebug={false} />
    </group>
  );
}