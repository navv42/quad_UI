import { useState, useRef, useCallback } from 'react';
import { QuadcopterPhysics } from '@/lib/physics/QuadcopterPhysics';
import { ONNXInference } from '@/lib/inference/ONNXInference';
import type { TrajectoryPoint } from '@/lib/types/quadcopter';
import type { Vector3, Quaternion } from '@/lib/types';

interface UseMultiSimulationProps {
  dt: number;
  maxSteps: number;
  maxHeight: number;
  minHeight: number;
}

interface InitialState {
  position: Vector3;
  velocity: Vector3;
  quaternion: Quaternion;
  angularVelocity: Vector3;
}

interface MultiSimulationResult {
  trajectories: TrajectoryPoint[][];
  isComputing: boolean;
  error: string | null;
  computeTrajectories: (initialStates: InitialState[]) => Promise<TrajectoryPoint[][]>;
  reset: () => void;
}

export function useMultiSimulation({
  dt,
  maxSteps,
  maxHeight,
  minHeight,
}: UseMultiSimulationProps): MultiSimulationResult {
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[][]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inferenceRef = useRef<ONNXInference | null>(null);
  
  // Initialize AI once for all quadcopters
  const initializeAI = useCallback(async () => {
    if (!inferenceRef.current) {
      try {
        inferenceRef.current = await ONNXInference.getInstance();
        return true;
      } catch (error) {
        console.error('Failed to initialize AI:', error);
        setError('Failed to initialize AI');
        return false;
      }
    }
    return true;
  }, []);
  
  // Compute trajectories for multiple quadcopters in parallel
  const computeTrajectories = useCallback(async (initialStates: InitialState[]) => {
    setIsComputing(true);
    setError(null);
    
    try {
      // Initialize AI if needed
      const aiReady = await initializeAI();
      if (!aiReady) {
        throw new Error('AI initialization failed');
      }
      
      // Compute trajectory for each quadcopter
      // Process sequentially to avoid ONNX session conflicts
      const allTrajectories: TrajectoryPoint[][] = [];
      
      for (let index = 0; index < initialStates.length; index++) {
        const initialState = initialStates[index];
        const physics = new QuadcopterPhysics(initialState);
        const points: TrajectoryPoint[] = [];
        let currentTime = 0;
        
        // Add initial point
        const initialPhysicsState = physics.getState();
        points.push({
          position: [...initialPhysicsState.position],
          quaternion: [...initialPhysicsState.quaternion],
          velocity: [...initialPhysicsState.velocity],
          angularVelocity: [...initialPhysicsState.angularVelocity],
          action: [0, 0, 0, 0],
          timestamp: currentTime,
        });
        
        // Compute trajectory
        for (let step = 0; step < maxSteps; step++) {
          let action: [number, number, number, number];
          
          if (inferenceRef.current) {
            // Get AI action
            const stateArray = physics.getStateArray();
            try {
              action = await inferenceRef.current.infer(stateArray);
            } catch (error) {
              console.error(`AI inference failed for quadcopter ${index}:`, error);
              action = [0, 0, 0, 0];
            }
          } else {
            // Fallback to manual control
            action = [0, 0, 0, 0];
          }
          
          // Step physics
          const result = physics.step(action, dt);
          currentTime += dt;
          
          // Add point to trajectory
          points.push({
            position: [...result.position],
            quaternion: [...result.quaternion],
            velocity: [...result.velocity],
            angularVelocity: [...result.angularVelocity],
            action: action,
            timestamp: currentTime,
          });
          
          // Check limits
          const positionLimit = 4.0;
          const outOfBounds = 
            Math.abs(result.position[0]) > positionLimit ||
            Math.abs(result.position[1]) > positionLimit ||
            Math.abs(result.position[2]) > positionLimit;
          
          if (outOfBounds) {
            // console.log(`Quadcopter ${index} out of bounds at step ${step}`);
            break;
          }
        }
        
        // console.log(`Quadcopter ${index} trajectory complete: ${points.length} points`);
        

        allTrajectories.push(points);
        
      }
      
      console.log(`=== MULTI-SIMULATION COMPLETE ===`);
      // console.log(`Computed ${allTrajectories.length} trajectories`);
      setTrajectories(allTrajectories);
      return allTrajectories
    } catch (error) {
      console.error('Failed to compute trajectories:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return [];
    } finally {
      setIsComputing(false);
    }
  }, [dt, maxSteps, maxHeight, minHeight, initializeAI]);
  
  // Reset all trajectories
  const reset = useCallback(() => {
    console.log('=== RESET MULTI-TRAJECTORIES ===');
    setTrajectories([]);
    setError(null);
  }, []);
  
  return {
    trajectories,
    isComputing,
    error,
    computeTrajectories,
    reset,
  };
}