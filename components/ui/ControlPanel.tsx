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
  stepMode: boolean;
  setStepMode: (value: boolean) => void;
  currentStep: number;
  controlMode: 'translate' | 'rotate';
  setControlMode: (mode: 'translate' | 'rotate') => void;
  simSpeed: number;
  setSimSpeed: (value: number) => void;
  
  // Actions
  handlePlayPause: () => void;
  handleReset: () => void;
  handlePrevStep: () => void;
  handleNextStep: () => void;
  
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
  stepMode, setStepMode,
  currentStep, controlMode, setControlMode,
  simSpeed, setSimSpeed,
  handlePlayPause, handleReset,
  handlePrevStep, handleNextStep,
  currentState, currentAction
}: ControlPanelProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Quadcopter Control</h3>
      
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
      
      {/* Interaction Mode */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Interaction Mode</h4>
        <div className={styles.buttonGroup}>
          <button
            onClick={() => setControlMode('translate')}
            className={controlMode === 'translate' ? styles.active : ''}
            disabled={isPlaying}
          >
            Move
          </button>
          <button
            onClick={() => setControlMode('rotate')}
            className={controlMode === 'rotate' ? styles.active : ''}
            disabled={isPlaying}
          >
            Rotate
          </button>
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
          <label>
            <input
              type="checkbox"
              checked={stepMode}
              onChange={(e) => setStepMode(e.target.checked)}
              disabled={isPlaying}
            />
            Enable Step-by-Step
          </label>
        </div>
        
        {stepMode && trajectory.length > 0 && (
          <div className={styles.stepControls}>
            <button onClick={handlePrevStep} disabled={currentStep === 0}>
              Previous
            </button>
            <span className={styles.stepInfo}>
              Step {currentStep + 1} / {trajectory.length}
            </span>
            <button 
              onClick={handleNextStep} 
              disabled={currentStep >= trajectory.length - 1}
            >
              Next
            </button>
          </div>
        )}
        
        {!stepMode && (
          <div className={styles.control}>
            <label>Speed: {simSpeed.toFixed(1)}x</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={simSpeed}
              onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
            />
          </div>
        )}
      </div>
      
      {/* State Display for Step Mode */}
      {stepMode && currentState && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Current State</h4>
          <div className={styles.stateDisplay}>
            <div>Step: {currentState.step}</div>
            <div>Time: {currentState.timestamp}s</div>
            <details className={styles.details}>
              <summary>Position</summary>
              <pre>{JSON.stringify(currentState.position, null, 2)}</pre>
            </details>
            <details className={styles.details}>
              <summary>Velocity</summary>
              <pre>{JSON.stringify(currentState.velocity, null, 2)}</pre>
            </details>
            <details className={styles.details}>
              <summary>Quaternion</summary>
              <pre>{JSON.stringify(currentState.quaternion, null, 2)}</pre>
            </details>
            <details className={styles.details}>
              <summary>Angular Velocity</summary>
              <pre>{JSON.stringify(currentState.angularVelocity, null, 2)}</pre>
            </details>
            <details className={styles.details}>
              <summary>Action</summary>
              <pre>{JSON.stringify(currentState.action, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
      
      {/* Action Display */}
      {currentAction && !stepMode && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Control Actions</h4>
          <div className={styles.actionBars}>
            <ActionBar label="Throttle" value={currentAction[0]} />
            <ActionBar label="Roll" value={currentAction[1]} />
            <ActionBar label="Pitch" value={currentAction[2]} />
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