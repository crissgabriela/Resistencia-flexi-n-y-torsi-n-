import { useState } from "react";
import { 
  RefreshCw, 
  Settings, 
  HelpCircle, 
  BookOpen, 
  Layers, 
  TrendingUp, 
  CheckCircle,
  FileText,
  Sliders,
  ChevronRight,
  Calculator,
  Cpu
} from "lucide-react";

import AcademicHeader from "./components/AcademicHeader";
import BeamModule from "./components/BeamModule";
import ShaftModule from "./components/ShaftModule";
import AiStudyBuddy from "./components/AiStudyBuddy";

import { MATERIALS } from "./materials";
import { calculateBeam, calculateShaft } from "./physics";
import { BeamConfig, ShaftConfig } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"flexion" | "torsion">("flexion");

  // Lifted state to feed into both components and the AI study buddy simultaneously
  const [beamMaterial, setBeamMaterial] = useState(MATERIALS[0]);
  const [shaftMaterial, setShaftMaterial] = useState(MATERIALS[0]);

  const [beamConfig, setBeamConfig] = useState<BeamConfig>({
    type: "simply_supported",
    length: 5.0,
    sectionType: "rectangular",
    b: 0.15,
    h: 0.30,
    flangeW: 0.20,
    flangeT: 0.02,
    webH: 0.25,
    webT: 0.015,
    pointForce: 5.0,
    pointForcePos: 2.5,
    distForce: 1.5,
  });

  const [shaftConfig, setShaftConfig] = useState<ShaftConfig>({
    type: "solid",
    length: 2.0,
    c_o: 0.04,
    c_i: 0.025,
    T1: 250,
    T2: -400,
    T3: 150,
    materialId: MATERIALS[0].id,
    filletRadius: 0.005,
    stepLargeRadius: 0.06,
  });

  // Execute calculations to serve AI Study Buddy context directly from App core
  const beamStats = calculateBeam(beamConfig, beamMaterial);
  const shaftStats = calculateShaft(shaftConfig, shaftMaterial);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-200 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16">
      
      {/* University & Professor Branding Academic Header */}
      <AcademicHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* LANDING PAGE - HERO INTRODUCTORY BANNER */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/50 border border-slate-800 p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Portal de Aprendizaje e Ingeniería
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Aprende Estructuras e <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Inercia Mecánica</span> de forma Interactiva.
            </h2>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Plataforma docente interactiva diseñada para asimilar de manera práctica los conceptos de deformaciones, ángulos de giro y distribución de esfuerzos internos en tiempo real.
            </p>
            
            {/* Quick module feature bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Diagramas automáticos de Cortante V(x) y Momento Flector M(x)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Cálculo dinámico de Momentos de Inercia I_z y J</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Distribuciones de Esfuerzos Normales y Cortantes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Consola de Tutor Académico guiada por IA de Gemini</span>
              </div>
            </div>
          </div>
        </div>

        {/* SELECT MODULE NAVIGATION SWITCHER */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Layers id="module-select-icon" className="w-4 h-4 text-cyan-500" />
              Selecciona el Laboratorio de Análisis
            </h3>
            <span className="text-xs text-slate-500">Haz clic en una pestaña para cargar el módulo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pestaña Módulo Flexión */}
            <button
              onClick={() => setActiveTab("flexion")}
              className={`text-left p-6 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                activeTab === "flexion"
                  ? "bg-slate-900/95 border-cyan-500 shadow-xl shadow-cyan-950/20"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-705 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl transition-colors ${activeTab === "flexion" ? "bg-cyan-500 text-slate-950" : "bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-slate-200"}`}>
                  <Calculator className="w-6 h-6" />
                </div>
                {activeTab === "flexion" ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2.5 py-1 text-[10px] font-bold uppercase">
                    Activo
                  </span>
                ) : (
                  <span className="bg-slate-950 text-slate-500 border border-slate-800/80 rounded px-2.5 py-1 text-[10px] uppercase font-mono tracking-widest">
                    Cargar
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                  Módulo de Flexión en Vigas
                </h4>
                <p className="text-xs text-slate-450 mt-1 leading-normal">
                  Vigas simplemente apoyadas o en voladizo, cargas puntuales y distribuidas, perfiles rectangulares o en I, diagramas V-M y tensiones normales σ.
                </p>
              </div>
            </button>

            {/* Pestaña Módulo Torsión */}
            <button
              onClick={() => setActiveTab("torsion")}
              className={`text-left p-6 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                activeTab === "torsion"
                  ? "bg-slate-900/95 border-cyan-500 shadow-xl shadow-cyan-950/20"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-705 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl transition-colors ${activeTab === "torsion" ? "bg-cyan-500 text-slate-950" : "bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-slate-200"}`}>
                  <Sliders className="w-6 h-6" />
                </div>
                {activeTab === "torsion" ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2.5 py-1 text-[10px] font-bold uppercase">
                    Activo
                  </span>
                ) : (
                  <span className="bg-slate-950 text-slate-500 border border-slate-800/80 rounded px-2.5 py-1 text-[10px] uppercase font-mono tracking-widest">
                    Cargar
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors font-sans">
                  Módulo de Torsión en Ejes
                </h4>
                <p className="text-xs text-slate-450 mt-1 leading-normal">
                  Ejes cilíndricos sólidos o tubulares/huecos, aplicación de múltiples torques y poleas, constantes polares, perfil de ángulos ϕ y concentradores de esfuerzos K.
                </p>
              </div>
            </button>

          </div>
        </section>

        {/* COMPONENT MODULE DISPLAY INJECTION AREA */}
        <section className="bg-slate-950/20 border-t border-slate-900 pt-2">
          {activeTab === "flexion" ? (
            <BeamModule 
              materials={MATERIALS} 
            />
          ) : (
            <ShaftModule 
              materials={MATERIALS} 
            />
          )}
        </section>

        {/* INTEGRATED COOPERATIVE AI MODULE */}
        <section className="pt-2">
          <AiStudyBuddy
            activeTab={activeTab}
            beamConfig={beamConfig}
            shaftConfig={shaftConfig}
            selectedMaterial={activeTab === "flexion" ? beamMaterial : shaftMaterial}
            I_beam={beamStats.I}
            maxSigma={beamStats.maxSigma}
            reactions={beamStats.reactions}
            J_shaft={shaftStats.J}
            // cast force safely
            maxTau={typeof shaftStats.maxTau === "string" ? parseFloat(shaftStats.maxTau) : shaftStats.maxTau}
            totalPhi={shaftStats.totalPhi}
          />
        </section>

      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 border-t border-slate-900 pt-8 text-center text-xs text-slate-500 space-y-1.5 leading-normal">
        <p className="font-semibold text-slate-400">Universidad de Talca - Facultad de Ingeniería</p>
        <p>Departamento de Ingeniería de Minas &middot; Módulo: Resistencia de Materiales</p>
        <p className="text-[11px] text-slate-600 font-medium">
          Diseño educativo optimizado con simulaciones de momentos y torsor interactivos. Dr. Criss Carreño Bernales &middot; {new Date().getFullYear()}
        </p>
      </footer>

    </div>
  );
}
