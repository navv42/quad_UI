// /**
//  * Standalone test to verify TypeScript physics matches updated Python simulation
//  * This test uses the new initial quaternion orientation
//  */

// import fs from 'fs';
// import { QuadcopterPhysics } from './lib/physics/QuadcopterPhysics.js';

// // Load the Python simulation data
// const pythonData = JSON.parse(fs.readFileSync('../simulation_python.json', 'utf8'));

// // Helper functions for comparison
// function compareWithTolerance(value1, value2, tolerance = 1e-10, name = '') {
//   const diff = Math.abs(value1 - value2);
//   const relDiff = Math.abs(diff / (Math.abs(value1) + 1e-15));
  
//   if (diff > tolerance && relDiff > tolerance) {
//     console.error(`❌ MISMATCH in ${name}:`);
//     console.error(`  Python: ${value1}`);
//     console.error(`  TypeScript: ${value2}`);
//     console.error(`  Absolute diff: ${diff}`);
//     console.error(`  Relative diff: ${relDiff}`);
//     return false;
//   }
//   return true;
// }

// function compareVectors(vec1, vec2, tolerance = 1e-10, name = '') {
//   let allMatch = true;
//   for (let i = 0; i < vec1.length; i++) {
//     if (!compareWithTolerance(vec1[i], vec2[i], tolerance, `${name}[${i}]`)) {
//       allMatch = false;
//     }
//   }
//   return allMatch;
// }

// // Test setup
// console.log('🧪 Testing TypeScript physics against updated Python simulation...\n');
// console.log('Initial quaternion (rotated):', pythonData.steps[0].state_before.quaternion);
// console.log('This represents a 90-degree rotation about the X-axis\n');

// const simParams = pythonData.simulation_params;

// // Initialize with the new rotated initial state
// const initialState = {
//   position: pythonData.steps[0].state_before.position,
//   velocity: pythonData.steps[0].state_before.velocity,
//   quaternion: pythonData.steps[0].state_before.quaternion, // [0.7071, 0.7071, 0, 0]
//   angularVelocity: pythonData.steps[0].state_before.angular_velocity,
// };

// const physics = new QuadcopterPhysics(initialState, {
//   mass: simParams.mass,
//   inertia: simParams.inertia,
//   gravity: simParams.gravity,
//   dt: simParams.dt,
//   armLength: simParams.arm_length,
//   thrustCoefficient: simParams.thrust_coefficient,
//   torqueCoefficient: simParams.torque_coefficient,
//   maxMotorSpeed: simParams.max_motor_speed,
// });

// let allStepsMatch = true;
// let currentState = initialState;

// // Test all 10 steps
// for (let stepIdx = 0; stepIdx < pythonData.steps.length; stepIdx++) {
//   const pythonStep = pythonData.steps[stepIdx];
//   const action = pythonStep.action;
  
//   console.log(`\n📍 Step ${stepIdx}`);
//   console.log(`Action: [${action.map(a => a.toFixed(4)).join(', ')}]`);
  
//   // Verify initial state
//   const stateArray = physics.getStateArray();
//   if (!compareVectors(stateArray, pythonStep.normalized_state, 1e-10, `Step ${stepIdx} initial state`)) {
//     console.error('Initial state mismatch!');
//     allStepsMatch = false;
//   }
  
//   // Step the simulation
//   const result = physics.step(action, simParams.dt);
  
//   // Compare forces and torques
//   const [throttle, roll, pitch, yaw] = action;
//   const thrustMagnitude = Math.max(0.0, (throttle + 1.0) * simParams.mass * simParams.gravity);
//   const torques = [roll * 0.5, pitch * 0.5, yaw * 0.1];
  
//   if (!compareWithTolerance(thrustMagnitude, pythonStep.forces_torques.thrust_magnitude, 1e-10, 'Thrust magnitude')) {
//     allStepsMatch = false;
//   }
  
//   if (!compareVectors(torques, pythonStep.forces_torques.torques_body, 1e-10, 'Torques')) {
//     allStepsMatch = false;
//   }
  
//   // Compare derivatives
//   if (!compareVectors(result.debug.acceleration, pythonStep.derivatives.acceleration, 1e-8, 'Acceleration')) {
//     allStepsMatch = false;
//   }
  
//   if (!compareVectors(result.debug.angularAcceleration, pythonStep.derivatives.angular_acceleration, 1e-8, 'Angular acceleration')) {
//     allStepsMatch = false;
//   }
  
//   // Compare thrust world
//   if (!compareVectors(result.debug.thrustWorld, pythonStep.forces_torques.thrust_world, 1e-8, 'Thrust world')) {
//     console.log('  Python thrust world:', pythonStep.forces_torques.thrust_world);
//     console.log('  TS thrust world:', result.debug.thrustWorld);
//     allStepsMatch = false;
//   }
  
//   // Compare final state
//   const pythonFinalState = pythonStep.state_after;
  
//   if (!compareVectors(result.position, pythonFinalState.position, 1e-10, 'Position')) {
//     allStepsMatch = false;
//   }
  
//   if (!compareVectors(result.velocity, pythonFinalState.velocity, 1e-10, 'Velocity')) {
//     allStepsMatch = false;
//   }
  
//   if (!compareVectors(result.quaternion, pythonFinalState.quaternion, 1e-10, 'Quaternion')) {
//     allStepsMatch = false;
//   }
  
//   if (!compareVectors(result.angularVelocity, pythonFinalState.angular_velocity, 1e-10, 'Angular velocity')) {
//     allStepsMatch = false;
//   }
  
//   if (allStepsMatch) {
//     console.log('✅ Step matches Python exactly!');
//   } else {
//     console.error(`\n❌ Step ${stepIdx} failed!`);
//     break;
//   }
  
//   // Update current state
//   currentState = {
//     position: result.position,
//     velocity: result.velocity,
//     quaternion: result.quaternion,
//     angularVelocity: result.angularVelocity,
//   };
// }

// // Final summary
// console.log('\n' + '='.repeat(60));
// if (allStepsMatch) {
//   console.log('🎉 SUCCESS! All 10 steps match Python simulation exactly!');
//   console.log('✅ The TypeScript physics implementation is accurate.');
//   console.log('✅ Initial quaternion rotation handled correctly.');
//   console.log('✅ RK4 integration matches Python implementation.');
// } else {
//   console.log('❌ FAILURE! TypeScript simulation does not match Python.');
//   console.log('Please review the error messages above.');
// }