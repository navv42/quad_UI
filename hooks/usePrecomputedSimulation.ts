import { useState, useRef, useCallback, useEffect } from 'react';
import { QuadcopterPhysics } from '@/lib/physics/QuadcopterPhysics';
import { ONNXInference } from '@/lib/inference/ONNXInference';
import type { Vector3, Quaternion } from '@/lib/physics/types';
import type { TrajectoryPoint } from '@/lib/types/quadcopter';

// Re-export for backward compatibility
export type { TrajectoryPoint };

interface UsePrecomputedSimulationProps {
  dt: number;
  maxSteps: number;
  maxHeight: number;
  minHeight: number;
}

export function usePrecomputedSimulation({
  dt,
  maxSteps,
  maxHeight,
  minHeight,
}: UsePrecomputedSimulationProps) {
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const physicsRef = useRef<QuadcopterPhysics | null>(null);
  const inferenceRef = useRef<ONNXInference | null>(null);
  
  // Initialize physics
  const initializePhysics = useCallback((initialState: any) => {
    physicsRef.current = new QuadcopterPhysics(initialState);
  }, []);
  
  // Initialize AI
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
  
  // Compute entire trajectory
  const computeTrajectory = useCallback(async (
    initialState: any,
    useAI: boolean,
    manualThrottle: number = 1.0
  ) => {
    setIsComputing(true);
    setError(null);
    
    try {
      // Initialize physics with initial state
      initializePhysics(initialState);
      
      if (!physicsRef.current) {
        throw new Error('Physics not initialized');
      }
      
      // Initialize AI if needed
      if (useAI) {
        const aiReady = await initializeAI();
        if (!aiReady) {
          throw new Error('AI initialization failed');
        }
      }
      
      const points: TrajectoryPoint[] = [];
      let currentTime = 0;
      
      // Add initial point
      const initialPhysicsState = physicsRef.current.getState();
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
        
        if (useAI && inferenceRef.current) {
          // Get AI action
          const stateArray = physicsRef.current.getStateArray();
          try {
            action = await inferenceRef.current.infer(stateArray);
          } catch (error) {
            console.error('AI inference failed:', error);
            action = [0, 0, 0, 0];
          }
        } else {
          // Manual control
          action = [manualThrottle, 0, 0, 0];
        }
        
        // Step physics
        const result = physicsRef.current.step(action, dt);
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
        
        // Check limits - terminate if outside [-4, 4] on any axis
        const positionLimit = 4.0;
        const outOfBounds = 
          Math.abs(result.position[0]) > positionLimit ||  // X axis
          Math.abs(result.position[1]) > positionLimit ||  // Y axis
          Math.abs(result.position[2]) > positionLimit;    // Z axis
        
        if (outOfBounds) {
          console.log(`=== TERMINATING EARLY - OUT OF BOUNDS ===`);
          // console.log(`Step: ${step}, Position: [${result.position[0].toFixed(2)}, ${result.position[1].toFixed(2)}, ${result.position[2].toFixed(2)}]`);
          // console.log(`Limits: [-4, 4] on all axes`);
          break;
        }
      }
      
      console.log('=== TRAJECTORY COMPLETE ===');
      // console.log(`Total points: ${points.length}`);
      // console.log('First point:', points[0]);
      // console.log('Last point:', points[points.length - 1]);
      setTrajectory(points);
      
    } catch (error) {
      console.error('Failed to compute trajectory:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsComputing(false);
    }
  }, [dt, maxSteps, maxHeight, minHeight, initializePhysics, initializeAI]);
  
  // Reset trajectory
  const reset = useCallback(() => {
    console.log('=== RESET TRAJECTORY ===');
    // console.log('Clearing trajectory, previous length:', trajectory.length);
    setTrajectory([]);
    setError(null);
  }, [trajectory.length]);
  
  // Note: We don't dispose the ONNX instance on cleanup because it's a singleton
  // shared across the entire app. Disposing it would break other components.
  
  return {
    trajectory,
    isComputing,
    error,
    computeTrajectory,
    reset,
  };
}