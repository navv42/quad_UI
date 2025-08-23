import React from 'react';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  // Position controls
  initialX: number;
  initialY: number;
  initialZ: number;
  setInitialX: (value: number) => void;
  setInitialY: (value: number) => void;
  setInitialZ: (value: number) => void;
  
  // Orientation controls
  initialRoll: number;
  initialPitch: number;
  initialYaw: number;
  setInitialRoll: (value: number) => void;
  setInitialPitch: (value: number) => void;
  setInitialYaw: (value: number) => void;
  
  // Simulation controls
  isPlaying: boolean;
  isComputing: boolean;
  trajectory: any[];
  simSpeed: number;
  setSimSpeed: (value: number) => void;
  
  // Actions
  handlePlayPause: () => void;
  handleReset: () => void;
  
  // Display data
  currentState?: any;
  currentAction?: [number, number, number, number];
}

export function ControlPanel({
  initialX, initialY, initialZ,
  setInitialX, setInitialY, setInitialZ,
  initialRoll, initialPitch, initialYaw,
  setInitialRoll, setInitialPitch, setInitialYaw,
  isPlaying, isComputing, trajectory,
  simSpeed, setSimSpeed,
  handlePlayPause, handleReset,
  currentState, currentAction
}: ControlPanelProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Quadcopter Control</h3>
      
      {/* Control hints */}
      <div style={{
        fontSize: '11px',
        color: '#888',
        textAlign: 'center',
        marginBottom: '0px',
        fontStyle: 'italic'
      }}>
        Left-drag to move • Right-drag to rotate
      </div>
      
      {/* Position Controls */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Initial Position</h4>
        
        <div className={styles.control}>
          <label>X (left/right): {initialX.toFixed(2)}</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={initialX}
            onChange={(e) => setInitialX(parseFloat(e.target.value))}
            disabled={isPlaying}
          />
        </div>
        
        <div className={styles.control}>
          <label>Y (forward/back): {initialY.toFixed(2)}</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={initialY}
            onChange={(e) => setInitialY(parseFloat(e.target.value))}
            disabled={isPlaying}
          />
        </div>
        
        <div className={styles.control}>
          <label>Z (up/down): {initialZ.toFixed(2)}</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={initialZ}
            onChange={(e) => setInitialZ(parseFloat(e.target.value))}
            disabled={isPlaying}
          />
        </div>
      </div>
      
      {/* Orientation Controls */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Initial Orientation (degrees)</h4>
        
        <div className={styles.control}>
          <label>Roll: {initialRoll.toFixed(1)}°</label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={initialRoll}
            onChange={(e) => setInitialRoll(parseFloat(e.target.value))}
            disabled={isPlaying}
          />
        </div>
        
        <div className={styles.control}>
          <label>Pitch: {initialPitch.toFixed(1)}°</label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={initialPitch}
            onChange={(e) => setInitialPitch(parseFloat(e.target.value))}
            disabled={isPlaying}
          />
        </div>
        
        <div className={styles.control}>
          <label>Yaw: {initialYaw.toFixed(1)}°</label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={initialYaw}
            onChange={(e) => setInitialYaw(parseFloat(e.target.value))}
            disabled={isPlaying}
          />
        </div>
      </div>
      
      {/* Simulation Controls */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Simulation</h4>
        
        <div className={styles.buttonGroup}>
          <button 
            onClick={handlePlayPause}
            disabled={isComputing}
            className={styles.primaryButton}
          >
            {isComputing ? 'Computing...' : isPlaying ? 'Pause' : 'Play'}
          </button>
          <button 
            onClick={handleReset}
            disabled={isComputing || isPlaying}
          >
            Reset
          </button>
        </div>
        
        

        <div className={styles.control}>
          <label>Speed: {simSpeed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={simSpeed}
            onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
          />
        </div>

      </div>
      

      
      {/* Action Display */}
      {currentAction && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Control Actions</h4>
          <div className={styles.actionBars}>
            <ActionBar label="Throttle" value={currentAction[0]} />
            <ActionBar label="Pitch" value={-currentAction[1]} />
            <ActionBar label="Roll" value={-currentAction[2]} />
            <ActionBar label="Yaw" value={currentAction[3]} />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBar({ label, value }: { label: string; value: number }) {
  // Clamp value to ensure it's within [-1, 1]
  const clampedValue = Math.max(-1, Math.min(1, value));
  
  // Calculate the height of the bar as a percentage of half the container
  // Since the bar goes from center (0) to either top (-1) or bottom (+1)
  const barHeight = Math.abs(clampedValue) * 50; // 0 to 50% of container
  
  const isPositive = clampedValue > 0;
  
  return (
    <div className={styles.actionBar}>
      <span className={styles.actionLabel}>{label}</span>
      <div className={styles.actionBarContainer}>
        <div className={styles.actionBarBackground} />
        <div 
          className={styles.actionBarFill}
          style={{
            height: `${barHeight}%`,
            bottom: isPositive ? '50%' : 'auto',
            top: isPositive ? 'auto' : '50%',
            backgroundColor: isPositive ? '#00ff00' : '#ff6b6b',
          }}
        />
        <div className={styles.actionBarCenter} />
      </div>
    </div>
  );
}