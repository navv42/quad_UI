import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { 
  Vector3 as ThreeVector3, 
  Quaternion as ThreeQuaternion, 
  Euler, 
  Group, 
  Raycaster, 
  Plane, 
  Vector2 
} from 'three';
import { QuadcopterModel } from './QuadcopterModel';
import { physicsQuaternionToThreeJsSimple } from '@/lib/coordinateTransform';
import type { QuadcopterProps } from '@/lib/types/quadcopter';

/**
 * Unified Quadcopter component that handles both interactive and playback modes
 */
export function Quadcopter({
  state,
  onUpdate,
  isInteractive,
  simSpeed,
  onDragStart,
  onDragEnd
}: QuadcopterProps) {
  const groupRef = useRef<Group>(null);
  const { camera, gl, size } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragMode, setDragMode] = useState<'translate' | 'rotate'>('translate');
  
  // Animation state for trajectory playback
  const timeRef = useRef(0);
  const prevPosRef = useRef(new ThreeVector3());
  const currPosRef = useRef(new ThreeVector3());
  const prevQuatRef = useRef(new ThreeQuaternion());
  const currQuatRef = useRef(new ThreeQuaternion());
  const wasPlayingRef = useRef(false);
  
  // Drag interaction refs
  const dragPlane = useRef(new Plane(new ThreeVector3(0, 1, 0), 0));
  const raycaster = useRef(new Raycaster());
  const intersection = useRef(new ThreeVector3());
  const offset = useRef(new ThreeVector3());
  const startRotation = useRef(new Euler());
  
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
  
  // Convert physics coordinates to Three.js coordinates
  const physicsToThreePosition = (pos: [number, number, number]): [number, number, number] => {
    return [pos[0], pos[2], pos[1]]; // [x, z, y] in Three.js
  };
  
  // Convert Three.js coordinates to physics coordinates
  const threeToPhysicsPosition = (pos: [number, number, number]): [number, number, number] => {
    return [pos[0], pos[2], pos[1]]; // [x, y, z] in physics
  };
  
  // Handle pointer down for dragging
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!isInteractive || state.isPlaying) return;
    
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
  
  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging || !groupRef.current || !isInteractive) return;
    
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
        
        const threePos: [number, number, number] = [clampedX, clampedY, clampedZ];
        groupRef.current.position.set(...threePos);
        
        // Convert to physics coordinates and update state
        const physicsPos = threeToPhysicsPosition(threePos);
        onUpdate({ position: physicsPos });
      }
    } else if (dragMode === 'rotate') {
      // Rotate based on mouse movement
      const rotationSpeed = 0.01;
      const deltaX = event.movementX * rotationSpeed;
      const deltaY = event.movementY * rotationSpeed;
      
      groupRef.current.rotation.y += deltaX;  // Yaw
      groupRef.current.rotation.x += deltaY;  // Pitch
      groupRef.current.rotation.z += (deltaX * deltaY) * 0.5; // Roll
      
      // Update state with new rotation
      onUpdate({
        rotation: [
          groupRef.current.rotation.z,  // Roll
          groupRef.current.rotation.x,  // Pitch
          groupRef.current.rotation.y   // Yaw
        ]
      });
    }
  };
  
  const handlePointerUp = (event: PointerEvent) => {
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
    if (isHovered && isInteractive) {
      gl.domElement.style.cursor = 'move';
    } else {
      gl.domElement.style.cursor = 'auto';
    }
    
    return () => {
      gl.domElement.style.cursor = 'auto';
    };
  }, [isHovered, isInteractive, gl]);
  
  // Reset animation when trajectory changes
  useEffect(() => {
    // Only reset time if we're starting fresh (not resuming)
    if (state.trajectory.length > 0 && !wasPlayingRef.current) {
      timeRef.current = 0;
      onUpdate({ currentFrame: 0 });
    }
  }, [state.trajectory]);
  
  // Handle play/pause state changes
  useEffect(() => {
    if (state.isPlaying && !wasPlayingRef.current) {
      // Starting or resuming - set time to current frame's timestamp
      if (state.trajectory.length > 0 && state.currentFrame < state.trajectory.length) {
        timeRef.current = state.trajectory[state.currentFrame].timestamp;
      }
    }
    wasPlayingRef.current = state.isPlaying;
  }, [state.isPlaying, state.currentFrame, state.trajectory]);
  
  // Animation loop for trajectory playback
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    if (state.isPlaying && state.trajectory.length > 1) {
      // Update time
      timeRef.current += delta * simSpeed;
      
      // Find current segment
      let segmentIndex = state.currentFrame;
      for (let i = state.currentFrame; i < state.trajectory.length - 1; i++) {
        if (timeRef.current >= state.trajectory[i].timestamp && 
            timeRef.current < state.trajectory[i + 1].timestamp) {
          segmentIndex = i;
          break;
        }
      }
      
      // Check if we've reached the end
      if (timeRef.current >= state.trajectory[state.trajectory.length - 1].timestamp) {
        onUpdate({ isPlaying: false, currentFrame: 0 });
        timeRef.current = 0;
        wasPlayingRef.current = false;
        return;
      }
      
      if (segmentIndex !== state.currentFrame) {
        onUpdate({ currentFrame: segmentIndex });
      }
      
      // Get segment points
      const prev = state.trajectory[segmentIndex];
      const next = state.trajectory[segmentIndex + 1];
      
      // Calculate alpha for interpolation
      const segmentDuration = next.timestamp - prev.timestamp;
      const segmentTime = timeRef.current - prev.timestamp;
      const alpha = Math.min(1, Math.max(0, segmentTime / segmentDuration));
      
      // Update positions (convert physics to Three.js coordinates)
      prevPosRef.current.set(...physicsToThreePosition(prev.position));
      currPosRef.current.set(...physicsToThreePosition(next.position));
      
      // Linear interpolation for position
      groupRef.current.position.lerpVectors(prevPosRef.current, currPosRef.current, alpha);
      
      // Update quaternions with coordinate transformation
      prevQuatRef.current = physicsQuaternionToThreeJsSimple(prev.quaternion);
      currQuatRef.current = physicsQuaternionToThreeJsSimple(next.quaternion);
      
      // Spherical linear interpolation for rotation
      groupRef.current.quaternion.slerpQuaternions(prevQuatRef.current, currQuatRef.current, alpha);
    } else if (!state.isPlaying) {
      // Check if we're paused mid-simulation
      if (state.trajectory.length > 0 && state.currentFrame < state.trajectory.length) {
        // We're paused - set position to current frame in trajectory
        const currentPoint = state.trajectory[state.currentFrame];
        const threePos = physicsToThreePosition(currentPoint.position);
        groupRef.current.position.set(...threePos);
        
        // Set rotation from current frame
        const quat = physicsQuaternionToThreeJsSimple(currentPoint.quaternion);
        groupRef.current.quaternion.copy(quat);
      } else {
        // No trajectory or reset - use state position
        const threePos = physicsToThreePosition(state.position);
        groupRef.current.position.set(...threePos);
        
        // Convert Euler angles to quaternion
        const euler = new Euler(
          state.rotation[1],  // Pitch
          state.rotation[2],  // Yaw
          state.rotation[0],  // Roll
          'YXZ'
        );
        groupRef.current.rotation.copy(euler);
      }
    }
  });
  
  return (
    <group 
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <QuadcopterModel modelId={state.modelId} showDebug={false} />
      
      {/* Invisible larger hitbox for easier selection */}
      <mesh visible={false}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      </mesh>
    </group>
  );
}