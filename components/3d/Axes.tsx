import React from 'react';

/**
 * 3D axes visualization component
 * Displays X (red), Y (green), and Z (blue) axes with labels
 */
export function Axes() {
  return (
    <>
      {/* X axis - Red (extends from 0 to 2) */}
      <mesh position={[1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
      </mesh>
      <mesh position={[2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* Y axis - Green (up in Three.js, but we show as Z in aviation) */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      
      {/* Z axis - Blue (extends from 0 to 2) */}
      <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
        <meshBasicMaterial color="#0000ff" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 0, 2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
    </>
  );
}