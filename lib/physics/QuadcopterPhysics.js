"use strict";
/**
 * Physics simulation for quadcopter
 * Exact RK4 implementation matching Python simulation with float64 precision
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuadcopterPhysics = void 0;
class QuadcopterPhysics {
    constructor(initialState, params) {
        this.state = JSON.parse(JSON.stringify(initialState)); // Deep copy
        // Default parameters matching Python simulation exactly
        this.params = {
            mass: 2.5,
            inertia: [0.0023, 0.0023, 0.004],
            gravity: 9.81,
            dt: 0.04,
            armLength: 0.25,
            thrustCoefficient: 8.54858e-06,
            torqueCoefficient: 2.137e-07,
            maxMotorSpeed: 10000.0,
            ...params,
        };
        // Pre-compute inertia matrix and its inverse
        this.inertiaMatrix = [
            [this.params.inertia[0], 0, 0],
            [0, this.params.inertia[1], 0],
            [0, 0, this.params.inertia[2]],
        ];
        this.inertiaInv = [
            [1.0 / this.params.inertia[0], 0, 0],
            [0, 1.0 / this.params.inertia[1], 0],
            [0, 0, 1.0 / this.params.inertia[2]],
        ];
    }
    /**
     * Convert normalized control inputs [-1, 1] to physical forces and torques
     * Exactly matching Python implementation
     */
    normalizedControlsToForces(controls) {
        const [throttle, roll, pitch, yaw] = controls;
        // Map throttle from [-1, 1] to [0, 2] * hover_thrust
        const throttleScaled = (throttle + 1.0);
        const thrustCmd = Math.max(0.0, throttleScaled * this.params.mass * this.params.gravity);
        // Define max torques (matching Python)
        const maxRollTorque = 0.5; // N⋅m
        const maxPitchTorque = 0.5; // N⋅m  
        const maxYawTorque = 0.1; // N⋅m
        // Calculate commanded torques
        const rollTorqueCmd = roll * maxRollTorque;
        const pitchTorqueCmd = pitch * maxPitchTorque;
        const yawTorqueCmd = yaw * maxYawTorque;
        return [thrustCmd, rollTorqueCmd, pitchTorqueCmd, yawTorqueCmd];
    }
    /**
     * Convert quaternion to rotation matrix
     * Matches Python implementation exactly
     */
    quatToRotationMatrix(q) {
        const [w, x, y, z] = q;
        // Pre-compute common terms for efficiency
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const xy = x * y;
        const xz = x * z;
        const yz = y * z;
        const wx = w * x;
        const wy = w * y;
        const wz = w * z;
        return [
            [1 - 2 * yy - 2 * zz, 2 * xy - 2 * wz, 2 * xz + 2 * wy],
            [2 * xy + 2 * wz, 1 - 2 * xx - 2 * zz, 2 * yz - 2 * wx],
            [2 * xz - 2 * wy, 2 * yz + 2 * wx, 1 - 2 * xx - 2 * yy],
        ];
    }
    /**
     * Normalize a quaternion
     */
    normalizeQuaternion(q) {
        const norm = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
        return [q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm];
    }
    /**
     * Cross product of two 3D vectors
     */
    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }
    /**
     * Matrix-vector multiplication for 3x3 matrix
     */
    matVecMul(mat, vec) {
        return [
            mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
            mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
            mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2],
        ];
    }
    /**
     * Quadcopter dynamics - calculates derivative of state vector
     * This exactly matches the Python quadcopter_dynamics function
     */
    quadcopterDynamics(stateVec, controls) {
        const g = this.params.gravity;
        const mass = this.params.mass;
        // Unpack commanded thrust and torques
        const [thrustMagnitude, τx, τy, τz] = controls;
        const torque = [τx, τy, τz];
        // Extract state components
        const pos = [stateVec[0], stateVec[1], stateVec[2]];
        const vel = [stateVec[3], stateVec[4], stateVec[5]];
        const q = [stateVec[6], stateVec[7], stateVec[8], stateVec[9]];
        const ω = [stateVec[10], stateVec[11], stateVec[12]];
        // Initialize derivative vector
        const du = new Array(13).fill(0);
        // 1. Position derivative (is just velocity)
        du[0] = vel[0];
        du[1] = vel[1];
        du[2] = vel[2];
        // 2. Velocity derivative (acceleration)
        // Normalize quaternion to prevent drift
        const qNorm = this.normalizeQuaternion(q);
        const R = this.quatToRotationMatrix(qNorm);
        const thrustBody = [0.0, 0.0, thrustMagnitude];
        const thrustWorld = this.matVecMul(R, thrustBody);
        // F_total = thrust_world + gravity_world
        // acceleration = F_total / mass
        du[3] = thrustWorld[0] / mass;
        du[4] = thrustWorld[1] / mass;
        du[5] = thrustWorld[2] / mass - g; // gravity acts downward
        // 3. Quaternion derivative
        const [qw, qx, qy, qz] = qNorm;
        const [ωx, ωy, ωz] = ω;
        du[6] = 0.5 * (-qx * ωx - qy * ωy - qz * ωz);
        du[7] = 0.5 * (qw * ωx + qy * ωz - qz * ωy);
        du[8] = 0.5 * (qw * ωy - qx * ωz + qz * ωx);
        du[9] = 0.5 * (qw * ωz + qx * ωy - qy * ωx);
        // 4. Angular velocity derivative (angular acceleration)
        // angular_acceleration = I_inv @ (torque - cross(ω, I @ ω))
        const Iω = this.matVecMul(this.inertiaMatrix, ω);
        const gyroscopicTorque = this.cross(ω, Iω);
        const netTorque = [
            torque[0] - gyroscopicTorque[0],
            torque[1] - gyroscopicTorque[1],
            torque[2] - gyroscopicTorque[2],
        ];
        const angularAcceleration = this.matVecMul(this.inertiaInv, netTorque);
        du[10] = angularAcceleration[0];
        du[11] = angularAcceleration[1];
        du[12] = angularAcceleration[2];
        return du;
    }
    /**
     * RK4 integration step
     * Matches Python implementation exactly
     */
    rk4Step(state, controls, dt) {
        // RK4 integration
        const k1 = this.quadcopterDynamics(state, controls);
        const state2 = state.map((s, i) => s + 0.5 * dt * k1[i]);
        const k2 = this.quadcopterDynamics(state2, controls);
        const state3 = state.map((s, i) => s + 0.5 * dt * k2[i]);
        const k3 = this.quadcopterDynamics(state3, controls);
        const state4 = state.map((s, i) => s + dt * k3[i]);
        const k4 = this.quadcopterDynamics(state4, controls);
        // Combine the k values
        const newState = state.map((s, i) => s + (dt / 6.0) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
        // Normalize quaternion
        const qNorm = this.normalizeQuaternion([
            newState[6], newState[7], newState[8], newState[9]
        ]);
        newState[6] = qNorm[0];
        newState[7] = qNorm[1];
        newState[8] = qNorm[2];
        newState[9] = qNorm[3];
        return newState;
    }
    /**
     * Step the simulation forward by one timestep using RK4
     */
    step(action, dt) {
        const timestep = dt ?? this.params.dt;
        // Convert normalized controls to forces/torques
        const controls = this.normalizedControlsToForces(action);
        // Convert state to array
        const stateArray = [
            ...this.state.position,
            ...this.state.velocity,
            ...this.state.quaternion,
            ...this.state.angularVelocity,
        ];
        // Perform RK4 integration
        const newStateArray = this.rk4Step(stateArray, controls, timestep);
        // Extract new state components
        const newPosition = [newStateArray[0], newStateArray[1], newStateArray[2]];
        const newVelocity = [newStateArray[3], newStateArray[4], newStateArray[5]];
        const newQuaternion = [newStateArray[6], newStateArray[7], newStateArray[8], newStateArray[9]];
        const newAngularVelocity = [newStateArray[10], newStateArray[11], newStateArray[12]];
        // Calculate debug info (forces in world frame)
        const R = this.quatToRotationMatrix(newQuaternion);
        const thrustBody = [0, 0, controls[0]];
        const thrustWorld = this.matVecMul(R, thrustBody);
        const acceleration = [
            thrustWorld[0] / this.params.mass,
            thrustWorld[1] / this.params.mass,
            thrustWorld[2] / this.params.mass - this.params.gravity,
        ];
        // Angular acceleration for debug
        const torque = [controls[1], controls[2], controls[3]];
        const Iω = this.matVecMul(this.inertiaMatrix, newAngularVelocity);
        const gyroscopicTorque = this.cross(newAngularVelocity, Iω);
        const netTorque = [
            torque[0] - gyroscopicTorque[0],
            torque[1] - gyroscopicTorque[1],
            torque[2] - gyroscopicTorque[2],
        ];
        const angularAcceleration = this.matVecMul(this.inertiaInv, netTorque);
        // Update internal state
        this.state = {
            position: newPosition,
            velocity: newVelocity,
            quaternion: newQuaternion,
            angularVelocity: newAngularVelocity,
        };
        return {
            position: newPosition,
            velocity: newVelocity,
            quaternion: newQuaternion,
            angularVelocity: newAngularVelocity,
            debug: {
                thrustWorld,
                acceleration,
                angularAcceleration,
            },
        };
    }
    /**
     * Get current state
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state)); // Deep copy
    }
    /**
     * Get state as flat array for neural network input
     */
    getStateArray() {
        return [
            ...this.state.position,
            ...this.state.velocity,
            ...this.state.quaternion,
            ...this.state.angularVelocity,
        ];
    }
    /**
     * Reset state
     */
    reset(state) {
        this.state = JSON.parse(JSON.stringify(state));
    }
    /**
     * Get simulation parameters
     */
    getParams() {
        return { ...this.params };
    }
}
exports.QuadcopterPhysics = QuadcopterPhysics;
