import { useState } from "react";
import { Eye, ShieldAlert, Sparkles, Sliders, Play, Settings } from "lucide-react";
import { ShaftConfig, Material, ShaftType } from "../types";
import { calculateShaft } from "../physics";

interface ShaftModuleProps {
  materials: Material[];
}

export default function ShaftModule({ materials }: ShaftModuleProps) {
  const [sMaterial, setSMaterial] = useState<Material>(materials[0]);
  const [config, setConfig] = useState<ShaftConfig>({
    type: "solid",
    length: 2.0, // meters
    c_o: 0.04, // 40 mm outer radius (80 mm diameter)
    c_i: 0.025, // 25 mm inner radius (50 mm diameter) (only for tubular)
    T1: 250, // N-m at x = 0 (Left tip)
    T2: -400, // N-m at x = L/2 (Middle)
    T3: 150, // N-m at x = L (Right pulleys/retains)
    materialId: materials[0].id,
    filletRadius: 0.005, // 5 mm fillet
    stepLargeRadius: 0.06, // 60 mm large step radius
  });

  // Probe coordinate slider
  const [probeX, setProbeX] = useState<number>(0.5);

  const stats = calculateShaft(config, sMaterial);

  const activeProbeX = Math.min(probeX, config.length);

  // Find calculations at activeProbeX
  const findValAtX = (xVal: number) => {
    const closest = stats.twistAngles.reduce((prev, curr) => {
      return Math.abs(curr.x - xVal) < Math.abs(prev.x - xVal) ? curr : prev;
    });
    
    // Find torque at that segment
    const segmentIndex = Math.min(
      stats.internalTorques.length - 1,
      stats.internalTorques.findIndex((t) => t.x >= xVal)
    );
    const closestTorque = stats.internalTorques[Math.max(0, segmentIndex)];

    return {
      phiRad: closest.phiRad,
      phiDeg: closest.phiDeg,
      T: closestTorque ? closestTorque.T : 0,
    };
  };

  const currentProbePoint = findValAtX(activeProbeX);

  const updateConfig = (key: keyof ShaftConfig, value: any) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      
      // enforce radius rules
      if (key === "c_o" && prev.type === "tubular" && value <= prev.c_i) {
        next.c_i = parseFloat((value - 0.01).toFixed(3));
      }
      if (key === "c_i" && value >= prev.c_o) {
        next.c_i = parseFloat((prev.c_o - 0.01).toFixed(3));
      }
      
      // large step diameter must be larger than small outer diameter (2 * c_o)
      if (key === "c_o" && prev.stepLargeRadius <= value * 1.1) {
        next.stepLargeRadius = parseFloat((value * 1.5).toFixed(3));
      }
      return next;
    });
  };

  // Generate SVG path for Torques and twist angle curves
  const generateShaftDiagramPaths = (key: "T" | "phiDeg", height: number) => {
    const width = 500;
    const padding = 15;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;
    const midY = height / 2;

    const stepsArray = stats.twistAngles;
    if (stepsArray.length === 0) return { path: "", fillPath: "", zeroPath: "", inspX: 0, inspY: 0 };

    let values: number[] = [];
    if (key === "T") {
      values = stats.internalTorques.map((item) => item.T);
    } else {
      values = stepsArray.map((item) => item.phiDeg);
    }

    const maxVal = Math.max(...values.map(Math.abs));
    const scaleY = maxVal === 0 ? 0 : drawHeight / (2 * maxVal);

    let path = "";
    let fillPath = "";

    stepsArray.forEach((p, index) => {
      const xPct = p.x / config.length;
      const xDraw = padding + xPct * drawWidth;
      
      // Extract specific value
      const val = key === "T" ? stats.internalTorques[index].T : p.phiDeg;
      const yDraw = midY - val * scaleY * 0.95;

      if (index === 0) {
        path += `M ${xDraw} ${yDraw}`;
        fillPath += `M ${xDraw} ${midY} L ${xDraw} ${yDraw}`;
      } else {
        path += ` L ${xDraw} ${yDraw}`;
        fillPath += ` L ${xDraw} ${yDraw}`;
      }

      if (index === stepsArray.length - 1) {
        fillPath += ` L ${xDraw} ${midY} Z`;
      }
    });

    const zeroPath = `M ${padding} ${midY} L ${width - padding} ${midY}`;

    // Inspector position coordinates
    const inspPct = activeProbeX / config.length;
    const inspX = padding + inspPct * drawWidth;
    const valAtInsp = key === "T" ? currentProbePoint.T : currentProbePoint.phiDeg;
    const inspY = midY - valAtInsp * scaleY * 0.95;

    return { path, fillPath, zeroPath, inspX, inspY };
  };

  const tDiagram = generateShaftDiagramPaths("T", 110);
  const pDiagram = generateShaftDiagramPaths("phiDeg", 110);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      
      {/* Parameter Panels (Left) */}
      <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
            Configuración del Eje
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Modifica las dimensiones del eje circular y los torques torsionales aplicados a lo largo del vano.
          </p>
        </div>

        {/* Solid vs Hollow */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Geometría de Sección
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => updateConfig("type", "solid")}
              className={`text-xs py-2 px-3 rounded-lg font-semibold transition-all ${
                config.type === "solid"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Eje Sólido Macizo
            </button>
            <button
              onClick={() => updateConfig("type", "tubular")}
              className={`text-xs py-2 px-3 rounded-lg font-semibold transition-all ${
                config.type === "tubular"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Eje Tubular Hueco
            </button>
          </div>
        </div>

        {/* Material */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Material del Eje
          </label>
          <select
            value={sMaterial.id}
            onChange={(e) => {
              const selected = materials.find((m) => m.id === e.target.value);
              if (selected) setSMaterial(selected);
            }}
            className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-cyan-500/50"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (G = {m.G / 1e9} GPa, τ_y ≈ {(m.yieldStrength/1e6 * 0.577).toFixed(0)} MPa)
              </option>
            ))}
          </select>
        </div>

        {/* Length */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">
              Longitud Total (L)
            </span>
            <span className="text-cyan-400 font-bold font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {config.length.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.5"
            value={config.length}
            onChange={(e) => updateConfig("length", parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-950 h-2 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Geometry Dimensions */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Dimensiones de Radios
          </label>
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Radio Exterior (c_o)</span>
                <span className="font-bold text-amber-400 font-mono">{(config.c_o * 1000).toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.015"
                max="0.100"
                step="0.001"
                value={config.c_o}
                onChange={(e) => updateConfig("c_o", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {config.type === "tubular" && (
              <div className="space-y-1 pt-2 border-t border-slate-900">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Radio Interior (c_i)</span>
                  <span className="font-bold text-amber-400 font-mono">{(config.c_i * 1000).toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max={config.c_o - 0.005}
                  step="0.001"
                  value={config.c_i}
                  onChange={(e) => updateConfig("c_i", parseFloat(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* APPLIED TORQUES */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Torques Externos de Torsión
          </label>
          <p className="text-[10px] text-slate-400 leading-tight">
            Valores positivos son horarios y negativos antihorarios. Eje empotrado/bloqueado en extremo derecho (x = L).
          </p>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
            {/* T1 at x=0 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Torque extremo izquierdo T1 (A)</span>
                <span className="font-bold font-mono text-sky-400">{config.T1} N·m</span>
              </div>
              <input
                type="range"
                min="-1000"
                max="1000"
                step="50"
                value={config.T1}
                onChange={(e) => updateConfig("T1", parseInt(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            {/* T2 at x=L/2 */}
            <div className="space-y-1 pt-2 border-t border-slate-900">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Torque central T2 (B)</span>
                <span className="font-bold font-mono text-sky-450">{config.T2} N·m</span>
              </div>
              <input
                type="range"
                min="-1000"
                max="1000"
                step="50"
                value={config.T2}
                onChange={(e) => updateConfig("T2", parseInt(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            {/* T3 at x=L */}
            <div className="space-y-1 pt-2 border-t border-slate-900">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Torque extremo derecho T3 (C)</span>
                <span className="font-bold font-mono text-sky-500">{config.T3} N·m</span>
              </div>
              <input
                type="range"
                min="-1000"
                max="1000"
                step="50"
                value={config.T3}
                onChange={(e) => updateConfig("T3", parseInt(e.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
          </div>
        </div>

        {/* STRESS CONCENTRATION PARAMETERS */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Concentrador de Esfuerzos (Falsa Sección)
            </label>
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded px-2 py-0.5 text-[9px] font-bold uppercase">
              K = {stats.K.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-450">
                <span>Radio del Filete de Soldadura (r)</span>
                <span className="font-bold font-mono text-amber-500">{(config.filletRadius * 1000).toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.015"
                step="0.0005"
                value={config.filletRadius}
                onChange={(e) => updateConfig("filletRadius", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-900">
              <div className="flex justify-between text-[11px] text-slate-450">
                <span>Diámetro Mayor Estetoscopio (D)</span>
                <span className="font-bold font-mono text-amber-400">{(config.stepLargeRadius * 2 * 1000).toFixed(0)} mm</span>
              </div>
              <input
                type="range"
                min={parseFloat(((config.c_o * 2) * 1.1).toFixed(3))}
                max="0.30"
                step="0.005"
                value={config.stepLargeRadius}
                onChange={(e) => updateConfig("stepLargeRadius", parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Visualizers (Right) */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Shaft Schematic rendering with applied torque arrows */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Esquema de Torques y Elementos Rotativos
            </h4>
            <span className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 text-slate-400 font-semibold uppercase tracking-widest rounded">
              Empotramiento fijo en x = {config.length.toFixed(1)}m (Derecha)
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
            <svg viewBox="0 0 500 120" className="w-full max-w-[550px] aspect-auto">
              {/* Reference centerline */}
              <line x1="10" y1="60" x2="490" y2="60" stroke="#101827" strokeWidth="1" strokeDasharray="3,3" />

              {/* Step shaft background */}
              {/* Larger Diameter section on right before the wall */}
              <rect x="420" y="20" width="40" height="80" fill="#334155" stroke="#475569" strokeWidth="1.5" />
              
              {/* Standard active shaft section */}
              <rect x="50" y="35" width="370" height="50" fill="#475569" stroke="#64748b" strokeWidth="1.5" />
              
              {/* Hollow inner cylinder dashed reference lines if tubular */}
              {config.type === "tubular" && (
                <>
                  <line x1="50" y1="45" x2="420" y2="45" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="50" y1="75" x2="420" y2="75" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                  {/* hollow fill visual hint */}
                  <rect x="52" y="47" width="366" height="26" fill="#090d16" opacity="0.4" />
                </>
              )}

              {/* Stress Fillet transition curves (at x=420) */}
              {/* Top fillet curve */}
              <path d="M 420 35 Q 420 20 420 20" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
              <path d="M 420 85 Q 420 100 420 100" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
              {/* fillet radius arrow hint */}
              <circle cx="417" cy="38" r="1.5" fill="#f59e0b" />
              <text x="410" y="32" fill="#f59e0b" fontSize="7" fontWeight="bold">r</text>

              {/* Fixed Support Right wall (empotramiento) */}
              <rect x="460" y="10" width="15" height="100" fill="#1e293b" stroke="#334155" />
              {Array.from({ length: 12 }).map((_, i) => (
                <line key={i} x1="460" y1={12 + i*7} x2="470" y2={17 + i*7} stroke="#334155" strokeWidth="1.5" />
              ))}

              {/* Rotational Torque Lever discs and arrows represent external rotational forces */}
              {/* Pulley 1 (at x=50, tip) */}
              <g>
                <ellipse cx="50" cy="60" rx="10" ry="32" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
                {config.T1 > 0 ? (
                  /* clockwise torque arrow */
                  <path d="M 50 25 A 10 32 0 0 1 55 90" stroke="#38bdf8" strokeWidth="2.5" fill="none" markerEnd="url(#arrow)" />
                ) : config.T1 < 0 ? (
                  /* counter-clockwise torque arrow */
                  <path d="M 50 90 A 10 32 0 0 1 45 25" stroke="#38bdf8" strokeWidth="2.5" fill="none" markerEnd="url(#arrow)" />
                ) : null}
                <text x="50" y="104" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {config.T1} N·m
                </text>
              </g>

              {/* Pulley 2 (at x=235, middle) */}
              <g>
                <ellipse cx="235" cy="60" rx="10" ry="30" fill="#0f766e" fillOpacity="0.3" stroke="#0d9488" strokeWidth="1.5" />
                {config.T2 > 0 ? (
                  <path d="M 235 27 A 10 30 0 0 1 240 88" stroke="#0d9488" strokeWidth="2.5" fill="none" />
                ) : config.T2 < 0 ? (
                  <path d="M 235 88 A 10 30 0 0 1 230 27" stroke="#0d9488" strokeWidth="2.5" fill="none" />
                ) : null}
                <text x="235" y="104" fill="#0d9488" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {config.T2} N·m
                </text>
              </g>

              {/* Pulley 3 (at x=420, step) */}
              <g>
                {/* if torque isn't 0 */}
                <ellipse cx="420" cy="60" rx="12" ry="42" fill="#4d1d95" fillOpacity="0.3" stroke="#7c3aed" strokeWidth="1.5" />
                {config.T3 > 0 ? (
                  <path d="M 420 15 A 12 42 0 0 1 425 102" stroke="#7c3aed" strokeWidth="2.5" fill="none" />
                ) : config.T3 < 0 ? (
                  <path d="M 420 102 A 12 42 0 0 1 415 15" stroke="#7c3aed" strokeWidth="2.5" fill="none" />
                ) : null}
                <text x="420" y="112" fill="#8b5cf6" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {config.T3} N·m
                </text>
              </g>

              {/* Probe Line Indicator */}
              {(() => {
                const probeXCenter = 50 + (activeProbeX / config.length) * 370;
                return (
                  <g>
                    <line x1={probeXCenter} y1="5" x2={probeXCenter} y2="115" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.8" />
                    <circle cx={probeXCenter} cy="5" r="4.5" fill="#06b6d4" />
                    <rect x={probeXCenter - 18} y="111" width="36" height="11" rx="2" fill="#06b6d4" />
                    <text x={probeXCenter} y="119" fill="#09333f" fontSize="8" textAnchor="middle" className="font-mono font-bold">
                      {activeProbeX.toFixed(2)}m
                    </text>
                  </g>
                );
              })()}

              {/* arrow marker templates */}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Slider controller for probe */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grow space-y-1">
              <div className="flex justify-between text-xs font-semibold text-cyan-400">
                <span>Punto de Inspección en Eje</span>
                <span className="font-mono font-bold text-slate-200">x = {activeProbeX.toFixed(2)} m / {config.length.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.0"
                max={config.length}
                step="0.02"
                value={activeProbeX}
                onChange={(e) => setProbeX(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-ew-resize bg-slate-900 h-2"
              />
            </div>

            <div className="shrink-0 grid grid-cols-2 md:flex gap-6 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-3 md:pt-0">
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-400 font-medium font-sans">Torque Interno T</div>
                <div className="text-sm font-mono font-extrabold text-sky-400">
                  {currentProbePoint.T} N·m
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-400 font-medium">Ángulo de Giro (ϕ)</div>
                <div className="text-sm font-mono font-extrabold text-emerald-400 flex flex-col items-center">
                  <span>{currentProbePoint.phiRad.toFixed(5)} rad</span>
                  <span className="text-[10px] text-slate-500">({currentProbePoint.phiDeg.toFixed(2)}°)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagrams in SVG (Torque distribution and twist angle curve) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Torque diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Diagrama de Torque Interno T(x)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Pulsación Máx: {Math.max(Math.abs(config.T1), Math.abs(config.T1 + config.T2))} N·m
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
              <svg viewBox="0 0 500 110" className="w-full">
                <path d={tDiagram.fillPath || ""} fill="#0284c7" opacity="0.1" />
                <path d={tDiagram.zeroPath} stroke="#374151" strokeWidth="1.5" />
                <path d={tDiagram.path || ""} stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                
                <line x1="15" y1="10" x2="15" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="485" y1="10" x2="485" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />

                {/* inspector circle point */}
                {tDiagram.inspX !== undefined && (
                  <>
                    <line x1={tDiagram.inspX} y1="10" x2={tDiagram.inspX} y2="100" stroke="#06b6d4" strokeWidth="1" opacity="0.25" />
                    <circle cx={tDiagram.inspX} cy={tDiagram.inspY} r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                    <text x={tDiagram.inspX > 350 ? tDiagram.inspX - 8 : tDiagram.inspX + 8} y={tDiagram.inspY - 4} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor={tDiagram.inspX > 350 ? "end" : "start"} className="font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      {currentProbePoint.T} N·m
                    </text>
                  </>
                )}
                <text x="475" y="50" fill="#4b5563" fontSize="8" fontWeight="bold">x</text>
              </svg>
            </div>
          </div>

          {/* Twist Angle diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Ángulo de Giro ϕ(x) con Respecto al Apoyo
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Ángulo Máx: {(stats.totalPhi * 180 / Math.PI).toFixed(2)}°
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
              <svg viewBox="0 0 500 110" className="w-full">
                <path d={pDiagram.fillPath || ""} fill="#059669" opacity="0.1" />
                <path d={pDiagram.zeroPath} stroke="#374151" strokeWidth="1.5" />
                <path d={pDiagram.path || ""} stroke="#34d399" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                
                <line x1="15" y1="10" x2="15" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="485" y1="10" x2="485" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="2,2" />

                {/* inspector circle point */}
                {pDiagram.inspX !== undefined && (
                  <>
                    <line x1={pDiagram.inspX} y1="10" x2={pDiagram.inspX} y2="100" stroke="#06b6d4" strokeWidth="1" opacity="0.25" />
                    <circle cx={pDiagram.inspX} cy={pDiagram.inspY} r="4.5" fill="#34d399" stroke="#ffffff" strokeWidth="1" />
                    <text x={pDiagram.inspX > 350 ? pDiagram.inspX - 8 : pDiagram.inspX + 8} y={pDiagram.inspY - 4} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor={pDiagram.inspX > 350 ? "end" : "start"} className="font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      {(currentProbePoint.phiRad * 180 / Math.PI).toFixed(3)}°
                    </text>
                  </>
                )}
                <text x="475" y="50" fill="#4b5563" fontSize="8" fontWeight="bold">x</text>
              </svg>
            </div>
          </div>

        </div>

        {/* Shear Stress Distribution inside circular section (Torsional Stress Visualizer) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="border-b border-slate-800 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-amber-500"></span>
                Distribución Radial de Esfuerzos de Corte (τ = T&middot;ρ / J)
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Visualiza los esfuerzos de corte radiales. Son nulos en el centro geométrico e incrementan linealmente hacia la periferia.
              </p>
            </div>
            
            <div className="shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 font-mono text-xs text-amber-500 flex items-center gap-1.5">
              <span>Constante Polar J = {stats.J.toExponential(4)} m⁴</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-950 p-6 rounded-xl border border-slate-850">
            
            {/* Left 4 cols: Concentric stress cross section illustration */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sección Esfuerzo</div>
              
              <div className="w-[170px] h-[170px] relative rounded-full border border-dashed border-slate-800 flex items-center justify-center bg-slate-950">
                {/* Outer solid cylinder outline */}
                <div className="w-[140px] h-[140px] rounded-full border-2 border-slate-600 bg-slate-900/60 flex items-center justify-center relative">
                  
                  {config.type === "tubular" && (
                    /* Inner circle cutout representation */
                    <div className="rounded-full border-2 border-dashed border-slate-800 bg-slate-950 flex items-center justify-center" style={{
                      width: `${(config.c_i / config.c_o) * 140}px`,
                      height: `${(config.c_i / config.c_o) * 140}px`
                    }}>
                      <span className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Hueco</span>
                    </div>
                  )}

                  {/* Radial trace overlay */}
                  <div className="absolute left-[70px] right-0 bottom-[69px] border-b-2 border-dashed border-amber-500/70 z-10 origin-left" style={{
                    transform: "rotate(-30deg)",
                    width: "70px"
                  }}></div>
                  <span className="absolute bottom-[25px] right-[10px] text-[9px] text-amber-500 font-bold tracking-wider uppercase select-none font-sans">
                    Radio ρ
                  </span>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Radial Linear stress profile graph */}
            <div className="md:col-span-7 flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Perfil de Esfuerzos Cortantes</div>
              
              <div className="w-full max-w-[280px] h-[190px] relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-3 flex justify-center items-center">
                <svg viewBox="0 0 200 160" className="w-full h-full">
                  {/* centerline intersection coords */}
                  <line x1="100" y1="10" x2="100" y2="150" stroke="#374151" strokeWidth="1" />
                  <line x1="20" y1="80" x2="180" y2="80" stroke="#374151" strokeWidth="1" />

                  {/* Linear shear stress plots on upper and lower bounds */}
                  {(() => {
                    const currentSegTorque = currentProbePoint.T; // N-m
                    const maxLocalTau = (Math.abs(currentSegTorque) * config.c_o) / stats.J / 1e6; // MPa
                    const minLocalTau = config.type === "tubular" ? (Math.abs(currentSegTorque) * config.c_i) / stats.J / 1e6 : 0; // MPa
                    
                    const pctDiff = config.type === "tubular" ? config.c_i / config.c_o : 0;
                    
                    const topMaxX = 100 + Math.min(80, maxLocalTau * 1.5);
                    const topMinX = 100 + Math.min(80, minLocalTau * 1.5);
                    
                    const bottomMaxX = 100 - Math.min(80, maxLocalTau * 1.5);
                    const bottomMinX = 100 - Math.min(80, minLocalTau * 1.5);
                    
                    // Positions mapping on vertical centerline
                    const yCenter = 80;
                    const yOuterTop = 20;
                    const yInnerTop = 80 - pctDiff * 60;
                    
                    const yOuterBottom = 140;
                    const yInnerBottom = 80 + pctDiff * 60;
                    
                    return (
                      <g>
                        {/* Upper linear triangle block or trapezoid representing stress gradient */}
                        {config.type === "solid" ? (
                          <>
                            <polygon points={`100,${yCenter} 100,${yOuterTop} ${topMaxX},${yOuterTop}`} fill="#fbbf24" fillOpacity="0.2" />
                            <polygon points={`100,${yCenter} 100,${yOuterBottom} ${bottomMaxX},${yOuterBottom}`} fill="#fbbf24" fillOpacity="0.2" />
                            <line x1={topMaxX} y1={yOuterTop} x2={bottomMaxX} y2={yOuterBottom} stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                          </>
                        ) : (
                          <>
                            <polygon points={`100,${yInnerTop} 100,${yOuterTop} ${topMaxX},${yOuterTop} ${topMinX},${yInnerTop}`} fill="#fbbf24" fillOpacity="0.2" />
                            <polygon points={`100,${yInnerBottom} 100,${yOuterBottom} ${bottomMaxX},${yOuterBottom} ${bottomMinX},${yInnerBottom}`} fill="#fbbf24" fillOpacity="0.2" />
                            
                            <line x1={topMaxX} y1={yOuterTop} x2={topMinX} y2={yInnerTop} stroke="#fbbf24" strokeWidth="2.5" />
                            <line x1={bottomMinX} y1={yInnerBottom} x2={bottomMaxX} y2={yOuterBottom} stroke="#fbbf24" strokeWidth="2.5" />
                          </>
                        )}

                        {/* Force magnitude vectors vectors arrows representations */}
                        <line x1="100" y1={yOuterTop} x2={topMaxX} y2={yOuterTop} stroke="#f59e0b" strokeWidth="1" />
                        <line x1="100" y1={yOuterBottom} x2={bottomMaxX} y2={yOuterBottom} stroke="#f59e0b" strokeWidth="1" />
                        
                        {config.type === "tubular" && (
                          <>
                            <line x1="100" y1={yInnerTop} x2={topMinX} y2={yInnerTop} stroke="#d97706" strokeWidth="1" />
                            <line x1="100" y1={yInnerBottom} x2={bottomMinX} y2={yInnerBottom} stroke="#d97706" strokeWidth="1" />
                          </>
                        )}

                        {/* Labels for output values */}
                        <text x={topMaxX < 100 ? topMaxX - 5 : topMaxX + 5} y="15" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor={topMaxX < 100 ? "end" : "start"}>
                          τ_máx = {maxLocalTau.toFixed(1)} MPa
                        </text>

                        {config.type === "tubular" && (
                          <text x={topMinX < 100 ? topMinX - 5 : topMinX + 5} y={yInnerTop + 3} fill="#f59e0b" fontSize="7" textAnchor={topMinX < 100 ? "end" : "start"}>
                            τ_interior = {minLocalTau.toFixed(1)} MPa
                          </text>
                        )}
                        
                        <text x="105" y="86" fill="#4b5563" fontSize="8">Eje Central (τ=0)</text>

                        {/* Stress Concentration warning if r and step is active */}
                        <text x="100" y="155" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle" className="uppercase animate-pulse">
                          Fact. Conc. K_t = {stats.K.toFixed(2)} &middot; τ_máx K = {(maxLocalTau * stats.K).toFixed(1)} MPa
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
