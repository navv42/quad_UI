import { Quaternion as ThreeQuaternion, Euler, Matrix4 } from 'three';

/**
 * Transform quaternion from physics coordinate system to Three.js coordinate system
 * 
 * Physics system: X forward, Y right, Z up
 * Three.js: X right, Y up, Z forward
 * 
 * The transformation swaps Y and Z axes
 */
export function physicsQuaternionToThreeJs(physicsQuat: [number, number, number, number]): ThreeQuaternion {
  const [w, x, y, z] = physicsQuat;
  
  // Create a quaternion in physics space
  const physicsQuaternion = new ThreeQuaternion(x, y, z, w);
  
  // Create rotation matrix to swap Y and Z axes
  // This transforms from physics (X, Y, Z) to Three.js (X, Z, Y)
  const transformMatrix = new Matrix4();
  transformMatrix.set(
    1, 0, 0, 0,  // X stays X
    0, 0, 1, 0,  // Y becomes Z  
    0, 1, 0, 0,  // Z becomes Y
    0, 0, 0, 1
  );
  
  // Apply the coordinate transformation
  // We need to rotate the quaternion to account for the axis swap
  const euler = new Euler();
  euler.setFromQuaternion(physicsQuaternion, 'XYZ');
  
  // Swap Y and Z rotations to match the coordinate swap
  const threeEuler = new Euler(euler.x, euler.z, euler.y, 'XYZ');
  
  const threeQuaternion = new ThreeQuaternion();
  threeQuaternion.setFromEuler(threeEuler);
  
  return threeQuaternion;
}

/**
 * Alternative approach: Direct quaternion component mapping
 * Based on the axis transformation
 */
export function physicsQuaternionToThreeJsSimple(physicsQuat: [number, number, number, number]): ThreeQuaternion {
  const [w, x, y, z] = physicsQuat;
  
  // Based on our position mapping:
  // Physics [x, y, z] -> Three.js [x, z, y]
  
  // TEST DIFFERENT MAPPINGS - Uncomment one at a time:
  
  // Option 1: Original - just swap y and z
  // return new ThreeQuaternion(x, z, y, w);
  
  // Option 2: Negate roll and pitch
  // return new ThreeQuaternion(-x, z, -y, w);
  
  // Option 3: Negate only roll
  // return new ThreeQuaternion(-x, z, y, w);
  
  // Option 4: Negate only pitch  
  // return new ThreeQuaternion(x, z, -y, w);
  
  // Option 5: Full axis remapping (if coordinate systems are rotated)
  // return new ThreeQuaternion(y, z, x, w);
  
  // Option 6: Full axis remapping with negation
  // return new ThreeQuaternion(-y, z, -x, w);
  
  // Option 7: Mirror all rotations
  // return new ThreeQuaternion(-x, -z, -y, w);
  
  // Option 8: Direct physics quaternion (no transformation)
  // return new ThreeQuaternion(x, y, z, w);
  
  // Currently testing Option 2
  return new ThreeQuaternion(-x, z, -y, w);
}

/**
 * Transform quaternion from Three.js coordinate system to physics coordinate system
 * This is the inverse of physicsQuaternionToThreeJsSimple
 * 
 * Three.js: X right, Y up, Z forward
 * Physics system: X forward, Y right, Z up
 */
export function threeJsQuaternionToPhysics(threeQuat: ThreeQuaternion): [number, number, number, number] {
  // Get components from Three.js quaternion
  const w = threeQuat.w;
  const x = threeQuat.x;
  const y = threeQuat.y;
  const z = threeQuat.z;
  
  // Inverse of the transformation in physicsQuaternionToThreeJsSimple
  // If physics->three is: new ThreeQuaternion(-x, z, -y, w)
  // Then three->physics should reverse this mapping
  // three.x = -physics.x  =>  physics.x = -three.x
  // three.y = physics.z   =>  physics.z = three.y
  // three.z = -physics.y  =>  physics.y = -three.z
  
  return [w, -x, -z, y];
}