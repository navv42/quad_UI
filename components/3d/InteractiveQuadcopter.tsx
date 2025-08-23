import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { Vector3 as ThreeVector3, Euler, Group, Mesh, Raycaster, Plane, Vector2, Matrix4 } from 'three';
import { QuadcopterModel } from './QuadcopterModel';

interface InteractiveQuadcopterProps {
  position: [number, number, number];
  rotation: [number, number, number];
  onPositionChange: (position: [number, number, number]) => void;
  onRotationChange: (rotation: [number, number, number]) => void;
  isPlaying: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}


function PrimitiveQuadcopter() {
  function Propeller({ index }: { index: number }) {
    const meshRef = useRef<any>(null);
    
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
      <mesh>
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.05]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.05]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      
      {[
        [0.25, 0.05, 0],
        [-0.25, 0.05, 0],
        [0, 0.05, 0.25],
        [0, 0.05, -0.25],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 8]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
          <Propeller index={i} />
        </group>
      ))}
      
      <mesh position={[0.2, 0, 0]}>
        <coneGeometry args={[0.02, 0.05, 4]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
    </>
  );
}

export function InteractiveQuadcopter({
  position,
  rotation,
  onPositionChange,
  onRotationChange,
  isPlaying,
  onDragStart,
  onDragEnd
}: InteractiveQuadcopterProps) {
  const groupRef = useRef<Group>(null);
  const { camera, gl, size } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragMode, setDragMode] = useState<'translate' | 'rotate'>('translate');
  
  // Set proper Euler order for aviation controls (Yaw-Pitch-Roll)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.order = 'YXZ';
    }
  }, []);
  
  // Prevent context menu on right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    gl.domElement.addEventListener('contextmenu', handleContextMenu);
    return () => {
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl]);
  
  // Create a plane for dragging
  const dragPlane = useRef(new Plane(new ThreeVector3(0, 1, 0), 0));
  const raycaster = useRef(new Raycaster());
  const intersection = useRef(new ThreeVector3());
  const offset = useRef(new ThreeVector3());
  const startRotation = useRef(new Euler());
  
  const handlePointerDown = (event: any) => {
    if (isPlaying) return;
    
    event.stopPropagation();
    setIsDragging(true);
    
    // Determine mode based on mouse button (0 = left, 2 = right)
    const mode = event.button === 2 ? 'rotate' : 'translate';
    setDragMode(mode);
    
    onDragStart?.();
    
    if (mode === 'translate' && groupRef.current) {
      // Set up the drag plane based on camera orientation
      const cameraDirection = new ThreeVector3();
      camera.getWorldDirection(cameraDirection);
      
      // Use a plane perpendicular to camera for better dragging
      dragPlane.current.setFromNormalAndCoplanarPoint(
        cameraDirection,
        groupRef.current.position
      );
      
      // Calculate initial offset
      const mouse = new Vector2(
        (event.clientX / size.width) * 2 - 1,
        -(event.clientY / size.height) * 2 + 1
      );
      
      raycaster.current.setFromCamera(mouse, camera);
      
      if (raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
        offset.current.copy(intersection.current).sub(groupRef.current.position);
      }
    } else if (mode === 'rotate' && groupRef.current) {
      startRotation.current.copy(groupRef.current.rotation);
    }
    
    // Capture pointer for smooth dragging
    gl.domElement.setPointerCapture(event.pointerId);
  };
  
  const handlePointerMove = (event: any) => {
    if (!isDragging || !groupRef.current || isPlaying) return;
    
    const mouse = new Vector2(
      (event.clientX / size.width) * 2 - 1,
      -(event.clientY / size.height) * 2 + 1
    );
    
    if (dragMode === 'translate') {
      raycaster.current.setFromCamera(mouse, camera);
      
      if (raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
        const newPos = intersection.current.sub(offset.current);
        
        // Clamp position to bounds
        const clampedX = Math.max(-1, Math.min(1, newPos.x));
        const clampedY = Math.max(-1, Math.min(1, newPos.y));
        const clampedZ = Math.max(-1, Math.min(1, newPos.z));
        
        groupRef.current.position.set(clampedX, clampedY, clampedZ);
        onPositionChange([clampedX, clampedY, clampedZ]);
      }
    } else if (dragMode === 'rotate') {
      // Rotate based on mouse movement
      const rotationSpeed = 0.01;
      const deltaX = event.movementX * rotationSpeed;
      const deltaY = event.movementY * rotationSpeed;
      
      // Apply rotations in a way that feels natural:
      // Horizontal mouse movement rotates around Y axis (yaw)
      // Vertical mouse movement rotates around X axis (pitch)
      // We can also add some roll based on diagonal movement
      groupRef.current.rotation.y += deltaX;  // Yaw from horizontal movement
      groupRef.current.rotation.x += deltaY;  // Pitch from vertical movement
      
      // Add roll based on diagonal movement (optional, but makes it possible to control)
      // This creates a subtle roll when moving diagonally
      groupRef.current.rotation.z += (deltaX * deltaY) * 0.5;
      
      // Send rotation in Three.js Euler order [x, y, z]
      onRotationChange([
        groupRef.current.rotation.x,
        groupRef.current.rotation.y,
        groupRef.current.rotation.z
      ]);
    }
  };
  
  const handlePointerUp = (event: any) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    onDragEnd?.();
    
    // Release pointer capture
    gl.domElement.releasePointerCapture(event.pointerId);
  };
  
  // Set up global pointer move and up handlers
  useEffect(() => {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      handlePointerMove(event);
    };
    
    const handleGlobalPointerUp = (event: PointerEvent) => {
      handlePointerUp(event);
    };
    
    if (isDragging) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      
      return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [isDragging, dragMode]);
  
  // Update cursor based on hover
  useEffect(() => {
    if (isHovered && !isPlaying) {
      gl.domElement.style.cursor = 'move';
    } else {
      gl.domElement.style.cursor = 'auto';
    }
    
    return () => {
      gl.domElement.style.cursor = 'auto';
    };
  }, [isHovered, isPlaying, gl]);
  
  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]} // Will use YXZ order
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* <Suspense fallback={<PrimitiveQuadcopter />}> */}
      <QuadcopterModel showDebug={false} />
      {/* </Suspense> */}
      
      {/* Invisible larger hitbox for easier selection */}
      <mesh visible={false}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      </mesh>
    </group>
  );
}