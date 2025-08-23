/**
 * React hook for managing quadcopter simulation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationController, SimulationStep } from '@/lib/simulation/SimulationController';
import type { QuadcopterState } from '@/lib/types/simulation';

export interface UseSimulationOptions {
  modelPath?: string;
  normalizerPath?: string;
  referenceDataPath?: string;
  autoInitialize?: boolean;
}

export interface UseSimulationReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentState: QuadcopterState | null;
  currentStep: number;
  history: SimulationStep[];
  useReferenceActions: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  step: () => Promise<void>;
  reset: () => void;
  setUseReferenceActions: (use: boolean) => void;
  runSteps: (count: number, delayMs?: number) => Promise<void>;
}

export function useSimulation(options: UseSimulationOptions = {}): UseSimulationReturn {
  const {
    modelPath = '/quadcopter_actor.onnx',
    normalizerPath = '/normalizer.json',
    referenceDataPath = '/simulation_output.json',
    autoInitialize = false,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<QuadcopterState | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<SimulationStep[]>([]);
  const [useReferenceActions, setUseReferenceActionsState] = useState(false);
  
  const controllerRef = useRef<SimulationController | null>(null);

  /**
   * Initialize the simulation
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!controllerRef.current) {
        controllerRef.current = new SimulationController(
          modelPath,
          normalizerPath,
          referenceDataPath
        );
      }
      
      await controllerRef.current.initialize();
      
      setIsInitialized(true);
      setCurrentState(controllerRef.current.getCurrentState());
      setCurrentStep(0);
      setHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize simulation');
      console.error('Simulation initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [modelPath, normalizerPath, referenceDataPath, isInitialized]);

  /**
   * Run a single simulation step
   */
  const step = useCallback(async () => {
    if (!controllerRef.current || !isInitialized) {
      setError('Simulation not initialized');
      return;
    }
    
    try {
      const stepResult = await controllerRef.current.step();
      
      setCurrentState(stepResult.stateAfter);
      setCurrentStep(stepResult.stepNumber);
      setHistory(prev => [...prev, stepResult]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run simulation step');
      console.error('Simulation step error:', err);
    }
  }, [isInitialized]);

  /**
   * Run multiple steps with optional delay
   */
  const runSteps = useCallback(async (count: number, delayMs = 0) => {
    for (let i = 0; i < count; i++) {
      await step();
      if (delayMs > 0 && i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }, [step]);

  /**
   * Reset the simulation
   */
  const reset = useCallback(() => {
    if (!controllerRef.current) return;
    
    controllerRef.current.reset();
    setCurrentState(controllerRef.current.getCurrentState());
    setCurrentStep(0);
    setHistory([]);
    setError(null);
  }, []);

  /**
   * Set whether to use reference actions
   */
  const setUseReferenceActions = useCallback((use: boolean) => {
    if (controllerRef.current) {
      controllerRef.current.setUseReferenceActions(use);
    }
    setUseReferenceActionsState(use);
  }, []);

  /**
   * Auto-initialize if requested
   */
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isLoading) {
      initialize();
    }
  }, [autoInitialize, isInitialized, isLoading, initialize]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    currentState,
    currentStep,
    history,
    useReferenceActions,
    
    // Actions
    initialize,
    step,
    reset,
    setUseReferenceActions,
    runSteps,
  };
}