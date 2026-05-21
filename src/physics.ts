import { BeamConfig, ShaftConfig, CalculationPoint, Material } from "./types";
import { findRectangularI, findIBeamI, findShaftJ, calculateK_Torsion } from "./materials";

/**
 * Realiza los cálculos físicos para el Módulo de Flexión (Vigas)
 */
export function calculateBeam(
  config: BeamConfig,
  material: Material
): {
  reactions: { R1: number; R2: number; M_wall: number };
  points: CalculationPoint[];
  I: number;
  maxM: number;
  maxV: number;
  maxDeflection: number;
  maxSigma: number;
} {
  const { type, length, sectionType, b, h, flangeW, flangeT, webH, webT, pointForce, pointForcePos, distForce } = config;
  
  // Calculate Moment of Inertia (I) in m^4
  let I = 0;
  if (sectionType === "rectangular") {
    I = findRectangularI(b, h);
  } else {
    I = findIBeamI(flangeW, flangeT, webH, webT);
  }
  
  const E = material.E; // Pa
  
  // Convert force from kN to N for calculations
  const P = pointForce * 1000; // N
  const a = pointForcePos; // m
  const bDist = length - a; // m
  const w = distForce * 1000; // N/m
  
  // Primary reaction calculations
  let R1 = 0; // Left reaction force (N)
  let R2 = 0; // Right reaction force (N)
  let M_wall = 0; // Reaction moment for cantilever at x=0 (N-m)
  
  if (type === "simply_supported") {
    // Simply supported beam
    // Reactions from point load
    const R1_P = (P * bDist) / length;
    const R2_P = (P * a) / length;
    
    // Reactions from distributed load
    const R1_w = (w * length) / 2.0;
    const R2_w = (w * length) / 2.0;
    
    R1 = R1_P + R1_w;
    R2 = R2_P + R2_w;
  } else {
    // Cantilever beam - support (fixed) is at x = 0
    R1 = P + w * length; // Total upward vertical support force
    R2 = 0;
    M_wall = - (P * a + (w * Math.pow(length, 2)) / 2.0); // Reaction moment is clockwise (negative)
  }
  
  const points: CalculationPoint[] = [];
  const numSteps = 100;
  let maxM = 0;
  let maxV = 0;
  let maxDeflection = 0;
  
  for (let i = 0; i <= numSteps; i++) {
    const x = (i / numSteps) * length;
    
    let V_val = 0; // internal shear force in N
    let M_val = 0; // internal bending moment in N-m
    let delta = 0; // vertical deflection in m (downward is positive deflection)
    
    if (type === "simply_supported") {
      // 1. Point Load Effects
      let V_P = 0;
      let M_P = 0;
      let delta_P = 0;
      
      const R1_P = (P * bDist) / length;
      const R2_P = (P * a) / length;
      
      if (x < a) {
        V_P = R1_P;
        M_P = R1_P * x;
        delta_P = (P * bDist * x * (Math.pow(length, 2) - Math.pow(bDist, 2) - Math.pow(x, 2))) / (6.0 * E * I * length);
      } else {
        V_P = R1_P - P;
        M_P = R2_P * (length - x);
        const termX = length - x;
        delta_P = (P * a * termX * (Math.pow(length, 2) - Math.pow(a, 2) - Math.pow(termX, 2))) / (6.0 * E * I * length);
      }
      
      // 2. Uniformly Distributed Load Effects
      const V_w = w * (length / 2.0 - x);
      const M_w = (w * x * (length - x)) / 2.0;
      const delta_w = (w * x * (Math.pow(length, 3) - 2.0 * length * Math.pow(x, 2) + Math.pow(x, 3))) / (24.0 * E * I);
      
      V_val = V_P + V_w;
      M_val = M_P + M_w;
      delta = delta_P + delta_w;
      
    } else {
      // Cantilever Beam fixed at x=0, free at x=L
      // 1. Point load effects
      let V_P = 0;
      let M_P = 0;
      let delta_P = 0;
      
      if (x < a) {
        V_P = P;
        M_P = -P * (a - x);
        delta_P = (P * Math.pow(x, 2) * (3.0 * a - x)) / (6.0 * E * I);
      } else {
        V_P = 0;
        M_P = 0;
        delta_P = (P * Math.pow(a, 2) * (3.0 * x - a)) / (6.0 * E * I);
      }
      
      // 2. Distributed load effects
      const V_w = w * (length - x);
      const M_w = - (w * Math.pow(length - x, 2)) / 2.0;
      const delta_w = (w * Math.pow(x, 2) * (6.0 * Math.pow(length, 2) - 4.0 * length * x + Math.pow(x, 2))) / (24.0 * E * I);
      
      V_val = V_P + V_w;
      M_val = M_P + M_w;
      delta = delta_P + delta_w;
    }
    
    // Check extreme values
    if (Math.abs(V_val) > Math.abs(maxV)) {
      maxV = V_val;
    }
    if (Math.abs(M_val) > Math.abs(maxM)) {
      maxM = M_val;
    }
    if (delta > maxDeflection) {
      maxDeflection = delta;
    }
    
    points.push({
      x,
      V: V_val / 1000.0, // convert to kN
      M: M_val / 1000.0, // convert to kN-m
      deflection: delta * 1000.0, // convert to mm
    });
  }
  
  // Calculate stress: sigma = -M * y / I
  // Max normal stress occurs at the outermost fiber (y = c = h/2 or totalHeight/2)
  let c = 0;
  if (sectionType === "rectangular") {
    c = h / 2.0;
  } else {
    c = (webH + 2 * flangeT) / 2.0;
  }
  
  // maxSigma in MPa: (maxM_Nm * c / I_m4) / 1e6
  const maxSigma = ((Math.abs(maxM) * c) / I) / 1e6;
  
  return {
    reactions: {
      R1: R1 / 1000.0, // kN
      R2: R2 / 1000.0, // kN
      M_wall: M_wall / 1000.0, // kN-m
    },
    points,
    I,
    maxM: maxM / 1000.0, // kN-m
    maxV: maxV / 1000.0, // kN
    maxDeflection: maxDeflection * 1000.0, // mm
    maxSigma, // MPa
  };
}

/**
 * Realiza los cálculos físicos para el Módulo de Torsión (Ejes)
 */
export function calculateShaft(
  config: ShaftConfig,
  material: Material
): {
  J: number;
  internalTorques: { x: number; T: number }[];
  twistAngles: { x: number; phiRad: number; phiDeg: number }[];
  maxTau: string | number; // Max shear stress in MPa
  totalPhi: number; // in radians
  K: number; // stress concentration factor
  rawMaxTauWithoutK: number;
} {
  const { type, length, c_o, c_i, T1, T2, T3, filletRadius, stepLargeRadius } = config;
  
  const G = material.G; // Shear Modulus in Pa
  const J = findShaftJ(type, c_o, c_i);
  
  // Let's divide the shaft into 2 parts:
  // Part A: from x = 0 to x = L/2
  // Part B: from x = L/2 to x = L
  // Let's assume shaft is fixed at x = L.
  // Reactive torque at the wall x = L is: T_react = T1 + T2 + T3
  
  // Inside the shaft:
  // For 0 <= x < L/2: The torque transmitted in this region is: T(x) = T1
  // For L/2 <= x < L: The torque transmitted in this region is: T(x) = T1 + T2
  // Note: T3 is applied exactly at $x=L$ on the pulley/lever, which is fixed/wall-bound, 
  // so it doesn't twist the internal shaft length unless we fix it differently. 
  // Normally, if pulleys apply torque at various spots:
  // Standard arrangement: Torques applied are:
  // - T1 at position A (x = 0)
  // - T2 at position B (x = L/2)
  // - T3 at position C (x = L)
  // Internal torques:
  // Seg 1 (0 to L/2): T_1_internal = T1
  // Seg 2 (L/2 to L): T_2_internal = T1 + T2
  
  const T_seg1 = T1;
  const T_seg2 = T1 + T2;
  
  const J_G = J * G;
  
  // Rotations (with respect to fixed wall at x = L, where phi(L) = 0):
  // phi(x) = integration of T(u)/JG from x to L.
  // phi(L/2) = T_seg2 * (L/2) / JG
  // phi(0) = phi(L/2) + T_seg1 * (L/2) / JG = (T_seg2 + T_seg1) * (L/2) / JG
  
  const phi_half = (T_seg2 * (length / 2.0)) / J_G;
  const phi_zero = phi_half + (T_seg1 * (length / 2.0)) / J_G;
  
  // Generate curve for twist angle phi(x)
  const steps = 100;
  const twistAngles: { x: number; phiRad: number; phiDeg: number }[] = [];
  const internalTorques: { x: number; T: number }[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * length;
    let T_int = 0;
    let phi = 0;
    
    if (x < length / 2.0) {
      T_int = T_seg1;
      // phi(x) = phi(L/2) + T_seg1 * (L/2 - x) / JG
      phi = phi_half + (T_seg1 * (length / 2.0 - x)) / J_G;
    } else {
      T_int = T_seg2;
      // phi(x) = T_seg2 * (L - x) / JG
      phi = (T_seg2 * (length - x)) / J_G;
    }
    
    twistAngles.push({
      x,
      phiRad: phi,
      phiDeg: (phi * 180.0) / Math.PI,
    });
    
    internalTorques.push({
      x,
      T: T_int,
    });
  }
  
  // Calculate Stress: tau = T * c / J
  // Outermost fiber torque value can be the absolute maximum internal torque:
  const maxInternalTorque = Math.max(Math.abs(T_seg1), Math.abs(T_seg2));
  
  // Outermost radius is c_o
  const rawMaxTauWithoutK = (maxInternalTorque * c_o) / J; // Pa
  const rawMaxTauWithoutK_MPa = rawMaxTauWithoutK / 1e6; // MPa
  
  // Stress concentration at step (if step diameter is larger)
  // Let d = 2 * c_o. Let D = stepLargeRadius.
  const d = 2 * c_o;
  const D = stepLargeRadius;
  const K = calculateK_Torsion(filletRadius, d, D);
  
  const maxTau = rawMaxTauWithoutK_MPa * K;
  
  return {
    J,
    internalTorques,
    twistAngles,
    maxTau,
    totalPhi: phi_zero, // degrees/radians at free tip
    K,
    rawMaxTauWithoutK: rawMaxTauWithoutK_MPa,
  };
}
