import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Box3, Vector3 as ThreeVector3, Mesh } from 'three';

interface QuadcopterModelProps {
  scale?: number | [number, number, number];
  showDebug?: boolean;
}

export function QuadcopterModel({ scale = 0.00001, showDebug = false }: QuadcopterModelProps) {
  const group = useRef<Group>(null);
  const propellerRefs = useRef<Mesh[]>([]);
  
  // Load the GLTF model
  const gltf = useGLTF('/models/quad.glb');
  
  // Find and setup propellers when model loads
  useEffect(() => {
    if (gltf.scene) {
      // Find propellers in the model - look for cylinders that might be propellers
      propellerRefs.current = [];
      
      gltf.scene.traverse((child) => {
        if (child instanceof Mesh) {
          const name = child.name.toLowerCase();
          // Look for propellers, rotors, or specific cylinders
          if (name.includes('propeller') || name.includes('prop') || name.includes('rotor') ||
              name === 'cylinder17' || name === 'cylinder18' || name === 'cylinder19' || name === 'cylinder20' ||
              name === 'object_43' || name === 'object_46' || name === 'object_49' || name === 'object_52') {
            // Don't rotate initially - let's see their default orientation
            child.rotation.set(0, 0, 0);
            propellerRefs.current.push(child);
          }
        }
      });
    }
  }, [gltf]);
  
  // Animate propellers - Y-axis for horizontal spinning (like helicopter blades)
  useFrame((state, delta) => {
    propellerRefs.current.forEach((propeller, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      // Realistic rotation speed (20 rad/s) around Y-axis (vertical) for horizontal spin
      propeller.rotation.y += delta * 20 * direction;
    });
  });
  
  const scaleArray = Array.isArray(scale) ? scale : [scale, scale, scale];
  
  return (
    <group ref={group}>
      {/* The actual 3D model - rotated 180 degrees on yaw (Y-axis) */}
      <primitive 
        object={gltf.scene} 
        scale={scaleArray}
        rotation={[0, 0, 0]}
      />
      
      {/* Debug indicators */}
      {showDebug && (
        <>
          {/* Debug: Add a visible box to see where the model should be */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="yellow" wireframe />
          </mesh>
          
          {/* Direction indicator (front) - Red */}
          <mesh position={[0.15, 0, 0]}>
            <coneGeometry args={[0.02, 0.05, 4]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/quad.glb');