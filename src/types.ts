/**
 * Types and interfaces for Resistencia de Materiales Simulator
 */

export interface Material {
  id: string;
  name: string;
  E: number; // Young's Modulus in Pa (e.g. 200e9 for steel)
  G: number; // Shear Modulus in Pa (e.g. 75e9 or 80e9 for steel)
  yieldStrength: number; // Yield Strength in Pa (e.g. 250e6)
  color: string;
}

export type BeamType = "simply_supported" | "cantilever";

export type SectionType = "rectangular" | "i_beam";

export interface BeamConfig {
  type: BeamType;
  length: number; // in meters (1 to 10m)
  sectionType: SectionType;
  // Rectangular dimensions (in meters)
  b: number; // Ancho
  h: number; // Alto
  // I-beam dimensions (in meters)
  flangeW: number; // Ancho del ala
  flangeT: number; // Espesor del ala
  webH: number; // Alto del alma
  webT: number; // Espesor del alma
  
  // Loads (forces)
  pointForce: number; // in kN
  pointForcePos: number; // Position in meters from left support
  distForce: number; // Distributed load in kN/m
}

export type ShaftType = "solid" | "tubular";

export interface ShaftConfig {
  type: ShaftType;
  length: number; // in meters
  // Dimensions
  c_o: number; // Outer radius in meters
  c_i: number; // Inner radius in meters (for tubular)
  
  // Applied Torques (in N-m) at discrete positions
  T1: number; // Torque at x = 0 (Left)
  T2: number; // Torque at x = L/2 (Middle)
  T3: number; // Torque at x = L (Right)
  
  materialId: string;
  
  // Stress concentration fillet radius (in meters)
  filletRadius: number;
  stepLargeRadius: number; // D (outer larger diameter, e.g. 1.5 * d)
}

export interface CalculationPoint {
  x: number;
  V: number; // Shear Force (kN)
  M: number; // Bending Moment (kN-m)
  deflection: number; // Deflection (mm)
}

export interface ShearStressPoint {
  rho: number; // radius from center
  tau: number; // Shear stress (MPa)
}
