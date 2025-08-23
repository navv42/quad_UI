import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Box3, Vector3 as ThreeVector3, Mesh } from 'three';
import { useModelConfig, loadConfig } from '@/hooks/useModelConfig';
import * as THREE from 'three';


interface QuadcopterModelProps {
  modelId?: string;
  showDebug?: boolean;
}

export function QuadcopterModel({ modelId, showDebug = false }: QuadcopterModelProps) {
  const { getModelConfig, currentModel } = useModelConfig();
  // Use the passed modelId, or fall back to currentModel from config
  const effectiveModelId = modelId || currentModel;
  const modelConfig = getModelConfig(effectiveModelId);
  
  // Use config values or defaults
  const MODEL_PATH = modelConfig?.path || '/models/quad.glb';
  const scale = modelConfig?.scale || 1.0;
  const rotation = modelConfig?.rotation || [0, 0, 0];
  const centerOffset = modelConfig?.centerOffset || [0, 0, 0];
  
  const group = useRef<Group>(null);
  const propellerRefs = useRef<Mesh[]>([]);
  const isCentered = useRef(false);
  
  
  // Load the GLTF model
  const gltf = useGLTF(MODEL_PATH);
  
  // Debug: Log model info when loaded
  useEffect(() => {
    if (gltf) {
      // console.log('=== GLB MODEL LOADED ===');
      // console.log('Scene:', gltf.scene);
      // console.log('Animations:', gltf.animations);
      // console.log('Cameras:', gltf.cameras);
      // console.log('Asset info:', gltf.asset);
      
      // Calculate bounding box to understand model size
      const box = new Box3().setFromObject(gltf.scene);
      const size = box.getSize(new ThreeVector3());
      const center = box.getCenter(new ThreeVector3());
      
      // console.log('Model dimensions:', {
      //   width: size.x,
      //   height: size.y,
      //   depth: size.z,
      //   center: [center.x, center.y, center.z]
      // });
      
      // Count meshes and materials
      let meshCount = 0;
      let vertexCount = 0;
      const materials = new Set();
      
      gltf.scene.traverse((child) => {
        if (child instanceof Mesh) {
          meshCount++;
          if (child.geometry.attributes.position) {
            vertexCount += child.geometry.attributes.position.count;
          }
          if (child.material) {
            materials.add(child.material);
          }
        }
      });
      
      // console.log('Model stats:', {
      //   meshes: meshCount,
      //   vertices: vertexCount,
      //   materials: materials.size,
      //   scale: scale
      // });
      
      // Check if model might be too small/large
      const scaledSize = {
        width: size.x * (Array.isArray(scale) ? scale[0] : scale),
        height: size.y * (Array.isArray(scale) ? scale[1] : scale),
        depth: size.z * (Array.isArray(scale) ? scale[2] : scale)
      };
      
      // console.log('Scaled model size:', scaledSize);
      
    }
  }, [gltf, scale]);

  // Find and setup propellers when model loads
  useEffect(() => {
    // Only search for propellers if we haven't already found them
    if (gltf.scene && modelConfig && propellerRefs.current.length === 0) {
      console.log('=== TRAVERSING MODEL FOR PROPELLERS ===');
      // Find propellers in the model - look for cylinders that might be propellers
      propellerRefs.current = [];
      
      let objectCount = 0;
      gltf.scene.traverse((child) => {
        objectCount++;
        if (child instanceof Mesh) {
          const name = child.name.toLowerCase();
          // Look for propellers based on model config
          const propellerNames = modelConfig?.propellers || [];
          if (propellerNames.includes(name)) {

            propellerRefs.current.push(child);

          }
        }
      });
      
      console.log(`Traversed ${objectCount} objects in the model`);
      console.log(`Found ${propellerRefs.current.length} propellers`);
    }
  }, [gltf.scene, modelConfig]); // Use gltf.scene instead of gltf to be more specific
  
  // Animate propellers - Y-axis for horizontal spinning (like helicopter blades)
  useFrame((state, delta) => {
    propellerRefs.current.forEach((propeller, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      // Realistic rotation speed (20 rad/s) around Y-axis (vertical) for horizontal spin
      propeller.rotation.z += delta * 30 * direction;
    });
  });
  
  const scaleArray = Array.isArray(scale) ? scale : [scale, scale, scale];
  
  return (
    <group ref={group}>
      {/* The actual 3D model */}
      <primitive 
        object={gltf.scene} 
        scale={scaleArray}
        rotation={rotation}
        position={centerOffset}
      />
      

      
      {/* Always show a debug box to verify model position */}
      {/* <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="magenta" wireframe opacity={0.5} transparent />
      </mesh> */}
      
      {/* Debug indicators */}
      {showDebug && (
        <>
          {/* Debug: Add a visible box to see where the model should be */}
          {/* <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="yellow" wireframe />
          </mesh> */}
          
          {/* Direction indicator (front) - Red */}
          {/* <mesh position={[0.15, 0, 0]}>
            <coneGeometry args={[0.02, 0.05, 4]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh> */}
        </>
      )}
    </group>
  );
}

// Preload all models from config to avoid re-loading
export function preloadModels() {
  // This will be called once at app startup
  loadConfig().then(config => {
    if (config) {
      Object.values(config.models).forEach(model => {
        useGLTF.preload(model.path);
      });
    }
  });
}