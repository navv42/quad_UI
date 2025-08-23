import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 as ThreeVector3, Quaternion as ThreeQuaternion, Mesh, Group } from 'three';
import type { Vector3, Quaternion } from '@/lib/physics/types';
import { QuadcopterModel } from '../3d/QuadcopterModel';
import { physicsQuaternionToThreeJsSimple } from '@/lib/coordinateTransform';

// Fallback primitive geometry quadcopter
function PrimitiveQuadcopter() {
  // Spinning propeller component
  function Propeller({ index }: { index: number }) {
    const meshRef = useRef<Mesh>(null);
    
    useFrame((state, delta) => {
      if (meshRef.current) {
        const direction = index % 2 === 0 ? 1 : -1;
        meshRef.current.rotation.y += delta * 30 * direction;
      }
    });
    
    return (
      <mesh ref={meshRef} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.002, 16]} />
        <meshStandardMaterial color="#00ff00" opacity={0.3} transparent />
        <mesh>
          <boxGeometry args={[0.25, 0.001, 0.02]} />
          <meshStandardMaterial color="#00ff00" opacity={0.6} transparent />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.25, 0.001, 0.02]} />
          <meshStandardMaterial color="#00ff00" opacity={0.6} transparent />
        </mesh>
      </mesh>
    );
  }
  
  return (
    <>
      {/* Main body */}
      <mesh>
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Arms */}
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.05]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.05]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      
      {/* Motors/Rotors */}
      {[
        [0.25, 0.05, 0],    // Front
        [-0.25, 0.05, 0],   // Back
        [0, 0.05, 0.25],    // Right
        [0, 0.05, -0.25],   // Left
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 8]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
          <Propeller index={i} />
        </group>
      ))}
      
      {/* Direction indicator (front) */}
      <mesh position={[0.2, 0, 0]}>
        <coneGeometry args={[0.02, 0.05, 4]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
    </>
  );
}

interface TrajectoryPoint {
  position: Vector3;
  quaternion: Quaternion;
  action: [number, number, number, number];
  timestamp: number;
}

interface PrecomputedTrajectoryProps {
  isPlaying: boolean;
  trajectory: TrajectoryPoint[];
  simSpeed: number;
  onComplete: () => void;
  onActionUpdate?: (action: [number, number, number, number]) => void;
}

export function PrecomputedTrajectory({ 
  isPlaying,
  trajectory,
  simSpeed,
  onComplete,
  onActionUpdate
}: PrecomputedTrajectoryProps) {
  const meshRef = useRef<Group>(null);
  const timeRef = useRef(0);
  
  // Set proper Euler order for aviation controls
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.order = 'YXZ';
    }
  }, []);
  
  // Three.js objects for interpolation
  const prevPosRef = useRef(new ThreeVector3());
  const currPosRef = useRef(new ThreeVector3());
  const prevQuatRef = useRef(new ThreeQuaternion());
  const currQuatRef = useRef(new ThreeQuaternion());
  
  // Reset when trajectory changes
  useEffect(() => {
    timeRef.current = 0;
  }, [trajectory]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!isPlaying || !meshRef.current || trajectory.length < 2) return;
    
    // Update time
    timeRef.current += delta * simSpeed;
    
    // Find current segment
    let segmentIndex = 0;
    for (let i = 0; i < trajectory.length - 1; i++) {
      if (timeRef.current >= trajectory[i].timestamp && 
          timeRef.current < trajectory[i + 1].timestamp) {
        segmentIndex = i;
        break;
      }
    }
    
    // Check if we've reached the end
    if (timeRef.current >= trajectory[trajectory.length - 1].timestamp) {
      onComplete();
      return;
    }
    
    
    // Get segment points
    const prev = trajectory[segmentIndex];
    const next = trajectory[segmentIndex + 1];
    
    // Calculate alpha for this segment
    const segmentDuration = next.timestamp - prev.timestamp;
    const segmentTime = timeRef.current - prev.timestamp;
    const alpha = Math.min(1, Math.max(0, segmentTime / segmentDuration));
    
    // Update action display with interpolated values
    if (onActionUpdate && prev.action && next.action) {
      // Interpolate between actions for smooth display
      const interpolatedAction: [number, number, number, number] = [
        prev.action[0] + (next.action[0] - prev.action[0]) * alpha,
        prev.action[1] + (next.action[1] - prev.action[1]) * alpha,
        prev.action[2] + (next.action[2] - prev.action[2]) * alpha,
        prev.action[3] + (next.action[3] - prev.action[3]) * alpha,
      ];
      onActionUpdate(interpolatedAction);
    }
    
    // Update positions (convert physics to Three.js coordinates)
    prevPosRef.current.set(
      prev.position[0],
      prev.position[2],  // Physics Z -> Three.js Y
      prev.position[1]   // Physics Y -> Three.js Z
    );
    
    currPosRef.current.set(
      next.position[0],
      next.position[2],  // Physics Z -> Three.js Y
      next.position[1]   // Physics Y -> Three.js Z
    );
    
    // Linear interpolation for position
    meshRef.current.position.lerpVectors(prevPosRef.current, currPosRef.current, alpha);
    
    // Update quaternions with coordinate transformation
    prevQuatRef.current = physicsQuaternionToThreeJsSimple(prev.quaternion);
    currQuatRef.current = physicsQuaternionToThreeJsSimple(next.quaternion);
    
    // Spherical linear interpolation for rotation
    meshRef.current.quaternion.slerpQuaternions(prevQuatRef.current, currQuatRef.current, alpha);
    
  });
  
  return (
    <group ref={meshRef}>
      {/* Use GLB model with Suspense for loading */}
      <Suspense fallback={<PrimitiveQuadcopter />}>
        <QuadcopterModel showDebug={false} />
      </Suspense>
    </group>
  );
}