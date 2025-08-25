/**
 * Quadcopter state and types
 */

import type { Vector3, Quaternion } from './simulation';

export interface TrajectoryPoint {
  position: Vector3;
  quaternion: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
  action: [number, number, number, number];
  timestamp: number;
}

export interface QuadcopterState {
  id: string;
  // Position in physics coordinates (Y-forward, Z-up)
  position: Vector3;
  // Euler angles in radians [roll, pitch, yaw]
  rotation: Vector3;
  // Velocity for physics simulation
  velocity: Vector3;
  angularVelocity: Vector3;
  // Playback state
  isPlaying: boolean;
  trajectory: TrajectoryPoint[];
  currentFrame: number;
  // Visual properties
  color?: string;
  modelId?: string;
}

export interface QuadcopterProps {
  state: QuadcopterState;
  onUpdate: (updates: Partial<QuadcopterState>) => void;
  isInteractive: boolean;
  simSpeed: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onActionUpdate?: (action: [number, number, number, number]) => void;
}