import * as THREE from 'three';

export interface Formation {
  position: THREE.Vector3;
  orientation: THREE.Quaternion;
}

/**
 * Converts Euler angles (in radians) to a THREE.Quaternion.
 * Matches the coordinate system used in MultiMode.tsx
 * @param {number} roll - Rotation around the X-axis (tilt left/right)
 * @param {number} pitch - Rotation around the Y-axis (turn left/right) 
 * @param {number} yaw - Rotation around the Z-axis (tilt forward/back)
 * @returns {THREE.Quaternion}
 */
function eulerToQuaternion(roll: number, pitch: number, yaw: number): THREE.Quaternion {
  // Match the Euler order from MultiMode: new Euler(pitch, yaw, roll, 'YXZ')
  const euler = new THREE.Euler(pitch, yaw, roll, 'YXZ');
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return quaternion;
}

/**
 * Circle Formation - quadcopters in a circle, pitched toward center
 */
export function generateCircleFormation(numQuads: number, radius = 0.6, height = 0.5): Formation[] {
  const formation: Formation[] = [];
  const angleStep = (2 * Math.PI) / numQuads;

  for (let i = 0; i < numQuads; i++) {
    const angle = i * angleStep;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    const position = new THREE.Vector3(x, height, z);

    // Face toward center: rotate around Y axis
    const facingAngle = angle + Math.PI;
    // Tilt forward slightly: rotate around Z axis
    const tiltForward = THREE.MathUtils.degToRad(15);
    const orientation = eulerToQuaternion(0, facingAngle, tiltForward);

    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * Circle Looking Down Formation - quadcopters in a circle at height, looking down at center
 */
export function generateCircleLookingDownFormation(numQuads: number, radius = 0.6, height = 0.8): Formation[] {
  const formation: Formation[] = [];
  const angleStep = (2 * Math.PI) / numQuads;

  for (let i = 0; i < numQuads; i++) {
    const angle = i * angleStep;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    const position = new THREE.Vector3(x, height, z);

    // Face toward center: rotate around Y axis
    const facingAngle = angle + Math.PI;
    
    // Calculate tilt to look down at center (0, 0, 0)
    const distanceToCenter = Math.sqrt(x * x + z * z);
    const tiltDown = -Math.atan2(height, distanceToCenter);
    
    const orientation = eulerToQuaternion(0, facingAngle, tiltDown);

    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * Line Formation - simple line of quadcopters
 */
export function generateLineFormation(numQuads: number, spacing = 0.3): Formation[] {
  const formation: Formation[] = [];
  const totalWidth = Math.min((numQuads - 1) * spacing, 1.8); // Keep within bounds
  spacing = totalWidth / Math.max(numQuads - 1, 1);
  const startX = -totalWidth / 2;

  const orientation = new THREE.Quaternion();

  for (let i = 0; i < numQuads; i++) {
    const position = new THREE.Vector3(startX + i * spacing, 0.5, 0);
    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * Grid Formation - square-like grid arrangement with random Y variation
 */
export function generateGridFormation(numQuads: number, spacing = 0.4): Formation[] {
  const formation: Formation[] = [];
  const cols = Math.ceil(Math.sqrt(numQuads));
  const rows = Math.ceil(numQuads / cols);

  // Adjust spacing to fit within bounds
  const maxDimension = 1.8;
  spacing = Math.min(spacing, maxDimension / Math.max(cols - 1, rows - 1, 1));
  
  const totalWidth = (cols - 1) * spacing;
  const totalDepth = (rows - 1) * spacing;
  const startX = -totalWidth / 2;
  const startZ = -totalDepth / 2;

  const orientation = new THREE.Quaternion();

  for (let i = 0; i < numQuads; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Randomize Y position between -0.5 and 0.8
    const y = -0.5 + Math.random() * 1.3;
    const position = new THREE.Vector3(
      startX + col * spacing,
      y,
      startZ + row * spacing
    );
    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * V Formation - classic flying V
 */
export function generateVFormation(numQuads: number, spacing = 0.3): Formation[] {
  const formation: Formation[] = [];
  const orientation = new THREE.Quaternion();

  // Adjust spacing to fit within bounds
  const maxRanks = Math.ceil((numQuads - 1) / 2);
  spacing = Math.min(spacing, 1.8 / (maxRanks * 0.7 + 0.5));

  // Leader at the front
  formation.push({ position: new THREE.Vector3(0, 0.5, 0.5), orientation });

  for (let i = 1; i < numQuads; i++) {
    const side = i % 2 === 1 ? 1 : -1;
    const rank = Math.ceil(i / 2);
    const position = new THREE.Vector3(
      Math.min(Math.max(side * rank * spacing * 0.7, -0.9), 0.9),
      0.5,
      Math.min(Math.max(0.5 - rank * spacing, -0.9), 0.9)
    );
    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * Spiral Formation - ascending spiral
 */
export function generateSpiralFormation(numQuads: number, radius = 0.6, heightStep = 0.12): Formation[] {
  const formation: Formation[] = [];
  const angleStep = (2 * Math.PI) / 4; // Quarter turn per quad
  
  // Adjust height step to fit within bounds
  heightStep = Math.min(heightStep, 1.4 / numQuads);
  
  for (let i = 0; i < numQuads; i++) {
    const angle = i * angleStep;
    const currentRadius = radius * (1 - i * 0.03); // Slightly decreasing radius
    const x = Math.min(Math.max(currentRadius * Math.cos(angle), -0.9), 0.9);
    const z = Math.min(Math.max(currentRadius * Math.sin(angle), -0.9), 0.9);
    const y = Math.min(Math.max(-0.2 + i * heightStep, -0.9), 0.9);

    const position = new THREE.Vector3(x, y, z);
    
    // Face along the spiral path
    const facingAngle = angle + Math.PI / 2;
    // Slight banking into the turn
    const roll = THREE.MathUtils.degToRad(10) * Math.sin(angle);
    const orientation = eulerToQuaternion(roll, facingAngle, 0);

    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * Diamond Formation - diamond shape
 */
export function generateDiamondFormation(numQuads: number, size = 0.5): Formation[] {
  const formation: Formation[] = [];
  const orientation = new THREE.Quaternion();
  
  if (numQuads === 1) {
    formation.push({ position: new THREE.Vector3(0, 0.5, 0), orientation });
    return formation;
  }

  // Distribute quads along diamond edges
  const positions: THREE.Vector3[] = [];
  
  // Diamond points
  const top = new THREE.Vector3(0, 0.5 + size, 0);
  const right = new THREE.Vector3(size, 0.5, 0);
  const bottom = new THREE.Vector3(0, 0.5 - size, 0);
  const left = new THREE.Vector3(-size, 0.5, 0);
  
  if (numQuads <= 4) {
    positions.push(top, right, bottom, left);
  } else {
    // Distribute along edges
    const edgeQuads = Math.floor(numQuads / 4);
    const remainder = numQuads % 4;
    
    // Top to right edge
    for (let i = 0; i <= edgeQuads; i++) {
      const t = i / edgeQuads;
      positions.push(new THREE.Vector3().lerpVectors(top, right, t));
    }
    // Right to bottom edge
    for (let i = 1; i <= edgeQuads; i++) {
      const t = i / edgeQuads;
      positions.push(new THREE.Vector3().lerpVectors(right, bottom, t));
    }
    // Bottom to left edge
    for (let i = 1; i <= edgeQuads; i++) {
      const t = i / edgeQuads;
      positions.push(new THREE.Vector3().lerpVectors(bottom, left, t));
    }
    // Left to top edge
    for (let i = 1; i < edgeQuads + (remainder > 0 ? 1 : 0); i++) {
      const t = i / edgeQuads;
      positions.push(new THREE.Vector3().lerpVectors(left, top, t));
    }
  }
  
  for (let i = 0; i < numQuads && i < positions.length; i++) {
    formation.push({ position: positions[i], orientation });
  }
  
  return formation;
}


/**
 * Helix Formation - double helix
 */
export function generateHelixFormation(numQuads: number, radius = 0.4, height = 1.2): Formation[] {
  const formation: Formation[] = [];
  const quadsPerHelix = Math.ceil(numQuads / 2);
  const angleStep = (2 * Math.PI) / 3; // 120 degrees per step
  const heightStep = Math.min(height / quadsPerHelix, 1.6 / numQuads);
  
  for (let i = 0; i < numQuads; i++) {
    const helixIndex = i % 2;
    const stepIndex = Math.floor(i / 2);
    const angle = stepIndex * angleStep + (helixIndex * Math.PI); // 180 degree offset for second helix
    
    const x = Math.min(Math.max(radius * Math.cos(angle), -0.9), 0.9);
    const z = Math.min(Math.max(radius * Math.sin(angle), -0.9), 0.9);
    const y = Math.min(Math.max(-0.5 + stepIndex * heightStep, -0.9), 0.9);
    
    const position = new THREE.Vector3(x, y, z);
    
    // Face along the helix path
    const facingAngle = angle + Math.PI / 2;
    // Tilt slightly upward
    const tiltUp = THREE.MathUtils.degToRad(10);
    const orientation = eulerToQuaternion(0, facingAngle, tiltUp);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Wave Formation - sine wave pattern
 */
export function generateWaveFormation(numQuads: number, wavelength = 1.6, amplitude = 0.3): Formation[] {
  const formation: Formation[] = [];
  const spacing = wavelength / Math.max(numQuads - 1, 1);
  const startX = -Math.min(wavelength / 2, 1.0);
  
  for (let i = 0; i < numQuads; i++) {
    const x = Math.min(Math.max(startX + i * spacing, -1.0), 1.0);
    const phase = (i / Math.max(numQuads - 1, 1)) * 2 * Math.PI;
    const y = Math.min(Math.max(0 + amplitude * Math.sin(phase), -1.0), 1.0);
    const z = 0;
    
    const position = new THREE.Vector3(x, y, z);
    
    // Tilt based on wave slope
    const slope = amplitude * Math.cos(phase) * (2 * Math.PI / wavelength);
    const tilt = Math.atan(slope);
    const orientation = eulerToQuaternion(0, 0, tilt);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}


/**
 * Sphere Surface Formation - distribute quads on surface of sphere
 */
export function generateSphereFormation(numQuads: number, radius = 0.8): Formation[] {
  const formation: Formation[] = [];
  
  // Use golden angle for better distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  
  for (let i = 0; i < numQuads; i++) {
    // Use spiral points on sphere for even distribution
    const y = 1 - (i / (numQuads - 1)) * 2; // -1 to 1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    
    const x = Math.cos(theta) * radiusAtY * radius;
    const z = Math.sin(theta) * radiusAtY * radius;
    const scaledY = y * radius;
    
    const position = new THREE.Vector3(x, scaledY, z);
    
    // Face outward from center of sphere
    const facingAngle = Math.atan2(x, z);
    const tiltAngle = Math.asin(scaledY / radius);
    
    const orientation = eulerToQuaternion(0, facingAngle, tiltAngle);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Diagonal Cascade Formation - quads arranged diagonally corner to corner
 */
export function generateDiagonalCascadeFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  
  for (let i = 0; i < numQuads; i++) {
    const t = i / Math.max(numQuads - 1, 1);
    
    // Diagonal from (-1, -1, -1) to (1, 1, 1)
    const x = -0.9 + t * 1.8;
    const y = -0.9 + t * 1.8;
    const z = -0.9 + t * 1.8;
    
    const position = new THREE.Vector3(x, y, z);
    
    // Rotate each quad differently based on position
    const roll = t * Math.PI * 2; // Full rotation across the diagonal
    const facingAngle = t * Math.PI; // Half rotation in yaw
    const tilt = Math.sin(t * Math.PI * 2) * THREE.MathUtils.degToRad(30);
    
    const orientation = eulerToQuaternion(roll, facingAngle, tilt);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Figure Eight Formation - horizontal figure 8 pattern
 */
export function generateFigureEightFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  const scale = 0.7;
  
  for (let i = 0; i < numQuads; i++) {
    const t = (i / numQuads) * 2 * Math.PI;
    
    // Parametric equation for figure 8 (lemniscate)
    const x = scale * Math.sin(t);
    const z = scale * Math.sin(t) * Math.cos(t);
    // Vary height to create 3D effect
    const y = Math.sin(t * 2) * 0.5;
    
    const position = new THREE.Vector3(x, y, z);
    
    // Calculate tangent direction for orientation
    const dt = 0.01;
    const nextT = t + dt;
    const nextX = scale * Math.sin(nextT);
    const nextZ = scale * Math.sin(nextT) * Math.cos(nextT);
    
    const facingAngle = Math.atan2(nextX - x, nextZ - z);
    // Bank into the curve
    const roll = THREE.MathUtils.degToRad(20) * Math.sin(t * 2);
    
    const orientation = eulerToQuaternion(roll, facingAngle, 0);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Random Chaos Formation - completely random positions and orientations
 */
export function generateRandomChaosFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  
  for (let i = 0; i < numQuads; i++) {
    // Random position within bounds
    const x = (Math.random() * 2 - 1) * 0.9;
    const y = (Math.random() * 2 - 1) * 0.9;
    const z = (Math.random() * 2 - 1) * 0.9;
    
    const position = new THREE.Vector3(x, y, z);
    
    // Random orientation
    const roll = (Math.random() * 2 - 1) * Math.PI;
    const facingAngle = Math.random() * 2 * Math.PI;
    const tilt = (Math.random() * 2 - 1) * Math.PI / 2;
    
    const orientation = eulerToQuaternion(roll, facingAngle, tilt);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Upside Down Grid - flat grid with all quadcopters inverted
 */
export function generateUpsideDownGridFormation(numQuads: number, spacing = 0.4): Formation[] {
  const formation: Formation[] = [];
  const cols = Math.ceil(Math.sqrt(numQuads));
  const rows = Math.ceil(numQuads / cols);

  // Adjust spacing to fit within bounds
  const maxDimension = 1.8;
  spacing = Math.min(spacing, maxDimension / Math.max(cols - 1, rows - 1, 1));
  
  const totalWidth = (cols - 1) * spacing;
  const totalDepth = (rows - 1) * spacing;
  const startX = -totalWidth / 2;
  const startZ = -totalDepth / 2;

  // Upside down orientation (roll = PI)
  const orientation = eulerToQuaternion(0, Math.PI, 0);
  const z = Math.random()
  for (let i = 0; i < numQuads; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const position = new THREE.Vector3(
      startX + col * spacing,
      startZ + row * spacing,
      z
    );
    formation.push({ position, orientation });
  }
  return formation;
}

/**
 * Corner Convergence - all quads at extreme corners pointing to center
 */
export function generateCornerConvergenceFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  
  // 8 corners of the bounding cube
  const corners = [
    new THREE.Vector3(-1, -1, -1),
    new THREE.Vector3(1, -1, -1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(1, 1, -1),
    new THREE.Vector3(-1, -1, 1),
    new THREE.Vector3(1, -1, 1),
    new THREE.Vector3(-1, 1, 1),
    new THREE.Vector3(1, 1, 1),
  ];
  
  for (let i = 0; i < numQuads; i++) {
    // Distribute quads among corners, with some variation
    const cornerIndex = i % 8;
    const corner = corners[cornerIndex].clone();
    
    // Add small random offset to prevent exact overlap when many quads
    const offset = 0.1;
    corner.x += (Math.random() - 0.5) * offset;
    corner.y += (Math.random() - 0.5) * offset;
    corner.z += (Math.random() - 0.5) * offset;
    
    // Clamp to bounds
    corner.x = Math.max(-1, Math.min(1, corner.x));
    corner.y = Math.max(-1, Math.min(1, corner.y));
    corner.z = Math.max(-1, Math.min(1, corner.z));
    
    // Point toward center
    const toCenter = new THREE.Vector3(0, 0, 0).sub(corner).normalize();
    const facingAngle = Math.atan2(toCenter.x, toCenter.z);
    const tilt = Math.asin(-toCenter.y);
    
    formation.push({
      position: corner,
      orientation: eulerToQuaternion(0, facingAngle, tilt)
    });
  }
  
  return formation;
}

/**
 * Vortex Formation - spiral tornado from bottom to top
 */
export function generateVortexFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  const rotations = 3; // Number of full rotations
  
  for (let i = 0; i < numQuads; i++) {
    const t = i / Math.max(numQuads - 1, 1);
    
    // Spiral parameters
    const angle = t * rotations * 2 * Math.PI;
    // Radius decreases as we go up
    const radius = (1 - t * 0.8) * 0.9;
    
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    // Height from bottom to top
    const y = -1 + t * 2;
    
    const position = new THREE.Vector3(x, y, z);
    
    // Tilt outward and spin
    const facingAngle = angle + Math.PI / 2;
    const tilt = THREE.MathUtils.degToRad(30) * (1 - t); // Less tilt at top
    const roll = t * Math.PI; // Rolling as they rise
    
    const orientation = eulerToQuaternion(roll, facingAngle, tilt);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Wall Formation - vertical wall at maximum Z position
 */
export function generateWallFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  const cols = Math.ceil(Math.sqrt(numQuads));
  const rows = Math.ceil(numQuads / cols);
  
  const spacingX = 1.8 / Math.max(cols - 1, 1);
  const spacingY = 1.8 / Math.max(rows - 1, 1);
  
  for (let i = 0; i < numQuads; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = -0.9 + col * spacingX;
    const y = -0.9 + row * spacingY;
    const z = 1.0; // Maximum Z position
    
    const position = new THREE.Vector3(x, y, z);
    
    // Face forward (away from wall)
    const orientation = eulerToQuaternion(0, 0, 0);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Infinity Symbol - horizontal infinity pattern
 */
export function generateInfinityFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  const scale = 0.8;
  
  for (let i = 0; i < numQuads; i++) {
    const t = (i / numQuads) * 2 * Math.PI;
    
    // Parametric equation for infinity symbol (lemniscate)
    const denominator = 1 + Math.sin(t) * Math.sin(t);
    const x = scale * Math.cos(t) / denominator;
    const z = scale * Math.sin(t) * Math.cos(t) / denominator;
    // Add vertical variation
    const y = Math.sin(t * 3) * 0.3;
    
    const position = new THREE.Vector3(x, y, z);
    
    // Calculate tangent for orientation
    const dt = 0.01;
    const nextT = t + dt;
    const nextDenom = 1 + Math.sin(nextT) * Math.sin(nextT);
    const nextX = scale * Math.cos(nextT) / nextDenom;
    const nextZ = scale * Math.sin(nextT) * Math.cos(nextT) / nextDenom;
    
    const facingAngle = Math.atan2(nextX - x, nextZ - z);
    // Bank into curves
    const roll = THREE.MathUtils.degToRad(25) * Math.sin(t * 2);
    
    const orientation = eulerToQuaternion(roll, facingAngle, 0);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * DNA Helix - double helix with crosslinks
 */
export function generateDNAHelixFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  const rotations = 2.5;
  const radius = 0.6;
  const height = 1.6;
  
  for (let i = 0; i < numQuads; i++) {
    const t = i / Math.max(numQuads - 1, 1);
    const angle = t * rotations * 2 * Math.PI;
    
    // Alternate between two strands and crosslinks
    const strandPattern = i % 3;
    
    let x, y, z;
    let orientation;
    
    if (strandPattern < 2) {
      // Main strands
      const strandOffset = strandPattern * Math.PI; // 180 degree offset for second strand
      x = radius * Math.cos(angle + strandOffset);
      z = radius * Math.sin(angle + strandOffset);
      y = -0.8 + t * height;
      
      // Face along the helix
      const facingAngle = angle + strandOffset + Math.PI / 2;
      orientation = eulerToQuaternion(0, facingAngle, THREE.MathUtils.degToRad(15));
    } else {
      // Crosslinks between strands
      const linkT = Math.floor(i / 3) / Math.max(Math.floor(numQuads / 3), 1);
      const linkAngle = linkT * rotations * 2 * Math.PI;
      
      // Position between the two strands
      x = 0;
      z = 0;
      y = -0.8 + linkT * height;
      
      // Rotate to connect strands
      orientation = eulerToQuaternion(0, linkAngle, 0);
    }
    
    const position = new THREE.Vector3(x, y, z);
    formation.push({ position, orientation });
  }
  
  return formation;
}

/**
 * Expanding Sphere - quads start at center and expand outward
 */
export function generateExpandingSphereFormation(numQuads: number): Formation[] {
  const formation: Formation[] = [];
  
  // Use golden angle for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  
  for (let i = 0; i < numQuads; i++) {
    const t = i / Math.max(numQuads - 1, 1);
    
    // Fibonacci sphere points
    const y = 1 - (i / (numQuads - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    
    // Vary radius based on index (expanding effect)
    const radius = 0.2 + t * 0.8;
    
    const x = Math.cos(theta) * radiusAtY * radius;
    const z = Math.sin(theta) * radiusAtY * radius;
    const scaledY = y * radius;
    
    const position = new THREE.Vector3(x, scaledY, z);
    
    // Face outward with some spin
    const facingAngle = Math.atan2(x, z);
    const tiltAngle = Math.asin(scaledY / radius);
    const roll = t * Math.PI * 2; // Spinning as they expand
    
    const orientation = eulerToQuaternion(roll, facingAngle, tiltAngle);
    
    formation.push({ position, orientation });
  }
  
  return formation;
}

// List of all formation generators
const formationGenerators = [
  generateCircleFormation,
  generateCircleLookingDownFormation,
  generateLineFormation,
  generateGridFormation,
  generateVFormation,
  generateSpiralFormation,
  generateDiamondFormation,
  generateHelixFormation,
  generateWaveFormation,
  generateSphereFormation,
  generateDiagonalCascadeFormation,
  generateFigureEightFormation,
  generateRandomChaosFormation,
  generateUpsideDownGridFormation,
  generateCornerConvergenceFormation,
  generateVortexFormation,
  generateWallFormation,
  generateInfinityFormation,
  generateDNAHelixFormation,
  generateExpandingSphereFormation,
];

/**
 * Get a random formation for the given number of quadcopters
 */
export function getRandomFormation(numQuads: number): Formation[] {
  const randomIndex = Math.floor(Math.random() * formationGenerators.length);
  const generator = formationGenerators[randomIndex];
  // const generator = formationGenerators[13];
  console.log(generator.toString())
  return generator(numQuads);
}

/**
 * Get formation by name
 */
export function getFormationByName(name: string, numQuads: number): Formation[] {
  
  switch (name.toLowerCase()) {
    case 'circle':
      return generateCircleFormation(numQuads);
    case 'circlelookingdown':
    case 'circle-looking-down':
      return generateCircleLookingDownFormation(numQuads);
    case 'line':
      return generateLineFormation(numQuads);
    case 'grid':
      return generateGridFormation(numQuads);
    case 'v':
      return generateVFormation(numQuads);
    case 'spiral':
      return generateSpiralFormation(numQuads);
    case 'diamond':
      return generateDiamondFormation(numQuads);
    case 'helix':
      return generateHelixFormation(numQuads);
    case 'wave':
      return generateWaveFormation(numQuads);
    case 'sphere':
      return generateSphereFormation(numQuads);
    case 'diagonal':
    case 'cascade':
      return generateDiagonalCascadeFormation(numQuads);
    case 'figure8':
    case 'figureeight':
      return generateFigureEightFormation(numQuads);
    case 'chaos':
    case 'random':
      return generateRandomChaosFormation(numQuads);
    case 'upsidedown':
    case 'upside-down':
      return generateUpsideDownGridFormation(numQuads);
    case 'corner':
    case 'corners':
      return generateCornerConvergenceFormation(numQuads);
    case 'vortex':
    case 'tornado':
      return generateVortexFormation(numQuads);
    case 'wall':
      return generateWallFormation(numQuads);
    case 'infinity':
      return generateInfinityFormation(numQuads);
    case 'dna':
    case 'dnahelix':
      return generateDNAHelixFormation(numQuads);
    case 'expanding':
    case 'expandingsphere':
      return generateExpandingSphereFormation(numQuads);
    default:
      return getRandomFormation(numQuads);
  }
}