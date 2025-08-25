import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Line, BufferAttribute, LineBasicMaterial } from 'three';
import type { TrajectoryPoint } from '@/lib/types/quadcopter';

interface TrailProps {
  trajectory: TrajectoryPoint[];
  currentFrame: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}

export function Trail({ 
  trajectory, 
  currentFrame, 
  color = '#00ff00',
  opacity = 0.6,
  lineWidth = 10
}: TrailProps) {
  const lineRef = useRef<Line>(null);
  
  // Convert physics coordinates to Three.js coordinates
  const physicsToThreePosition = (pos: [number, number, number]): [number, number, number] => {
    return [pos[0], pos[2], pos[1]]; // [x, z, y] in Three.js
  };
  
  // Create geometry from trajectory points up to current frame
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    
    if (trajectory.length === 0 || currentFrame < 0) {
      // Empty geometry
      geo.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
      return geo;
    }
    
    // Get points up to and including current frame
    const pointsToShow = Math.min(currentFrame + 1, trajectory.length);
    const positions = new Float32Array(pointsToShow * 3);
    
    for (let i = 0; i < pointsToShow; i++) {
      const threePos = physicsToThreePosition(trajectory[i].position);
      positions[i * 3] = threePos[0];
      positions[i * 3 + 1] = threePos[1];
      positions[i * 3 + 2] = threePos[2];
    }
    
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, [trajectory, currentFrame]);
  
  // Create material with fade effect
  const material = useMemo(() => {
    return new LineBasicMaterial({
      color: color,
      opacity: opacity,
      transparent: true,
      linewidth: lineWidth
    });
  }, [color, opacity, lineWidth]);
  
  // Animate opacity fade for older parts of the trail
  useFrame(() => {
    if (lineRef.current && lineRef.current.geometry.attributes.position) {
      const positions = lineRef.current.geometry.attributes.position;
      const vertexCount = positions.count;
      
      // Create or update color attribute for per-vertex opacity
      let colors = lineRef.current.geometry.attributes.color;
      
      if (!colors || colors.count !== vertexCount) {
        const colorArray = new Float32Array(vertexCount * 3);
        colors = new BufferAttribute(colorArray, 3);
        lineRef.current.geometry.setAttribute('color', colors);
        // lineRef.current.material.vertexColors = true;
      }
      
      // Apply fade gradient
      for (let i = 0; i < vertexCount; i++) {
        const fadeAmount = 1.0 - (i / vertexCount) * 0.5; // Fade from 1.0 to 0.5
        colors.setXYZ(i, fadeAmount, fadeAmount, fadeAmount);
      }
      
      colors.needsUpdate = true;
    }
  });
  
  if (trajectory.length === 0 || currentFrame < 0) {
    return null;
  }
  
  return (
    <primitive ref={lineRef} object={new Line(geometry, material)} />
  );
}