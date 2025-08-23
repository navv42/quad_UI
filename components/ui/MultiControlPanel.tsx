import React from 'react';
import styles from './MultiControlPanel.module.css';

interface MultiControlPanelProps {
  // Quadcopter count control
  quadcopterCount: number;
  setQuadcopterCount: (count: number) => void;
  
  // Simulation controls
  isPlaying: boolean;
  isComputing: boolean;
  simSpeed: number;
  setSimSpeed: (value: number) => void;
  
  // Actions
  handlePlayPause: () => void;
  handleReset: () => void;
  handleRandomize: () => void;
  handleFormation: () => void;
  
  // Display data
  isPausedMidSimulation?: boolean;
}

export function MultiControlPanel({
  quadcopterCount,
  setQuadcopterCount,
  isPlaying,
  isComputing,
  simSpeed,
  setSimSpeed,
  handlePlayPause,
  handleReset,
  handleRandomize,
  handleFormation,
  isPausedMidSimulation
}: MultiControlPanelProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Multi-Quadcopter Control</h3>
      
      {/* Quadcopter Count Control */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Fleet Configuration</h4>
        
        <div className={styles.control}>
          <label>Number of Quadcopters: {quadcopterCount}</label>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={quadcopterCount}
            onChange={(e) => setQuadcopterCount(parseInt(e.target.value))}
            disabled={isPlaying}
          />
        </div>
        <div className={styles.section}>
          <h1 className={styles.sectionTitle}>Initial State</h1>
          
          <button 
            onClick={handleRandomize}
            disabled={isPlaying || isComputing}
            className={styles.randomizeButton}
          >
            Random
          </button>
          
          <button 
            onClick={handleFormation}
            disabled={isPlaying || isComputing}
            className={styles.formationButton}
          >
            Random Pattern
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
            {isComputing ? 'Computing...' : isPlaying ? 'Pause' : (isPausedMidSimulation ? 'Resume' : 'Play')}
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
      
      {/* Quadcopter Status Display */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Fleet Status</h4>
        <div className={styles.statusGrid}>
          {Array.from({ length: quadcopterCount }, (_, i) => (
            <div key={i} className={styles.statusItem}>
              <div 
                className={styles.statusIndicator}
                style={{ backgroundColor: getQuadcopterColor(i) }}
              />
              <span>Quad {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to get unique colors for each quadcopter
function getQuadcopterColor(index: number): string {
  const colors = [
    '#00ff88', // Green
    '#ff6b6b', // Red
    '#4dabf7', // Blue
    '#ffd43b', // Yellow
    '#c084fc', // Purple
    '#fb7185', // Pink
    '#fb923c', // Orange
    '#86efac', // Light green
    '#67e8f9', // Cyan
    '#a78bfa', // Violet
  ];
  return colors[index % colors.length];
}

export { getQuadcopterColor };