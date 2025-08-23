/**
 * Test script to verify TypeScript physics matches Python simulation exactly
 */

import { QuadcopterPhysics } from './lib/physics/QuadcopterPhysics';
import type { QuadcopterState, Action } from './lib/types/simulation';
import * as fs from 'fs';

// Load the Python simulation data
const pythonData = JSON.parse(fs.readFileSync('../simulation_python.json', 'utf8'));

// Extract simulation parameters
const simParams = pythonData.simulation_params;

// Initialize the physics with the same parameters as Python
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

// Helper function to compare values with tolerance
function compareWithTolerance(
  value1: number,
  value2: number,
  tolerance: number = 1e-10,
  name: string = ''
): boolean {
  const diff = Math.abs(value1 - value2);
  const relDiff = Math.abs(diff / (Math.abs(value1) + 1e-15));
  
  if (diff > tolerance && relDiff > tolerance) {
    console.error(`MISMATCH in ${name}:`);
    console.error(`  Python: ${value1}`);
    console.error(`  TypeScript: ${value2}`);
    console.error(`  Absolute diff: ${diff}`);
    console.error(`  Relative diff: ${relDiff}`);
    return false;
  }
  return true;
}

// Helper function to compare vectors
function compareVectors(
  vec1: number[],
  vec2: number[],
  tolerance: number = 1e-10,
  name: string = ''
): boolean {
  let allMatch = true;
  for (let i = 0; i < vec1.length; i++) {
    if (!compareWithTolerance(vec1[i], vec2[i], tolerance, `${name}[${i}]`)) {
      allMatch = false;
    }
  }
  return allMatch;
}

// Test each step
console.log('Testing TypeScript physics against Python simulation...\n');

let currentState = initialState;
let allStepsMatch = true;

// Only test first 3 steps for initial debugging
const stepsToTest = Math.min(3, pythonData.steps.length);

for (let stepIdx = 0; stepIdx < stepsToTest; stepIdx++) {
  const pythonStep = pythonData.steps[stepIdx];
  const action = pythonStep.action as Action;
  
  console.log(`\n=== Step ${stepIdx} ===`);
  console.log('Action:', action);
  
  // Verify initial state matches
  if (!compareVectors(
    [...currentState.position, ...currentState.velocity, ...currentState.quaternion, ...currentState.angularVelocity],
    pythonStep.normalized_state,
    1e-10,
    'Initial state'
  )) {
    console.error('Initial state mismatch at step', stepIdx);
    allStepsMatch = false;
  }
  
  // Log forces and torques from Python
  console.log('\nPython forces/torques:');
  console.log('  Thrust magnitude:', pythonStep.forces_torques.thrust_magnitude);
  console.log('  Torques body:', pythonStep.forces_torques.torques_body);
  console.log('  Thrust world:', pythonStep.forces_torques.thrust_world);
  
  // Step the TypeScript simulation
  const result = physics.step(action, simParams.dt);
  
  // Calculate TypeScript thrust magnitude for comparison
  const [throttle, roll, pitch, yaw] = action;
  const thrustMagnitude = Math.max(0.0, (throttle + 1.0) * simParams.mass * simParams.gravity);
  const torques = [roll * 0.5, pitch * 0.5, yaw * 0.1];
  
  console.log('\nTypeScript forces/torques:');
  console.log('  Thrust magnitude:', thrustMagnitude);
  console.log('  Torques body:', torques);
  console.log('  Thrust world:', result.debug.thrustWorld);
  
  // Compare forces
  if (!compareWithTolerance(thrustMagnitude, pythonStep.forces_torques.thrust_magnitude, 1e-10, 'Thrust magnitude')) {
    allStepsMatch = false;
  }
  
  if (!compareVectors(torques, pythonStep.forces_torques.torques_body, 1e-10, 'Torques')) {
    allStepsMatch = false;
  }
  
  // Compare derivatives
  console.log('\nPython derivatives:');
  console.log('  Acceleration:', pythonStep.derivatives.acceleration);
  console.log('  Angular acceleration:', pythonStep.derivatives.angular_acceleration);
  
  console.log('\nTypeScript derivatives:');
  console.log('  Acceleration:', result.debug.acceleration);
  console.log('  Angular acceleration:', result.debug.angularAcceleration);
  
  // Compare accelerations
  if (!compareVectors(result.debug.acceleration, pythonStep.derivatives.acceleration, 1e-8, 'Acceleration')) {
    allStepsMatch = false;
  }
  
  if (!compareVectors(result.debug.angularAcceleration, pythonStep.derivatives.angular_acceleration, 1e-8, 'Angular acceleration')) {
    allStepsMatch = false;
  }
  
  // Compare final state
  const pythonFinalState = pythonStep.state_after;
  
  console.log('\nComparing final states:');
  
  if (!compareVectors(result.position, pythonFinalState.position, 1e-10, 'Position')) {
    allStepsMatch = false;
  }
  
  if (!compareVectors(result.velocity, pythonFinalState.velocity, 1e-10, 'Velocity')) {
    allStepsMatch = false;
  }
  
  if (!compareVectors(result.quaternion, pythonFinalState.quaternion, 1e-10, 'Quaternion')) {
    allStepsMatch = false;
  }
  
  if (!compareVectors(result.angularVelocity, pythonFinalState.angular_velocity, 1e-10, 'Angular velocity')) {
    allStepsMatch = false;
  }
  
  // Update current state for next iteration
  currentState = {
    position: result.position,
    velocity: result.velocity,
    quaternion: result.quaternion,
    angularVelocity: result.angularVelocity,
  };
  
  if (!allStepsMatch) {
    console.error('\n❌ Mismatch detected! Stopping test.');
    break;
  } else {
    console.log('✅ Step matches Python!');
  }
}

if (allStepsMatch) {
  console.log('\n\n🎉 SUCCESS! All tested steps match Python simulation exactly!');
} else {
  console.log('\n\n❌ FAILURE! TypeScript simulation does not match Python.');
}