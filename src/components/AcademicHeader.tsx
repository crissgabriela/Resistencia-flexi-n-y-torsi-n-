import { GraduationCap, Award, MapPin } from "lucide-react";

export default function AcademicHeader() {
  return (
    <header className="bg-slate-950/40 text-slate-200 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-5 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-cyan-500 rounded flex items-center justify-center shadow-lg shadow-cyan-950/20 shrink-0">
              <GraduationCap id="header-grad-icon" className="w-7 h-7 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                  Universidad de Talca
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  Chile
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1 text-white flex flex-wrap items-center gap-x-2">
                STRUX<span className="text-cyan-400 font-light text-sm ml-1 px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/20 uppercase tracking-widest font-mono">LAB</span>
                <span className="text-slate-600 font-normal text-lg">/</span>
                <span className="text-slate-100 font-semibold text-lg leading-none">Resistencia de Materiales</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Ingeniería Civil de Minas &middot; Laboratorio de Simulación Interactiva
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:self-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Docente Responsable
              </div>
              <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                <Award className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                Dra. Criss Carreño Bernales
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
              <div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Laboratorio
                </div>
                <div className="text-xs font-semibold text-emerald-400">
                  Simulaciones de Campo Real
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Short info banner */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-450 border-t border-slate-900 pt-4">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-cyan-400/90">Tema de estudio:</span> 
            <span className="text-slate-300">Torsión, Flexión Pura y Diagramas en Tiempo Real</span>
          </div>
          <span className="hidden sm:inline text-slate-800">|</span>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-450">Campus Curicó / Los Niches, UTF</span>
          </div>
        </div>
      </div>
    </header>
  );
}
