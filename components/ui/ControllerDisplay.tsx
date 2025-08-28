import React from 'react';
import styles from './ControllerDisplay.module.css';

interface ControllerDisplayProps {
  throttle: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export function ControllerDisplay({ throttle, yaw, pitch, roll }: ControllerDisplayProps) {
  // Calculate line from center to action position
  // Convert from [-1, 1] to pixels (32.5px max from center in 65px well)
  const leftX = yaw * 32.5;
  const leftY = -throttle * 32.5; // Negative because Y is inverted in CSS
  
  const rightX = roll * 32.5;
  const rightY = -pitch * 32.5;
  
  
  return (
    <div className={styles.controllerWrapper}>
    <div className={styles.controllerBody}>
      {/* Simple antenna */}
      <div className={styles.antenna} />
      
      {/* Top section with joysticks */}
      <div className={styles.topSection}>
        {/* Left stick */}
        <div className={styles.stickSection}>
          <div className={styles.stickWell}>
            {/* Grid lines */}
            <div className={styles.gridLineH} />
            <div className={styles.gridLineV} />
            
            {/* Tip indicator at action position with line as child */}
            <div 
              className={styles.joystickTip}
              style={{
                transform: `translate(${leftX}px, ${leftY}px)`,
              }}
            >
            </div>
          </div>
        </div>
        
        {/* Center controls */}
        {/* <div className={styles.centerControls}> */}
          {/* Top toggle switches */}
          {/* <div className={styles.switchRow}>
            <div className={styles.toggleSwitch}>
              <div className={styles.switchHandle} />
            </div>
            <div className={styles.toggleSwitch}>
              <div className={styles.switchHandle} style={{ left: '14px' }} />
            </div>
          </div> */}
          
          {/* Small display screen */}
          {/* <div className={styles.miniScreen} /> */}
        {/* </div> */}
        
        {/* Right stick */}
        <div className={styles.stickSection}>
          <div className={styles.stickWell}>
            {/* Grid lines */}
            <div className={styles.gridLineH} />
            <div className={styles.gridLineV} />
            
            {/* Tip indicator at action position with line as child */}
            <div 
              className={styles.joystickTip}
              style={{
                transform: `translate(${rightX}px, ${rightY}px)`,
              }}
            >
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom section with buttons */}
      {/* <div className={styles.bottomSection}> */}
        {/* Left buttons */}
        {/* <div className={styles.buttonGroup}>
          <div className={styles.roundButton} />
          <div className={styles.roundButton} />
        </div> */}
        
        {/* Center buttons */}
        {/* <div className={styles.centerButtons}>
          <div className={styles.squareButton} />
          <div className={styles.squareButton} />
          <div className={styles.squareButton} />
        </div> */}
        
        {/* Right buttons */}
        {/* <div className={styles.buttonGroup}>
          <div className={styles.roundButton} />
          <div className={styles.roundButton} />
        </div>
      </div> */}
      
      {/* AI Controller Label */}
      <div style={{
        position: 'absolute',
        bottom: '35px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#00ff88',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
        whiteSpace: 'nowrap',
      }}>
        AI Controller
      </div>
    </div>
    </div>
  );
}