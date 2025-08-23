import React from 'react';
import styles from './ModeToggle.module.css';

interface ModeToggleProps {
  mode: 'single' | 'multi';
  onModeChange: (mode: 'single' | 'multi') => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className={styles.container}>
      <div className={styles.toggle}>
        <button 
          className={`${styles.button} ${mode === 'single' ? styles.active : ''}`}
          onClick={() => onModeChange('single')}
        >
          Single Quadcopter
        </button>
        <button 
          className={`${styles.button} ${mode === 'multi' ? styles.active : ''}`}
          onClick={() => onModeChange('multi')}
        >
          Multi Quadcopter
        </button>
      </div>
    </div>
  );
}