# Quadcopter Simulation

A real-time 3D quadcopter simulation with AI-powered control using Next.js, Three.js, and ONNX Runtime.

## Features

- **Interactive 3D Visualization**: Real-time quadcopter simulation with full 3D controls
- **AI Control**: Neural network-based flight controller using ONNX Runtime
- **Physics Simulation**: Accurate RK4 integration with realistic quadcopter dynamics
- **Interactive Controls**: 
  - Drag to move quadcopter position
  - Rotate to change orientation
  - Adjustable initial conditions
- **Step-by-Step Mode**: Debug physics simulation frame by frame
- **Live Action Display**: Real-time visualization of control outputs (throttle, roll, pitch, yaw)

## Project Structure

```
quadcopter-sim/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main application page
│   └── layout.tsx         # Root layout
├── components/            
│   ├── 3d/               # 3D visualization components
│   │   ├── Axes.tsx      # 3D axes visualization
│   │   ├── InteractiveQuadcopter.tsx
│   │   └── QuadcopterModel.tsx
│   ├── simulation/       # Simulation components
│   │   ├── PrecomputedTrajectory.tsx
│   │   └── StepTrajectory.tsx
│   └── ui/              # UI components
│       ├── ControlPanel.tsx
│       └── ControlPanel.module.css
├── lib/                  
│   ├── physics/         # Physics simulation
│   │   └── QuadcopterPhysics.ts
│   ├── inference/       # Neural network inference
│   │   └── ONNXInference.ts
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   └── coordinateTransform.ts
├── hooks/              # React hooks
│   └── usePrecomputedSimulation.ts
└── public/            
    ├── models/        # 3D model files
    └── *.onnx        # Neural network model
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the simulation.

## Usage

### Basic Controls

1. **Position Control**: 
   - Use sliders or drag the quadcopter to set initial position
   - Bounds: -1 to 1 on all axes

2. **Orientation Control**:
   - Use sliders or rotate the quadcopter
   - Range: -180° to 180° for roll, pitch, and yaw

3. **Simulation Control**:
   - **Play/Pause**: Start or pause the simulation
   - **Reset**: Reset to initial conditions
   - **Step Mode**: Advance simulation frame by frame

### Interaction Modes

- **Move Mode**: Click and drag to reposition the quadcopter
- **Rotate Mode**: Click and drag to change orientation
  - Horizontal drag: Adjust yaw
  - Vertical drag: Adjust pitch
  - Diagonal drag: Adjust roll

### Coordinate System

The simulation uses an aviation-standard coordinate system:
- **X-axis (Red)**: Left/Right
- **Y-axis (Green)**: Forward/Backward  
- **Z-axis (Blue)**: Up/Down

## Physics Model

The simulation implements a realistic quadcopter dynamics model with:
- 6-DOF rigid body dynamics
- RK4 integration for numerical stability
- Accurate thrust and torque modeling
- Gyroscopic effects

### Parameters

- Mass: 2.5 kg
- Inertia: [0.0023, 0.0023, 0.004] kg⋅m²
- Gravity: 9.81 m/s²
- Simulation timestep: 0.04 s

## AI Controller

The AI controller uses a trained neural network to compute control actions:
- **Input**: 13-dimensional state vector (position, velocity, quaternion, angular velocity)
- **Output**: 4-dimensional action vector (throttle, roll, pitch, yaw)
- **Model**: ONNX format for cross-platform compatibility

## Development

### Key Technologies

- **Next.js 14**: React framework with App Router
- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **ONNX Runtime Web**: Neural network inference in the browser
- **TypeScript**: Type-safe development

### Code Quality

- Organized component structure
- Comprehensive TypeScript types
- Modular physics simulation
- Clean separation of concerns

## Future Enhancements

- Multiple quadcopter support
- Predefined flight patterns
- Trajectory planning
- Obstacle avoidance
- Performance metrics dashboard
- Export/import trajectories

## License

MIT