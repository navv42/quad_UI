/**
 * Core types for the quadcopter simulation
 */

// 3D vector type
export type Vector3 = [number, number, number];

// Quaternion type [w, x, y, z]
export type Quaternion = [number, number, number, number];

// Complete state of the quadcopter
export interface QuadcopterState {
  position: Vector3;
  velocity: Vector3;
  quaternion: Quaternion;
  angularVelocity: Vector3;
}

// Action from the neural network [throttle, roll, pitch, yaw]
export type Action = [number, number, number, number];

// Simulation parameters
export interface SimulationParams {
  mass: number;
  inertia: Vector3;
  gravity: number;
  dt: number;
  armLength: number;
  thrustCoefficient: number;
  torqueCoefficient: number;
  maxMotorSpeed: number;
  maxRollTorque?: number;
  maxPitchTorque?: number;
  maxYawTorque?: number;
}

// Normalizer configuration
export interface NormalizerConfig {
  mean: number[];
  std: number[];
  normDims: number[];
  clipRange: number;
}

// Forces and torques
export interface ForcesTorques {
  thrust: number;
  torques: Vector3;
}

// Debug information for physics step
export interface PhysicsDebugInfo {
  thrustWorld: Vector3;
  acceleration: Vector3;
  angularAcceleration: Vector3;
}

// Complete physics step result
export interface PhysicsStepResult extends QuadcopterState {
  debug: PhysicsDebugInfo;
}

// Reference simulation data
export interface SimulationData {
  observations: number[][];
  actions: number[][];
}