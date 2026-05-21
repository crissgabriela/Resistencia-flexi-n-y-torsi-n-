import { useState } from "react";
import { Info, HelpCircle, RefreshCw, Eye } from "lucide-react";
import { BeamConfig, Material, SectionType } from "../types";
import { calculateBeam } from "../physics";

interface BeamModuleProps {
  materials: Material[];
}

export default function BeamModule({ materials }: BeamModuleProps) {
  // Config state
  const [bMaterial, setBMaterial] = useState<Material>(materials[0]);
  const [config, setConfig] = useState<BeamConfig>({
    type: "simply_supported",
    length: 5.0, // meters
    sectionType: "rectangular",
    b: 0.15, // width in meters (15 cm)
    h: 0.30, // height in meters (30 cm)
    flangeW: 0.20,
    flangeT: 0.02,
    webH: 0.25,
    webT: 0.015,
    pointForce: 5.0, // kN
    pointForcePos: 2.5, // meters from left
    distForce: 1.5, // kN/m
  });

  // Slider for values inspection at position $x$
  const [inspectorX, setInspectorX] = useState<number>(2.5);

  const stats = calculateBeam(config, bMaterial);

  // Clamp inspectorX to make sure it doesn't exceed length when length shrinks
  const activeX = Math.min(inspectorX, config.length);

  // Find calculations at activeX
  const findValueAtX = (xVal: number) => {
    // Find closest point
    const closest = stats.points.reduce((prev, curr) => {
      return Math.abs(curr.x - xVal) < Math.abs(prev.x - xVal) ? curr : prev;
    });
    return closest;
  };

  const currentPoint = findValueAtX(activeX);

  // Helper helper to update config safely
  const updateConfig = (key: keyof BeamConfig, value: any) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      
      // Ensure point force position is kept within bounds of length
      if (key === "length" && prev.pointForcePos > value) {
        next.pointForcePos = parseFloat((value / 2).toFixed(1));
      }
      return next;
    });
  };

  // Generate SVG paths for shear, moment, and deflection
  const generateDiagramPaths = (
    key: "V" | "M" | "deflection",
    height: number,
    colorClass: string
  ) => {
    const width = 500;
    const padding = 10;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;
    const midY = height / 2;

    const points = stats.points;
    if (points.length === 0) return { path: "", zeroPath: "" };

    // Find max absolute value to scale
    const values = points.map((p) => p[key]);
    const maxVal = Math.max(...values.map(Math.abs));
    const scaleY = maxVal === 0 ? 0 : drawHeight / (2 * maxVal);

    let path = "";
    let fillPath = "";
    
    points.forEach((p, index) => {
      const xPct = p.x / config.length;
      const xDraw = padding + xPct * drawWidth;
      
      // Deflection is plotted differently, always downwards? Or we can center on zero.
      // Usually deflection bends downward (positive deflection). Let's plot it starting from top or centered.
      let yDraw = midY;
      if (key === "deflection") {
        // scale from top (0) to bottom (drawHeight)
        const maxDef = stats.maxDeflection;
        const scaleDef = maxDef === 0 ? 0 : (height - 30) / maxDef;
        // starts from padding (0 deflection) down to padding + def * scaleDef
        yDraw = padding + 10 + p[key] * scaleDef;
      } else {
        // Centered on midY. Remember SVG y goes downward! So positive is drawn UP (subtract from midY)
        yDraw = midY - p[key] * scaleY * 0.9;
      }

      if (index === 0) {
        path += `M ${xDraw} ${yDraw}`;
        fillPath += `M ${xDraw} ${midY} L ${xDraw} ${yDraw}`;
      } else {
        path += ` L ${xDraw} ${yDraw}`;
        fillPath += ` L ${xDraw} ${yDraw}`;
      }
      
      if (index === points.length - 1) {
        fillPath += ` L ${xDraw} ${midY} Z`;
      }
    });

    const zeroPath = `M ${padding} ${midY} L ${width - padding} ${midY}`;

    // Calculate dynamic coordinates for inspector indicator
    const inspPct = activeX / config.length;
    const inspDrawX = padding + inspPct * drawWidth;
    let inspDrawY = midY;
    if (key === "deflection") {
      const maxDef = stats.maxDeflection;
      const scaleDef = maxDef === 0 ? 0 : (height - 30) / maxDef;
      inspDrawY = padding + 10 + currentPoint.deflection * scaleDef;
    } else {
      inspDrawY = midY - currentPoint[key] * scaleY * 0.9;
    }

    return { path, fillPath, zeroPath, inspDrawX, inspDrawY };
  };

  const vDiagram = generateDiagramPaths("V", 110, "stroke-sky-500");
  const mDiagram = generateDiagramPaths("M", 110, "stroke-emerald-500");
  const dDiagram = generateDiagramPaths("deflection", 100, "stroke-rose-500");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      
      {/* Configuration Controls (Left) */}
      <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
            Configuración de la Viga
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Modifica las dimensiones, fuerzas y apoyos para ver las deflexiones e inercias en tiempo real.
          </p>
        </div>

        {/* Support Type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Tipo de Apoyo / Viga
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => updateConfig("type", "simply_supported")}
              className={`text-xs py-2 px-3 rounded-lg font-semibold transition-all ${
                config.type === "simply_supported"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Simplemente Apoyada
            </button>
            <button
              onClick={() => updateConfig("type", "cantilever")}
              className={`text-xs py-2 px-3 rounded-lg font-semibold transition-all ${
                config.type === "cantilever"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              En Voladizo / Cantilever
            </button>
          </div>
        </div>

        {/* Material Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Material de la Viga
          </label>
          <select
            value={bMaterial.id}
            onChange={(e) => {
              const selected = materials.find((m) => m.id === e.target.value);
              if (selected) setBMaterial(selected);
            }}
            className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-cyan-500/50"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (E = {m.E / 1e9} GPa, σ_y = {m.yieldStrength / 1e6} MPa)
              </option>
            ))}
          </select>
        </div>

        {/* Beam Length */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">
              Longitud de la Viga (L)
            </span>
            <span className="text-cyan-400 font-bold font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {config.length.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={config.length}
            onChange={(e) => updateConfig("length", parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-950 h-2 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* CROSS SECTION */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Sección Transversal
            </label>
            <div className="flex gap-1.5 p-0.5 bg-slate-950 rounded-lg border border-slate-850">
              <button
                onClick={() => updateConfig("sectionType", "rectangular")}
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                  config.sectionType === "rectangular"
                    ? "bg-slate-800 text-amber-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Rectangular
              </button>
              <button
                onClick={() => updateConfig("sectionType", "i_beam")}
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                  config.sectionType === "i_beam"
                    ? "bg-slate-800 text-amber-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Viga I-Beam
              </button>
            </div>
          </div>

          {config.sectionType === "rectangular" ? (
            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Ancho (b)</span>
                  <span className="font-bold text-amber-400 font-mono">{(config.b * 1000).toFixed(0)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.01"
                  value={config.b}
                  onChange={(e) => updateConfig("b", parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Alto (h)</span>
                  <span className="font-bold text-amber-400 font-mono">{(config.h * 1000).toFixed(0)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.01"
                  value={config.h}
                  onChange={(e) => updateConfig("h", parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Ala Ancho (b_f)</span>
                    <span className="font-bold font-mono text-amber-400">{(config.flangeW * 1000).toFixed(0)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.4"
                    step="0.01"
                    value={config.flangeW}
                    onChange={(e) => updateConfig("flangeW", parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Espesor Ala (t_f)</span>
                    <span className="font-bold font-mono text-amber-400">{(config.flangeT * 1000).toFixed(0)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.05"
                    step="0.002"
                    value={config.flangeT}
                    onChange={(e) => updateConfig("flangeT", parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Alma Alto (h_w)</span>
                    <span className="font-bold font-mono text-amber-400">{(config.webH * 1000).toFixed(0)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.6"
                    step="0.01"
                    value={config.webH}
                    onChange={(e) => updateConfig("webH", parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Espesor Alma (t_w)</span>
                    <span className="font-bold font-mono text-amber-400">{(config.webT * 1000).toFixed(0)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.008"
                    max="0.04"
                    step="0.002"
                    value={config.webT}
                    onChange={(e) => updateConfig("webT", parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MECHANICAL LOADS AND FORCES */}
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Cargas Aplicadas
          </label>

          {/* Point force magnitude */}
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                Fuerza Concentrada (P)
              </span>
              <span className="font-bold text-sky-400 font-mono">{config.pointForce.toFixed(1)} kN</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="25.0"
              step="0.5"
              value={config.pointForce}
              onChange={(e) => updateConfig("pointForce", parseFloat(e.target.value))}
              className="w-full accent-sky-500"
            />

            {config.pointForce > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-900 mt-2">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Posición de P</span>
                  <span className="font-bold text-slate-300 font-mono">{config.pointForcePos.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max={config.length - 0.1}
                  step="0.1"
                  value={config.pointForcePos}
                  onChange={(e) => updateConfig("pointForcePos", parseFloat(e.target.value))}
                  className="w-full accent-slate-400"
                />
              </div>
            )}
          </div>

          {/* Uniform distributed load */}
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Carga Distribuida Uniforme (w)</span>
              <span className="font-bold text-emerald-400 font-mono">{config.distForce.toFixed(2)} kN/m</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="10.00"
              step="0.25"
              value={config.distForce}
              onChange={(e) => updateConfig("distForce", parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        {/* Safety factor warning / stress status code */}
        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estado de Resistencia Mecánica
          </div>
          <div className="flex justify-between items-baseline text-xs pt-1">
            <span className="text-slate-400">Esfuerzo Máximo σ_máx:</span>
            <span className="text-slate-200 font-mono font-bold">{stats.maxSigma.toFixed(2)} MPa</span>
          </div>
          <div className="flex justify-between items-baseline text-xs pb-1">
            <span className="text-slate-400">Límite Fluencia σ_y:</span>
            <span className="text-slate-200 font-mono">{(bMaterial.yieldStrength / 1e6).toFixed(0)} MPa</span>
          </div>
          
          {stats.maxSigma > bMaterial.yieldStrength / 1e6 ? (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 font-semibold p-2.5 rounded-lg text-[11px] text-center">
              ▲ VIGA SOBRECARGADA: ¡Existe deformación plástica permanente! Incrementa las dimensiones de la viga.
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold p-2.5 rounded-lg text-[11px] text-center">
              ■ DISEÑO SEGURO (F.S. = {(bMaterial.yieldStrength / 1e6 / stats.maxSigma).toFixed(2)})
            </div>
          )}
        </div>

      </div>

      {/* Visualizers, Output Diagrams and Cross Section Stress (Right) */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Real-time Physical Deformation Beam Drawing (Top) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-rose-500" />
              Esquema de Cargas y Apoyos Realistas
            </h4>
            
            <div className="text-[11px] bg-slate-950 px-3 py-1 rounded text-rose-400 border border-slate-850 font-semibold">
              Escala de Deflexión: Exagerada visualmente para fines didácticos
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex items-center justify-center min-h-[140px] relative overflow-hidden">
            {/* The SVG structural draft */}
            <svg viewBox="0 0 500 130" className="w-full max-w-[550px] aspect-auto">
              {/* Reference Grid */}
              <line x1="10" y1="90" x2="490" y2="90" stroke="#1f2937" strokeWidth="1" strokeDasharray="3,3" />

              {/* Distributed Load Visualizer Force Arrows */}
              {config.distForce > 0 && (
                <>
                  <path d="M 40 25 L 460 25" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
                  {Array.from({ length: 8 }).map((_, i) => {
                    const xCoord = 40 + i * 60;
                    return (
                      <g key={i}>
                        <line x1={xCoord} y1="25" x2={xCoord} y2="52" stroke="#10b981" strokeWidth="1.5" />
                        <polygon points={`${xCoord},54 ${xCoord-4},48 ${xCoord+4},48`} fill="#10b981" />
                      </g>
                    );
                  })}
                  <text x="250" y="20" fill="#10b981" fontSize="9" textAnchor="middle" className="font-bold font-sans">
                    w = {config.distForce.toFixed(2)} kN/m
                  </text>
                </>
              )}

              {/* Point concentrated Force P Arrow */}
              {config.pointForce > 0 && (
                <g>
                  {/* Position coordinates calculation */}
                  {(() => {
                    const pctX = config.pointForcePos / config.length;
                    const xDraw = 40 + pctX * 420;
                    return (
                      <>
                        <line x1={xDraw} y1="12" x2={xDraw} y2="48" stroke="#38bdf8" strokeWidth="3" />
                        <polygon points={`${xDraw},52 ${xDraw-5},44 ${xDraw+5},44`} fill="#38bdf8" />
                        <text x={xDraw} y="8" fill="#38bdf8" fontSize="10" textAnchor="middle" className="font-bold">
                          P = {config.pointForce.toFixed(1)} kN
                        </text>
                        {/* vertical alignment reference */}
                        <line x1={xDraw} y1="52" x2={xDraw} y2="90" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,4" opacity="0.4" />
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Curved Elastic Deformed Beam Body (The actual deflated structural bar) */}
              {(() => {
                const beamStrokeWidth = config.sectionType === "rectangular" ? config.h * 20 + 4 : 14;
                const pathPoints: string[] = [];
                for (let step = 0; step <= 50; step++) {
                  const subX = (step / 50) * config.length;
                  const pt = findValueAtX(subX);
                  const xSvg = 40 + (step / 50) * 420;
                  
                  // exaggerated deflection
                  const maxDef = stats.maxDeflection;
                  const ratio = maxDef === 0 ? 0 : pt.deflection / maxDef;
                  const ySvg = 60 + ratio * 20; // amplified to 20 pixels max deflection
                  
                  pathPoints.push(`${xSvg},${ySvg}`);
                }
                return (
                  <path
                    d={`M ${pathPoints.join(" L ")}`}
                    stroke="url(#beamGrad)"
                    strokeWidth={Math.max(5, Math.min(24, beamStrokeWidth))}
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                );
              })()}

              {/* Beam Supports Graphics */}
              {config.type === "simply_supported" ? (
                <>
                  {/* Left Support Simple Pin at x=40 */}
                  <polygon points="40,65 32,80 48,80" fill="#ef4444" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="28" y1="80" x2="52" y2="80" stroke="#f1f5f9" strokeWidth="2" />
                  
                  {/* Right Support Simple Roller at x=460 */}
                  <circle cx="460" cy="71" r="5" fill="#ef4444" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="445" y1="80" x2="475" y2="80" stroke="#f1f5f9" strokeWidth="2" />

                  {/* Reaction markers */}
                  <text x="40" y="93" fill="#f87171" fontSize="9" textAnchor="middle" className="font-mono font-bold">
                    R1 L = {stats.reactions.R1.toFixed(1)} kN
                  </text>
                  <text x="460" y="93" fill="#f87171" fontSize="9" textAnchor="middle" className="font-mono font-bold">
                    R2 R = {stats.reactions.R2.toFixed(1)} kN
                  </text>
                </>
              ) : (
                <>
                  {/* Cantilever support wall at x=40 (Fixed support block) */}
                  <rect x="25" y="40" fill="#374151" width="15" height="42" rx="2" />
                  {/* diagonal wall stripes */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line key={i} x1="25" y1={42 + i*7} x2="35" y2={47 + i*7} stroke="#4b5563" strokeWidth="1.5" />
                  ))}
                  
                  {/* Support reaction markers */}
                  <text x="18" y="98" fill="#f87171" fontSize="9" textAnchor="middle" className="font-mono font-bold">
                    R1 (Fza) = {stats.reactions.R1.toFixed(1)} kN
                  </text>
                  <text x="18" y="112" fill="#ef4444" fontSize="9" textAnchor="middle" className="font-mono font-semibold">
                    M_emp = {stats.reactions.M_wall.toFixed(1)} kN·m
                  </text>
                </>
              )}

              {/* Dynamic Inspector position line marker */}
              {(() => {
                const inspPctCenter = activeX / config.length;
                const inspDrawXCenter = 40 + inspPctCenter * 420;
                return (
                  <g>
                    <line x1={inspDrawXCenter} y1="12" x2={inspDrawXCenter} y2="120" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.85" />
                    <circle cx={inspDrawXCenter} cy="12" r="4.5" fill="#06b6d4" />
                    <rect x={inspDrawXCenter - 18} y="116" width="36" height="12" rx="2" fill="#06b6d4" />
                    <text x={inspDrawXCenter} y="125" fill="#09333f" fontSize="8" textAnchor="middle" className="font-mono font-bold">
                      {activeX.toFixed(2)}m
                    </text>
                  </g>
                );
              })()}

              {/* SVG Definitions */}
              <defs>
                <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Inspection Slider Controller */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grow space-y-1">
              <div className="flex justify-between text-xs font-semibold text-cyan-400">
                <span className="flex items-center gap-1">
                  Regla Móvil de Inspección en Viga
                </span>
                <span className="font-mono font-bold text-slate-200">x = {activeX.toFixed(2)} m / {config.length.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.0"
                max={config.length}
                step="0.05"
                value={activeX}
                onChange={(e) => setInspectorX(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-ew-resize bg-slate-900 h-2 rounded-lg appearance-none"
              />
            </div>

            <div className="shrink-0 grid grid-cols-3 md:flex gap-4 md:gap-6 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-3 md:pt-0">
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-550 font-medium">F. Cortante</div>
                <div className={`text-xs font-mono font-extrabold ${currentPoint.V >= 0 ? "text-cyan-400" : "text-sky-400"}`}>
                  {currentPoint.V.toFixed(2)} kN
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-550 font-medium font-sans">Mom. Flector</div>
                <div className="text-xs font-mono font-extrabold text-emerald-400">
                  {currentPoint.M.toFixed(2)} kN·m
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-550 font-medium font-mono">Deflexión</div>
                <div className="text-xs font-mono font-extrabold text-cyan-400">
                  {currentPoint.deflection.toFixed(2)} mm
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Structural Diagrams (Shear & Bending Moment in SVGs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Shear Force Diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Diagrama de Fuerza Cortante V(x)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Pico Máx: {stats.maxV.toFixed(1)} kN
              </span>
            </div>
            
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
              <svg viewBox="0 0 500 110" className="w-full">
                {/* Fill Area representing forces */}
                <path d={vDiagram.fillPath || ""} fill="#0284c7" opacity="0.15" />
                {/* Zero force baseline axis */}
                <path d={vDiagram.zeroPath} stroke="#374151" strokeWidth="1.5" />
                {/* actual diagram plot line */}
                <path d={vDiagram.path || ""} stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                
                {/* support line markers */}
                <line x1="10" y1="10" x2="10" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="490" y1="10" x2="490" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />

                {/* inspector slider point sync indicator */}
                {vDiagram.inspDrawX !== undefined && (
                  <>
                    <line x1={vDiagram.inspDrawX} y1="10" x2={vDiagram.inspDrawX} y2="100" stroke="#f43f5e" strokeWidth="1" opacity="0.3" />
                    <circle cx={vDiagram.inspDrawX} cy={vDiagram.inspDrawY} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                    <text x={vDiagram.inspDrawX > 350 ? vDiagram.inspDrawX - 8 : vDiagram.inspDrawX + 8} y={vDiagram.inspDrawY - 4} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor={vDiagram.inspDrawX > 350 ? "end" : "start"} className="font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      {currentPoint.V.toFixed(2)} kN
                    </text>
                  </>
                )}
                
                {/* Axis end label */}
                <text x="480" y="50" fill="#4b5563" fontSize="8" fontWeight="bold">x</text>
              </svg>
            </div>
          </div>

          {/* Bending Moment Diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Diagrama de Momento Flector M(x)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Pico Máx: {stats.maxM.toFixed(1)} kN·m
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
              <svg viewBox="0 0 500 110" className="w-full">
                {/* Fill Area */}
                <path d={mDiagram.fillPath || ""} fill="#059669" opacity="0.15" />
                {/* Zero axis */}
                <path d={mDiagram.zeroPath} stroke="#374151" strokeWidth="1.5" />
                {/* Plot line */}
                <path d={mDiagram.path || ""} stroke="#34d399" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                
                {/* support line markers */}
                <line x1="10" y1="10" x2="10" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="490" y1="10" x2="490" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />

                {/* inspector slider point sync indicator */}
                {mDiagram.inspDrawX !== undefined && (
                  <>
                    <line x1={mDiagram.inspDrawX} y1="10" x2={mDiagram.inspDrawX} y2="100" stroke="#f43f5e" strokeWidth="1" opacity="0.3" />
                    <circle cx={mDiagram.inspDrawX} cy={mDiagram.inspDrawY} r="4" fill="#34d399" stroke="#ffffff" strokeWidth="1" />
                    <text x={mDiagram.inspDrawX > 350 ? mDiagram.inspDrawX - 8 : mDiagram.inspDrawX + 8} y={mDiagram.inspDrawY - 4} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor={mDiagram.inspDrawX > 350 ? "end" : "start"} className="font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      {currentPoint.M.toFixed(2)} kN·m
                    </text>
                  </>
                )}

                <text x="480" y="50" fill="#4b5563" fontSize="8" fontWeight="bold">x</text>
              </svg>
            </div>
          </div>

        </div>

        {/* Section Profile Normal Stress Distribution (Bending formula σ = -M*y/I visualization) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="border-b border-slate-800 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-amber-500"></span>
                Distribución de Esfuerzos Normales en la Sección Transversal (σ = -M&middot;y/I)
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Visualiza cómo varía linealmente la tensión desde el borde inferior hasta la compresión en el borde superior.
              </p>
            </div>
            <div className="shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 font-mono text-xs text-amber-400 flex items-center gap-1.5">
              <span>Sección I_z = {stats.I.toExponential(4)} m⁴</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-950 p-6 rounded-xl border border-slate-850">
            {/* Cross section schematic drawing (Left 4 cols) */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sección Geométrica</div>
              
              <div className="h-[180px] w-full max-w-[140px] border border-dashed border-slate-800 flex items-center justify-center relative bg-slate-950 px-1 py-3">
                {config.sectionType === "rectangular" ? (
                  /* Rectangular Shape representation */
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded flex items-center justify-center" style={{ width: "80px", height: "140px" }}>
                    <div className="text-[10px] text-slate-300 font-bold font-sans flex flex-col items-center">
                      <span>b = {config.b*1000}mm</span>
                      <span>h = {config.h*1000}mm</span>
                    </div>
                  </div>
                ) : (
                  /* I-Beam structural shape representation using styled div wrappers */
                  <div className="flex flex-col items-center" style={{ width: "110px", height: "150px" }}>
                    {/* Top Flange */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600 rounded-t" style={{ width: "100px", height: "20px" }}></div>
                    {/* Web column */}
                    <div className="bg-gradient-to-b from-slate-700 to-slate-800 border-l border-r border-slate-600" style={{ width: "24px", height: "110px" }}></div>
                    {/* Bottom Flange */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600 rounded-b" style={{ width: "100px", height: "20px" }}></div>
                  </div>
                )}

                {/* Neutral Axis horizontal line overlay */}
                <div className="absolute left-0 right-0 h-0.5 border-t border-dashed border-amber-500/70 z-10"></div>
                <span className="absolute right-[-45px] text-[10px] text-amber-400 font-bold tracking-wider select-none font-sans uppercase">
                  Eje Neutro (y=0)
                </span>
              </div>
            </div>

            {/* Linear Stress Distribution diagram plot (Right 7 cols) */}
            <div className="md:col-span-7 flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Esfuerzo Normal en x = {activeX.toFixed(2)}m</div>
              
              {/* Plot showing Triangular linear variations of compressive/tension stresses */}
              <div className="w-full max-w-[280px] h-[190px] relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-3 flex items-center justify-center">
                {/* Stress profile line coordinates */}
                <svg viewBox="0 0 200 160" className="w-full h-full">
                  {/* vertical centerline reference */}
                  <line x1="100" y1="10" x2="100" y2="150" stroke="#374151" strokeWidth="1.5" />
                  
                  {/* horizontal center neutral axis line */}
                  <line x1="20" y1="80" x2="180" y2="80" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />
                  
                  {/* Linear Triangular Distribution curves */}
                  {(() => {
                    const currentMoment = currentPoint.M; // kN-m
                    // if moment is positive, top is compression (drawn left of axis) and bottom is tension (drawn right)
                    const stressMaxLocal = Math.abs((currentMoment * 1000 * (config.h / 2)) / stats.I) / 1e6; // MPa
                    
                    const leftX = 100 - Math.min(80, stressMaxLocal * 2);
                    const rightX = 100 + Math.min(80, stressMaxLocal * 2);
                    
                    let topX = leftX;
                    let bottomX = rightX;
                    
                    if (currentMoment < 0) {
                      // reverse tension/compression
                      topX = rightX;
                      bottomX = leftX;
                    }
                    
                    return (
                      <g>
                        {/* Upper compressive stress solid fill */}
                        <polygon points={`100,80 100,20 ${topX},20`} fill={currentMoment >= 0 ? "#0284c7" : "#ef4444"} fillOpacity="0.2" />
                        {/* Lower tension stress solid fill */}
                        <polygon points={`100,80 100,140 ${bottomX},140`} fill={currentMoment >= 0 ? "#ef4444" : "#0284c7"} fillOpacity="0.2" />

                        {/* Diagonal distribution line */}
                        <line x1={topX} y1="20" x2={bottomX} y2="140" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                        
                        {/* Action Force arrows */}
                        {Array.from({ length: 4 }).map((_, i) => {
                          const yLevel = 20 + i * 15;
                          // linear interpolate x coordinate from topX to 100
                          const xLevel = topX + (i/4) * (100 - topX);
                          return (
                            <line key={i} x1="100" y1={yLevel} x2={xLevel} y2={yLevel} stroke={currentMoment >= 0 ? "#38bdf8" : "#ec4899"} strokeWidth="1" />
                          );
                        })}
                        {Array.from({ length: 4 }).map((_, i) => {
                          const yLevel = 140 - i * 15;
                          // linear interpolate x coordinate from bottomX to 100
                          const xLevel = bottomX + (i/4) * (100 - bottomX);
                          return (
                            <line key={i} x1="100" y1={yLevel} x2={xLevel} y2={yLevel} stroke={currentMoment >= 0 ? "#ec4899" : "#38bdf8"} strokeWidth="1" />
                          );
                        })}

                        {/* Top stress marker text */}
                        <text x={topX < 100 ? topX - 5 : topX + 5} y="15" fill={currentMoment >= 0 ? "#38bdf8" : "#ec4899"} fontSize="8" fontWeight="bold" textAnchor={topX < 100 ? "end" : "start"}>
                          {currentMoment >= 0 ? "Compresión" : "Tracción"}: {stressMaxLocal.toFixed(1)} MPa
                        </text>

                        {/* Bottom stress marker text */}
                        <text x={bottomX < 100 ? bottomX - 5 : bottomX + 5} y="150" fill={currentMoment >= 0 ? "#ec4899" : "#38bdf8"} fontSize="8" fontWeight="bold" textAnchor={bottomX < 100 ? "end" : "start"}>
                          {currentMoment >= 0 ? "Tracción" : "Compresión"}: {stressMaxLocal.toFixed(1)} MPa
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
