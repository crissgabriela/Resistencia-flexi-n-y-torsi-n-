import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, BookOpen, Quote, HelpCircle } from "lucide-react";
import { BeamConfig, ShaftConfig, Material } from "../types";

interface AiStudyBuddyProps {
  activeTab: "flexion" | "torsion";
  beamConfig: BeamConfig;
  shaftConfig: ShaftConfig;
  selectedMaterial: Material;
  // Bending stats
  I_beam: number;
  maxSigma: number;
  reactions: { R1: number; R2: number; M_wall: number };
  // Torsion stats
  J_shaft: number;
  maxTau: number;
  totalPhi: number;
}

export default function AiStudyBuddy({
  activeTab,
  beamConfig,
  shaftConfig,
  selectedMaterial,
  I_beam,
  maxSigma,
  reactions,
  J_shaft,
  maxTau,
  totalPhi,
}: AiStudyBuddyProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt templates based on the mode the student is interacting with
  const suggestions = {
    flexion: [
      "¿Por qué los esfuerzos normales son nulos en el eje neutro?",
      "¿Cómo influyen el alto y ancho de la viga en la curva de flexión?",
      "Diferencia entre sección rectangular e I-Beam en términos de eficiencia de material",
      "¿Cómo se determinan físicamente los puntos de cortante máximo?",
    ],
    torsion: [
      "¿De dónde viene la ecuación general de torsión (tau = T*rho/J)?",
      "Explícame por qué el eje tubular es mejor que el macizo bajo torsión",
      "¿Qué es la concentración de esfuerzos y cómo influye el radio del filete?",
      "¿Cómo afectaría aumentar el módulo de rigidez G al ángulo de giro?",
    ],
  };

  useEffect(() => {
    // Scroll to response when generated
    if (response) {
      responseEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [response]);

  const handleAsk = async (customText?: string) => {
    const textQuery = customText || question;
    if (!textQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    // Build the configuration payload to send to the server
    const payload = {
      topic: activeTab,
      detail: textQuery,
      configData: activeTab === "flexion" 
        ? {
            beamType: beamConfig.type,
            length: beamConfig.length,
            pointForce: beamConfig.pointForce,
            pointForcePos: beamConfig.pointForcePos,
            distForce: beamConfig.distForce,
            sectionType: beamConfig.sectionType,
            b: beamConfig.b,
            h: beamConfig.h,
            flangeW: beamConfig.flangeW,
            flangeT: beamConfig.flangeT,
            webH: beamConfig.webH,
            webT: beamConfig.webT,
            R1: reactions.R1,
            R2: reactions.R2,
            I: I_beam,
            maxSigma,
          }
        : {
            shaftType: shaftConfig.type,
            length: shaftConfig.length,
            c_o: shaftConfig.c_o,
            c_i: shaftConfig.c_i,
            T1: shaftConfig.T1,
            T2: shaftConfig.T2,
            T3: shaftConfig.T3,
            G: selectedMaterial.G,
            materialName: selectedMaterial.name,
            J: J_shaft,
            maxTau,
            totalPhi,
          }
    };

    try {
      const res = await fetch("/api/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener respuesta del tutor de IA. El servidor respondió con un error.");
      }

      const data = await res.json();
      setResponse(data.explanation);
      if (!customText) {
        setQuestion("");
      }
    } catch (err: any) {
      setError(err?.message || "Error al conectar con la IA. Asegúrate de tener configurada tu GEMINI_API_KEY.");
    } finally {
      setLoading(false);
    }
  };

  // Safe manual parsing for basic markdown to HTML (paragraphs, bullet points, headers, bold text)
  const formatResponse = (text: string) => {
    return text.split("\n").map((line, index) => {
      let cleanLine = line.trim();
      if (!cleanLine) return <div key={index} className="h-2"></div>;

      // Handle simple headers
      if (cleanLine.startsWith("###")) {
        return (
          <h4 key={index} className="text-base font-bold text-cyan-300 mt-4 mb-2">
            {cleanLine.replace("###", "").trim()}
          </h4>
        );
      }
      if (cleanLine.startsWith("##")) {
        return (
          <h3 key={index} className="text-lg font-bold text-cyan-400 mt-4 mb-2 border-b border-cyan-500/10 pb-1">
            {cleanLine.replace("##", "").trim()}
          </h3>
        );
      }
      if (cleanLine.startsWith("#")) {
        return (
          <h2 key={index} className="text-xl font-bold text-cyan-400 mt-4 mb-2">
            {cleanLine.replace("#", "").trim()}
          </h2>
        );
      }

      // Handle bullet points
      if (cleanLine.startsWith("*") || cleanLine.startsWith("-")) {
        const content = cleanLine.substring(1).trim();
        return (
          <li key={index} className="ml-4 list-disc text-slate-300 py-1 pl-1">
            {parseBoldText(content)}
          </li>
        );
      }

      // Handle numbered lists
      if (/^\d+\./.test(cleanLine)) {
        const match = cleanLine.match(/^(\d+\.)(.*)/);
        if (match) {
          return (
            <div key={index} className="ml-4 pl-1 py-1 text-slate-300 flex items-start gap-2">
              <span className="font-bold text-rose-400 shrink-0">{match[1]}</span>
              <span>{parseBoldText(match[2].trim())}</span>
            </div>
          );
        }
      }

      // Regular paragraph
      return (
        <p key={index} className="text-slate-300 leading-relaxed py-1.5 text-sm">
          {parseBoldText(cleanLine)}
        </p>
      );
    });
  };

  // Helper helper to replace **text** with <strong>text</strong> React elements
  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-white font-semibold">{part}</strong>;
      }
      // Parse inline mathematical code tags like `sigma`
      const subParts = part.split(/`([\s\S]*?)`/g);
      return subParts.map((subPart, subI) => {
        if (subI % 2 === 1) {
          return <code key={subI} className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-cyan-300 text-xs">{subPart}</code>;
        }
        return subPart;
      });
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mt-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-950 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Tutor de IA Integrado</h3>
            <p className="text-xs text-slate-400">Consultas a la docente Criss Carreño Bernales con Gemini AI</p>
          </div>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full">
          UTALCA Estudiante
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Quick explanations pane (Left) */}
          <div className="lg:col-span-4 space-y-4 lg:border-r lg:border-slate-800 lg:pr-6">
            <div className="flex items-center gap-2 text-cyan-400">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Preguntas Sugeridas</span>
            </div>
            
            <p className="text-xs text-slate-400 leading-normal">
              Haz clic en cualquier pregunta para analizarla aplicando los valores dinámicos configurados arriba:
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {suggestions[activeTab].map((suggest, index) => (
                <button
                  key={index}
                  onClick={() => handleAsk(suggest)}
                  disabled={loading}
                  className="text-left text-xs text-slate-300 hover:text-cyan-400 bg-slate-950/40 hover:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 hover:border-cyan-500/20 transition-all cursor-pointer flex gap-1.5 items-start group disabled:opacity-50"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-500/60 group-hover:text-cyan-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{suggest}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat / Reply pane (Right) */}
          <div className="lg:col-span-8 flex flex-col justify-between min-h-[350px]">
            <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-5 grow overflow-y-auto mb-4 max-h-[400px]">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <div className="text-xs text-slate-300 font-medium">La docente Criss Carreño está formulando la deducción física...</div>
                  <div className="text-[10px] text-slate-500">Calculando inercias, cargas y tensiones en tiempo real</div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex flex-col gap-1">
                  <span className="font-bold">Error de Conexión:</span>
                  <span>{error}</span>
                  <button 
                    onClick={() => handleAsk()}
                    className="mt-2 text-left text-[11px] underline text-red-350 select-none"
                  >
                    Haga clic aquí para volver a intentarlo
                  </button>
                </div>
              )}

              {!loading && !error && !response && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                    <Quote className="w-5 h-5 text-cyan-400/50" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">Laboratorio de Mecánica e Ingeniería</h4>
                  <p className="text-xs max-w-md">
                    Haz una pregunta o presiona una sugerencia para recibir una lección docente personalizada en base a tus cargas y esfuerzos calculados.
                  </p>
                </div>
              )}

              {!loading && !error && response && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-slate-950 uppercase select-none shrink-0">
                      CC
                    </div>
                    <div>
                       <div className="text-xs font-semibold text-slate-200">Explicación del Módulo</div>
                      <div className="text-[10px] text-slate-400 font-mono">Criss Carreño Bernales</div>
                    </div>
                  </div>
                  <div className="pr-1">{formatResponse(response)}</div>
                  <div ref={responseEndRef} />
                </div>
              )}
            </div>

            {/* Input form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Escribe tu consulta sobre esfuerzos o deformaciones (e.g. ¿Qué significa el signo del momento flector?)..."
                disabled={loading}
                className="grow bg-slate-950 text-white rounded-xl px-4 py-3 text-sm border border-slate-800 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-500 font-sans"
              />
              <button
                onClick={() => handleAsk()}
                disabled={loading || !question.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-805 disabled:text-slate-500 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Send className="w-4 h-4 text-slate-950" />}
                <span className="hidden sm:inline">Preguntar</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
