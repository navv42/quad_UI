/**
 * Consolidated type definitions for the quadcopter simulation
 */

// ============================================================================
// Core Physics Types
// ============================================================================

/** 3D vector representing position, velocity, or forces */
export type Vector3 = [number, number, number];

/** Quaternion for 3D rotation [w, x, y, z] */
export type Quaternion = [number, number, number, number];

/** Control action array [throttle, roll, pitch, yaw] normalized to [-1, 1] */
export type Action = [number, number, number, number];

/** Physical forces and torques */
export interface ForcesTorques {
  thrust: number;
  rollTorque: number;
  pitchTorque: number;
  yawTorque: number;
}

// ============================================================================
// State Types
// ============================================================================

/** Complete state of the quadcopter */
export interface QuadcopterState {
  position: Vector3;
  velocity: Vector3;
  quaternion: Quaternion;
  angularVelocity: Vector3;
}

/** Result from a physics simulation step */
export interface PhysicsStepResult extends QuadcopterState {
  debug?: {
    thrustWorld: Vector3;
    acceleration: Vector3;
    angularAcceleration: Vector3;
  };
}

// ============================================================================
// Simulation Types
// ============================================================================

/** Physical parameters for the simulation */
export interface SimulationParams {
  mass: number;                  // kg
  inertia: Vector3;              // kg⋅m²
  gravity: number;               // m/s²
  dt: number;                    // seconds
  armLength: number;             // meters
  thrustCoefficient: number;     // N/(rad/s)²
  torqueCoefficient: number;     // N⋅m/(rad/s)²
  maxMotorSpeed: number;         // rad/s
}

/** Configuration for simulation */
export interface SimulationConfig {
  dt: number;
  maxSteps: number;
  maxHeight: number;
  minHeight: number;
}

/** Point in a trajectory */
export interface TrajectoryPoint {
  position: Vector3;
  velocity: Vector3;
  quaternion: Quaternion;
  angularVelocity: Vector3;
  action: Action;
  timestamp: number;
}

// ============================================================================
// UI/Control Types
// ============================================================================

/** Control modes for user interaction */
export type ControlMode = 'translate' | 'rotate';

/** Simulation playback state */
export interface SimulationPlaybackState {
  isPlaying: boolean;
  isComputing: boolean;
  isPaused: boolean;
  speed: number;
}

/** Initial conditions for simulation */
export interface InitialConditions {
  position: Vector3;
  orientation: {
    roll: number;   // degrees
    pitch: number;  // degrees
    yaw: number;    // degrees
  };
}

// ============================================================================
// Neural Network Types
// ============================================================================

/** Input shape for the neural network */
export interface ModelInput {
  state: number[];  // Flattened state vector [13 dimensions]
}

/** Output from the neural network */
export interface ModelOutput {
  action: Action;   // Control commands
}

// ============================================================================
// Coordinate System Types
// ============================================================================

/** 
 * Coordinate system mappings:
 * Physics: X forward, Y right, Z up
 * Three.js: X right, Y up, Z forward
 */
export interface CoordinateMapping {
  physicsToThreePosition: (pos: Vector3) => Vector3;
  threeToPhysicsPosition: (pos: Vector3) => Vector3;
  physicsToThreeQuaternion: (quat: Quaternion) => Quaternion;
  threeToPhysicsQuaternion: (quat: Quaternion) => Quaternion;
}

// ============================================================================
// Component Props Types
// ============================================================================

/** Props for trajectory visualization components */
export interface TrajectoryVisualizationProps {
  trajectory: TrajectoryPoint[];
  isPlaying: boolean;
  simSpeed?: number;
  onComplete?: () => void;
  onActionUpdate?: (action: Action) => void;
}

/** Props for interactive quadcopter component */
export interface InteractiveQuadcopterProps {
  position: Vector3;
  rotation: Vector3;  // Euler angles in radians
  onPositionChange: (position: Vector3) => void;
  onRotationChange: (rotation: Vector3) => void;
  isPlaying: boolean;
  controlMode: ControlMode;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/** Props for step-by-step trajectory component */
export interface StepTrajectoryProps {
  trajectory: TrajectoryPoint[];
  currentStep: number;
  onStateUpdate: (state: Partial<QuadcopterState>) => void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/** Return type for usePrecomputedSimulation hook */
export interface PrecomputedSimulationResult {
  trajectory: TrajectoryPoint[];
  isComputing: boolean;
  error: string | null;
  computeTrajectory: (
    initialState: QuadcopterState,
    useAI: boolean,
    manualThrottle: number
  ) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Deep partial type for configuration objects */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make specific keys required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;