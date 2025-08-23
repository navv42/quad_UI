/**
 * ONNX Runtime inference service for quadcopter control
 */

import * as ort from 'onnxruntime-web';
import type { Action, NormalizerConfig } from '@/lib/types/simulation';

export class ONNXInference {
  private session: ort.InferenceSession | null = null;
  private normalizer: NormalizerConfig | null = null;
  private isInitialized = false;

  constructor() {
    // Configure ONNX Runtime to use CDN for WASM files
    if (typeof window !== 'undefined') {
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
    }
  }

  /**
   * Initialize the ONNX session and load normalizer
   */
  public async initialize(
    modelPath: string,
    normalizerPath: string
  ): Promise<void> {
    try {
      // Fetch and load ONNX model
      const modelResponse = await fetch(modelPath);
      if (!modelResponse.ok) {
        throw new Error(`Failed to load model: ${modelResponse.status}`);
      }
      const modelBuffer = await modelResponse.arrayBuffer();
      this.session = await ort.InferenceSession.create(modelBuffer);
      
      // Load normalizer configuration
      const response = await fetch(normalizerPath);
      if (!response.ok) {
        throw new Error(`Failed to load normalizer: ${response.status}`);
      }
      
      const normalizerData = await response.json();
      
      // Handle both separate mean/std files and combined normalizer format
      let mean, std, normDims;
      
      if (normalizerData.mean && normalizerData.std && normalizerData.norm_dims) {
        // Combined normalizer format
        mean = normalizerData.mean;
        std = normalizerData.std;
        normDims = normalizerData.norm_dims;
      } else if (Array.isArray(normalizerData)) {
        // Assume it's either mean or std array
        // This would need additional logic if using separate files
        throw new Error('Separate mean/std files not supported. Use combined normalizer.json');
      } else {
        throw new Error('Invalid normalizer format');
      }
      
      // Set default clip range if not provided
      this.normalizer = {
        mean: mean,
        std: std,
        normDims: normDims,
        clipRange: normalizerData.clipRange || 10.0,
      };
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ONNX inference:', error);
      throw error;
    }
  }

  /**
   * Normalize state vector for neural network input
   */
  private normalizeState(state: number[]): number[] {
    if (!this.normalizer) {
      throw new Error('Normalizer not initialized');
    }
    
    const normalizedState = [...state];
    const { mean, std, normDims, clipRange } = this.normalizer;
    
    // Normalize specified dimensions
    for (const dim of normDims) {
      normalizedState[dim] = (state[dim] - mean[dim]) / (std[dim] + 1e-8);
      // Clip to prevent extreme values
      normalizedState[dim] = Math.max(-clipRange, Math.min(clipRange, normalizedState[dim]));
    }
    
    return normalizedState;
  }

  /**
   * Run inference on the state vector
   */
  public async infer(state: number[]): Promise<Action> {
    if (!this.isInitialized || !this.session) {
      throw new Error('ONNX session not initialized');
    }
    
    // Normalize the state
    const normalizedState = this.normalizeState(state);
    
    // Create input tensor
    const stateTensor = new ort.Tensor('float32', Float32Array.from(normalizedState), [1, 13]);
    
    // Run inference
    const feeds = { state: stateTensor };
    const results = await this.session.run(feeds);
    
    // Extract action from results
    const actionData = results.action.data as Float32Array;
    
    // Apply tanh to bound actions to [-1, 1]
    // The ONNX model outputs raw mean values from the actor network
    // which need to be squashed through tanh for the final bounded actions
    const boundedActions: Action = [
      Math.tanh(actionData[0] || 0), // throttle
      Math.tanh(actionData[1] || 0), // roll
      Math.tanh(actionData[2] || 0), // pitch
      Math.tanh(actionData[3] || 0), // yaw
    ];
    
    return boundedActions;
  }

  /**
   * Check if the service is initialized
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get normalizer configuration
   */
  public getNormalizer(): NormalizerConfig | null {
    return this.normalizer ? { ...this.normalizer } : null;
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.normalizer = null;
    this.isInitialized = false;
  }
}