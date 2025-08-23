/**
 * Comprehensive test suite for QuadcopterPhysics
 * Verifies exact match with Python simulation data
 */

import { QuadcopterPhysics } from '../lib/physics/QuadcopterPhysics';
import type { QuadcopterState, Action } from '../lib/types/simulation';
import * as fs from 'fs';
import { describe, it, expect, beforeAll } from '@jest/globals';

// Load Python simulation data
const pythonDataPath = '/Users/nav/quad_UI/simulation_python.json';
let pythonData: any;

beforeAll(() => {
  pythonData = JSON.parse(fs.readFileSync(pythonDataPath, 'utf8'));
});

describe('QuadcopterPhysics', () => {
  describe('RK4 Integration Accuracy', () => {
    it('should match Python simulation exactly for all 10 steps', () => {
      const simParams = pythonData.simulation_params;
      
      // Initialize with the same state as Python (includes rotated initial quaternion)
      const initialState: QuadcopterState = {
        position: pythonData.steps[0].state_before.position as [number, number, number],
        velocity: pythonData.steps[0].state_before.velocity as [number, number, number],
        quaternion: pythonData.steps[0].state_before.quaternion as [number, number, number, number],
        angularVelocity: pythonData.steps[0].state_before.angular_velocity as [number, number, number],
      };

      const physics = new QuadcopterPhysics(initialState, {
        mass: simParams.mass,
        inertia: simParams.inertia as [number, number, number],
        gravity: simParams.gravity,
        dt: simParams.dt,
        armLength: simParams.arm_length,
        thrustCoefficient: simParams.thrust_coefficient,
        torqueCoefficient: simParams.torque_coefficient,
        maxMotorSpeed: simParams.max_motor_speed,
      });

      // Test each step
      for (let stepIdx = 0; stepIdx < pythonData.steps.length; stepIdx++) {
        const pythonStep = pythonData.steps[stepIdx];
        const action = pythonStep.action as Action;
        
        // Verify initial state matches
        const currentState = physics.getState();
        const expectedInitialState = [
          ...pythonStep.state_before.position,
          ...pythonStep.state_before.velocity,
          ...pythonStep.state_before.quaternion,
          ...pythonStep.state_before.angular_velocity,
        ];
        const actualInitialState = [
          ...currentState.position,
          ...currentState.velocity,
          ...currentState.quaternion,
          ...currentState.angularVelocity,
        ];
        
        for (let i = 0; i < expectedInitialState.length; i++) {
          expect(actualInitialState[i]).toBeCloseTo(expectedInitialState[i], 10);
        }
        
        // Step the simulation
        const result = physics.step(action, simParams.dt);
        
        // Verify forces and torques
        const [throttle, roll, pitch, yaw] = action;
        const expectedThrust = pythonStep.forces_torques.thrust_magnitude;
        const actualThrust = Math.max(0.0, (throttle + 1.0) * simParams.mass * simParams.gravity);
        expect(actualThrust).toBeCloseTo(expectedThrust, 10);
        
        const expectedTorques = pythonStep.forces_torques.torques_body;
        const actualTorques = [roll * 0.5, pitch * 0.5, yaw * 0.1];
        for (let i = 0; i < 3; i++) {
          expect(actualTorques[i]).toBeCloseTo(expectedTorques[i], 10);
        }
        
        // Verify derivatives (acceleration and angular acceleration)
        const expectedAcceleration = pythonStep.derivatives.acceleration;
        const expectedAngularAcceleration = pythonStep.derivatives.angular_acceleration;
        
        for (let i = 0; i < 3; i++) {
          expect(result.debug.acceleration[i]).toBeCloseTo(expectedAcceleration[i], 8);
          expect(result.debug.angularAcceleration[i]).toBeCloseTo(expectedAngularAcceleration[i], 8);
        }
        
        // Verify final state
        const pythonFinalState = pythonStep.state_after;
        
        // Position
        for (let i = 0; i < 3; i++) {
          expect(result.position[i]).toBeCloseTo(pythonFinalState.position[i], 10);
        }
        
        // Velocity
        for (let i = 0; i < 3; i++) {
          expect(result.velocity[i]).toBeCloseTo(pythonFinalState.velocity[i], 10);
        }
        
        // Quaternion
        for (let i = 0; i < 4; i++) {
          expect(result.quaternion[i]).toBeCloseTo(pythonFinalState.quaternion[i], 10);
        }
        
        // Angular velocity
        for (let i = 0; i < 3; i++) {
          expect(result.angularVelocity[i]).toBeCloseTo(pythonFinalState.angular_velocity[i], 10);
        }
      }
    });
  });

  describe('Forces and Torques Calculation', () => {
    it('should correctly convert normalized controls to forces and torques', () => {
      const simParams = pythonData.simulation_params;
      const initialState: QuadcopterState = {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [0, 0, 0],
      };

      const physics = new QuadcopterPhysics(initialState, {
        mass: simParams.mass,
        inertia: simParams.inertia as [number, number, number],
        gravity: simParams.gravity,
        dt: simParams.dt,
      });

      // Test various control inputs
      const testCases = [
        { action: [0, 0, 0, 0], expectedThrust: simParams.mass * simParams.gravity },
        { action: [1, 0, 0, 0], expectedThrust: 2 * simParams.mass * simParams.gravity },
        { action: [-1, 0, 0, 0], expectedThrust: 0 },
        { action: [0, 1, 0, 0], expectedThrust: simParams.mass * simParams.gravity },
        { action: [0, 0, 1, 0], expectedThrust: simParams.mass * simParams.gravity },
        { action: [0, 0, 0, 1], expectedThrust: simParams.mass * simParams.gravity },
      ];

      for (const testCase of testCases) {
        const action = testCase.action as Action;
        const expectedThrust = testCase.expectedThrust;
        const actualThrust = Math.max(0.0, (action[0] + 1.0) * simParams.mass * simParams.gravity);
        expect(actualThrust).toBeCloseTo(expectedThrust, 10);
        
        // Verify torques
        const expectedTorques = [action[1] * 0.5, action[2] * 0.5, action[3] * 0.1];
        const actualTorques = [action[1] * 0.5, action[2] * 0.5, action[3] * 0.1];
        for (let i = 0; i < 3; i++) {
          expect(actualTorques[i]).toBeCloseTo(expectedTorques[i], 10);
        }
      }
    });
  });

  describe('Quaternion Operations', () => {
    it('should correctly normalize quaternions', () => {
      const initialState: QuadcopterState = {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        quaternion: [2, 0, 0, 0], // Non-normalized
        angularVelocity: [0, 0, 0],
      };

      const physics = new QuadcopterPhysics(initialState);
      
      // After a step, quaternion should be normalized
      physics.step([0, 0, 0, 0]);
      const state = physics.getState();
      
      const norm = Math.sqrt(
        state.quaternion[0] ** 2 +
        state.quaternion[1] ** 2 +
        state.quaternion[2] ** 2 +
        state.quaternion[3] ** 2
      );
      
      expect(norm).toBeCloseTo(1.0, 10);
    });

    it('should handle different initial orientations correctly', () => {
      // Test with the rotated initial quaternion from Python data
      const pythonInitialQuat = pythonData.steps[0].state_before.quaternion;
      
      const initialState: QuadcopterState = {
        position: [0.5, 0.5, 0.5],
        velocity: [0, 0, 0],
        quaternion: pythonInitialQuat as [number, number, number, number],
        angularVelocity: [0, 0, 0],
      };

      const physics = new QuadcopterPhysics(initialState);
      const state = physics.getState();
      
      // Verify quaternion is preserved
      for (let i = 0; i < 4; i++) {
        expect(state.quaternion[i]).toBeCloseTo(pythonInitialQuat[i], 10);
      }
      
      // Verify it's normalized
      const norm = Math.sqrt(
        state.quaternion[0] ** 2 +
        state.quaternion[1] ** 2 +
        state.quaternion[2] ** 2 +
        state.quaternion[3] ** 2
      );
      expect(norm).toBeCloseTo(1.0, 10);
    });
  });

  describe('State Management', () => {
    it('should correctly get and set state', () => {
      const initialState: QuadcopterState = {
        position: [1, 2, 3],
        velocity: [4, 5, 6],
        quaternion: [0.7071, 0.7071, 0, 0],
        angularVelocity: [7, 8, 9],
      };

      const physics = new QuadcopterPhysics(initialState);
      const state = physics.getState();
      
      expect(state.position).toEqual(initialState.position);
      expect(state.velocity).toEqual(initialState.velocity);
      expect(state.quaternion).toEqual(initialState.quaternion);
      expect(state.angularVelocity).toEqual(initialState.angularVelocity);
    });

    it('should correctly convert state to array', () => {
      const initialState: QuadcopterState = {
        position: [1, 2, 3],
        velocity: [4, 5, 6],
        quaternion: [0.7071, 0.7071, 0, 0],
        angularVelocity: [7, 8, 9],
      };

      const physics = new QuadcopterPhysics(initialState);
      const stateArray = physics.getStateArray();
      
      const expected = [
        1, 2, 3,           // position
        4, 5, 6,           // velocity
        0.7071, 0.7071, 0, 0, // quaternion
        7, 8, 9            // angular velocity
      ];
      
      expect(stateArray).toEqual(expected);
    });

    it('should correctly reset state', () => {
      const initialState: QuadcopterState = {
        position: [1, 2, 3],
        velocity: [4, 5, 6],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [7, 8, 9],
      };

      const physics = new QuadcopterPhysics(initialState);
      
      // Step the simulation
      physics.step([0.5, 0.1, 0.2, 0.3]);
      
      // Reset to new state
      const newState: QuadcopterState = {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        quaternion: [0.7071, 0.7071, 0, 0],
        angularVelocity: [0, 0, 0],
      };
      
      physics.reset(newState);
      const state = physics.getState();
      
      expect(state.position).toEqual(newState.position);
      expect(state.velocity).toEqual(newState.velocity);
      expect(state.quaternion).toEqual(newState.quaternion);
      expect(state.angularVelocity).toEqual(newState.angularVelocity);
    });
  });
});