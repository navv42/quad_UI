/**
 * Main simulation controller that orchestrates physics and inference
 */

import { QuadcopterPhysics } from '@/lib/physics/QuadcopterPhysics';
import { ONNXInference } from '@/lib/inference/ONNXInference';
import type {
  QuadcopterState,
  Action,
  SimulationData,
  PhysicsStepResult,
} from '@/lib/types/simulation';

export interface SimulationStep {
  stepNumber: number;
  stateBefore: QuadcopterState;
  stateAfter: QuadcopterState;
  action: Action;
  rateLimitedAction?: Action;
  physicsDebug?: {
    thrustWorld: [number, number, number];
    acceleration: [number, number, number];
    angularAcceleration: [number, number, number];
  };
  referenceState?: number[];
  referenceAction?: number[];
  errors?: {
    position: number;
    velocity: number;
    angularVelocity: number;
  };
}

export class SimulationController {
  private physics: QuadcopterPhysics;
  private inference: ONNXInference;
  private referenceData: SimulationData | null = null;
  private currentStep = 0;
  private history: SimulationStep[] = [];
  private useReferenceActions = false;
  private modelPath: string;
  private normalizerPath: string;
  private referenceDataPath?: string;

  constructor(modelPath: string, normalizerPath: string, referenceDataPath?: string) {
    // Initialize with default state
    const initialState: QuadcopterState = {
      position: [0, 0, 2.5],
      velocity: [0, 0, 0],
      quaternion: [1, 0, 0, 0],
      angularVelocity: [0, 0, 0],
    };
    
    this.physics = new QuadcopterPhysics(initialState);
    this.inference = new ONNXInference();
    this.modelPath = modelPath;
    this.normalizerPath = normalizerPath;
    this.referenceDataPath = referenceDataPath;
  }

  /**
   * Initialize the simulation with models and reference data
   */
  public async initialize(): Promise<void> {
    // Initialize ONNX inference
    await this.inference.initialize(this.modelPath, this.normalizerPath);
    
    // Load reference data if provided
    if (this.referenceDataPath) {
      const response = await fetch(this.referenceDataPath);
      if (response.ok) {
        this.referenceData = await response.json();
        
        // Initialize physics with reference initial state
        if (this.referenceData && this.referenceData.observations && this.referenceData.observations.length > 0) {
          const initialObs = this.referenceData.observations[0];
          const initialState: QuadcopterState = {
            position: initialObs.slice(0, 3) as [number, number, number],
            velocity: initialObs.slice(3, 6) as [number, number, number],
            quaternion: initialObs.slice(6, 10) as [number, number, number, number],
            angularVelocity: initialObs.slice(10, 13) as [number, number, number],
          };
          this.physics.reset(initialState);
        }
      }
    }
  }

  /**
   * Calculate error between current and reference states
   */
  private calculateErrors(
    current: number[],
    reference: number[]
  ): SimulationStep['errors'] {
    // Position error
    const posError = Math.sqrt(
      Math.pow(current[0] - reference[0], 2) +
      Math.pow(current[1] - reference[1], 2) +
      Math.pow(current[2] - reference[2], 2)
    );
    
    // Velocity error
    const velError = Math.sqrt(
      Math.pow(current[3] - reference[3], 2) +
      Math.pow(current[4] - reference[4], 2) +
      Math.pow(current[5] - reference[5], 2)
    );
    
    // Angular velocity error
    const angVelError = Math.sqrt(
      Math.pow(current[10] - reference[10], 2) +
      Math.pow(current[11] - reference[11], 2) +
      Math.pow(current[12] - reference[12], 2)
    );
    
    return {
      position: posError,
      velocity: velError,
      angularVelocity: angVelError,
    };
  }

  /**
   * Run a single simulation step
   */
  public async step(dt: number = 0.04): Promise<SimulationStep> {
    const stateBefore = this.physics.getState();
    const stateArray = this.physics.getStateArray();
    
    // Get action from neural network
    let action = await this.inference.infer(stateArray);
    
    // Optionally use reference actions for testing
    if (this.useReferenceActions && this.referenceData && 
        this.currentStep < this.referenceData.actions.length) {
      const refAction = this.referenceData.actions[this.currentStep];
      // Use all 4 values if available, otherwise pad with 0 for yaw
      action = refAction.length >= 4 
        ? [refAction[0], refAction[1], refAction[2], refAction[3]]
        : [refAction[0], refAction[1], refAction[2], 0];
    }
    
    // Step physics
    const physicsResult = this.physics.step(action, dt);
    
    // Create step record
    const stepRecord: SimulationStep = {
      stepNumber: this.currentStep + 1,
      stateBefore,
      stateAfter: {
        position: physicsResult.position,
        velocity: physicsResult.velocity,
        quaternion: physicsResult.quaternion,
        angularVelocity: physicsResult.angularVelocity,
      },
      action,
      physicsDebug: physicsResult.debug,
    };
    
    // Add reference data if available
    if (this.referenceData && this.referenceData.observations && this.currentStep < this.referenceData.observations.length) {
      stepRecord.referenceState = this.referenceData.observations[this.currentStep];
      
      if (this.currentStep < this.referenceData.actions.length) {
        stepRecord.referenceAction = this.referenceData.actions[this.currentStep];
      }
      
      // Calculate errors
      stepRecord.errors = this.calculateErrors(stateArray, stepRecord.referenceState);
    }
    
    // Update history
    this.history.push(stepRecord);
    this.currentStep++;
    
    return stepRecord;
  }

  /**
   * Reset the simulation
   */
  public reset(): void {
    this.currentStep = 0;
    this.history = [];
    
    // Reset to initial state
    if (this.referenceData && this.referenceData.observations && this.referenceData.observations.length > 0) {
      const initialObs = this.referenceData.observations[0];
      const initialState: QuadcopterState = {
        position: initialObs.slice(0, 3) as [number, number, number],
        velocity: initialObs.slice(3, 6) as [number, number, number],
        quaternion: initialObs.slice(6, 10) as [number, number, number, number],
        angularVelocity: initialObs.slice(10, 13) as [number, number, number],
      };
      this.physics.reset(initialState);
    } else {
      // Default initial state
      this.physics.reset({
        position: [0, 0, 2.5],
        velocity: [0, 0, 0],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [0, 0, 0],
      });
    }
  }

  /**
   * Get current state
   */
  public getCurrentState(): QuadcopterState {
    return this.physics.getState();
  }

  /**
   * Get simulation history
   */
  public getHistory(): SimulationStep[] {
    return [...this.history];
  }

  /**
   * Get current step number
   */
  public getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Get current step count (alias for getCurrentStep)
   */
  public getStepCount(): number {
    return this.currentStep;
  }

  /**
   * Set whether to use reference actions
   */
  public setUseReferenceActions(use: boolean): void {
    this.useReferenceActions = use;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.inference.getIsInitialized();
  }
}