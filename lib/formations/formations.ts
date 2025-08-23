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
 * Grid Formation - square-like grid arrangement
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
    const position = new THREE.Vector3(
      startX + col * spacing,
      0.5,
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
 * Star Formation - star pattern
 */
export function generateStarFormation(numQuads: number, outerRadius = 0.8, innerRadius = 0.3): Formation[] {
  const formation: Formation[] = [];
  
  if (numQuads === 1) {
    formation.push({ 
      position: new THREE.Vector3(0, 0.5, 0), 
      orientation: new THREE.Quaternion() 
    });
    return formation;
  }

  const angleStep = (2 * Math.PI) / numQuads;
  
  for (let i = 0; i < numQuads; i++) {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    
    const position = new THREE.Vector3(x, 0.5, z);
    
    // Face outward from center
    const facingAngle = angle;
    const orientation = eulerToQuaternion(0, facingAngle, 0);
    
    formation.push({ position, orientation });
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
  const startX = -Math.min(wavelength / 2, 0.9);
  
  for (let i = 0; i < numQuads; i++) {
    const x = Math.min(Math.max(startX + i * spacing, -0.9), 0.9);
    const phase = (i / Math.max(numQuads - 1, 1)) * 2 * Math.PI;
    const y = Math.min(Math.max(0 + amplitude * Math.sin(phase), -0.9), 0.9);
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
 * Cube Formation - 3D cube vertices
 */
export function generateCubeFormation(numQuads: number, size = 0.5): Formation[] {
  const formation: Formation[] = [];
  
  // Cube vertices - already within [-0.5, 0.5] range
  const vertices = [
    new THREE.Vector3(-size, -size, -size),
    new THREE.Vector3(size, -size, -size),
    new THREE.Vector3(size, size, -size),
    new THREE.Vector3(-size, size, -size),
    new THREE.Vector3(-size, -size, size),
    new THREE.Vector3(size, -size, size),
    new THREE.Vector3(size, size, size),
    new THREE.Vector3(-size, size, size),
  ];
  
  // No offset needed, already centered
  
  // Distribute quads among vertices
  for (let i = 0; i < numQuads && i < vertices.length; i++) {
    // Face outward from cube center
    const direction = vertices[i].clone().sub(new THREE.Vector3(0, 0, 0)).normalize();
    const facingAngle = Math.atan2(direction.x, direction.z);
    const tilt = Math.asin(-direction.y);
    
    formation.push({ 
      position: vertices[i], 
      orientation: eulerToQuaternion(0, facingAngle, tilt)
    });
  }
  
  // If more quads than vertices, place extras on edges
  if (numQuads > 8) {
    const extraQuads = numQuads - 8;
    for (let i = 0; i < extraQuads && i < 4; i++) {
      const t = 0.5;
      const edgePos = new THREE.Vector3().lerpVectors(vertices[i], vertices[(i + 1) % 4], t);
      formation.push({
        position: edgePos,
        orientation: new THREE.Quaternion()
      });
    }
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

// List of all formation generators
const formationGenerators = [
  generateCircleFormation,
  generateCircleLookingDownFormation,
  generateLineFormation,
  generateGridFormation,
  generateVFormation,
  generateSpiralFormation,
  generateDiamondFormation,
  generateStarFormation,
  generateHelixFormation,
  generateWaveFormation,
  generateCubeFormation,
  generateSphereFormation,
  generateDiagonalCascadeFormation,
  generateFigureEightFormation,
  generateRandomChaosFormation,
];

/**
 * Get a random formation for the given number of quadcopters
 */
export function getRandomFormation(numQuads: number): Formation[] {
  const randomIndex = Math.floor(Math.random() * formationGenerators.length);
  const generator = formationGenerators[randomIndex];
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
    case 'star':
      return generateStarFormation(numQuads);
    case 'helix':
      return generateHelixFormation(numQuads);
    case 'wave':
      return generateWaveFormation(numQuads);
    case 'cube':
      return generateCubeFormation(numQuads);
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
    default:
      return getRandomFormation(numQuads);
  }
}