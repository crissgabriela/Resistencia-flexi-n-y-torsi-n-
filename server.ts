import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Tutor / Explainer endpoint for Strength of Materials
app.post("/api/ai-explain", async (req, res) => {
  try {
    const { topic, detail, configData } = req.body;
    
    const client = getGeminiClient();
    
    const systemInstruction = `
Eres un distinguido Profesor de Ingeniería de Minas y Mecánica de Materiales de la Universidad de Talca, Chile, llamado Dr. Criss Carreño Bernales.
Tu tono es académico, alentador, sumamente claro y empático. Sabes que los estudiantes necesitan entender la física detrás de las ecuaciones.
Explica de manera concisa pero profunda los resultados, usa notación matemática clara en texto plano (como sigma = -My/I, J = pi/2 * c^4, etc.).
Siempre haz referencia a la aplicación en la ingeniería práctica, por ejemplo, en obras mineras o estructuras reales, para motivar al alumno.
Adapta el idioma a español de Chile técnico, pero universalmente comprensible.
    `;

    let userPrompt = "";
    if (topic === "flexion") {
      userPrompt = `
Por favor, explícame conceptualmente y analiza físicamente el siguiente caso de flexión de una viga:
- Tipo de viga: ${configData.beamType === "simply_supported" ? "Simplemente apoyada (Apoyo simple en extremos)" : "En voladizo (Cantilever - Empotrada en un extremo)"}
- Longitud de la viga: ${configData.length} m
- Carga puntual (Fuerza concentrada P): ${configData.pointForce} kN a ${configData.pointForcePos} m del extremo izquierdo.
- Carga distribuida uniforme w: ${configData.distForce} kN/m a todo lo largo de la viga.
- Tipo de Sección transversal: ${configData.sectionType === "rectangular" ? "Rectangular" : "Sección en I (Doble T)"}
- Dimensiones de la sección: ${configData.sectionType === "rectangular" ? `Ancho b = ${configData.b * 1000} mm, Alto h = ${configData.h * 1000} mm` : `Ancho de ala = ${configData.flangeW * 1000} mm, Espesor de ala = ${configData.flangeT * 1000} mm, Alto del alma = ${configData.webH * 1000} mm, Espesor del alma = ${configData.webT * 1000} mm`}

Calculamos los siguientes resultados en el simulador:
- Reacción Izquierda R1: ${configData.R1.toFixed(2)} kN
- Reacción Derecha R2: ${configData.R2.toFixed(2)} kN
- Momento de Inercia I_z: ${configData.I.toExponential(4)} m^4
- Esfuerzo Normal máximo absoluto: ${configData.maxSigma.toFixed(2)} MPa

Por favor, como profesor, dale a tu estudiante:
1. Una explicación física de cómo actúan las fibras a compresión (arriba) y tracción (abajo) basándote en la fórmula de flexión (sigma = -My/I).
2. Un análisis detallado de la ubicación del momento flector máximo absoluto y por qué la sección elegida es adecuada o cómo podría optimizarse para minería o construcción civil.
3. Un ejercicio corto propuesto o una pregunta de reflexión analítica rápida.
      `;
    } else if (topic === "torsion") {
      userPrompt = `
Por favor, explícame conceptualmente y analiza físicamente el siguiente caso de torsión de un eje circular:
- Tipo de eje: ${configData.shaftType === "solid" ? "Eje Sólido" : "Eje Tubular / Cilindro Hueco"}
- Longitud total: ${configData.length} m
- Módulo de rigidez al corte G: ${configData.G / 1e9} GPa (típico para el material configurado: ${configData.materialName})
- Dimensiones de la sección transversal: ${configData.shaftType === "solid" ? `Radio exterior c = ${configData.c_o * 1000} mm` : `Radio exterior c_o = ${configData.c_o * 1000} mm, Radio interior c_i = ${configData.c_i * 1000} mm`}
- Torques aplicados:
  - Torque T1 en el extremo izquierdo: ${configData.T1} N·m
  - Torque T2 en el medio: ${configData.T2} N·m
  - Torque T3 en el extremo derecho: ${configData.T3} N·m

Calculamos los siguientes resultados en el simulador:
- Momento Polar de Inercia J: ${configData.J.toExponential(4)} m^4
- Esfuerzo de corte máximo absoluto tau_max: ${configData.maxTau.toFixed(2)} MPa
- Ángulo total de torsión (giro) phi: ${configData.totalPhi.toFixed(4)} radianes (${(configData.totalPhi * 180 / Math.PI).toFixed(2)} grados)

Por favor, como profesor, dale a tu estudiante:
1. Una explicación de por qué los esfuerzos de tracción y corte se distribuyen linealmente desde cero en el centro, y cómo maximizar la eficiencia usando ejes tubulares (huecos). Usa la fórmula de torsión (tau = T*rho/J).
2. Un breve comentario sobre el ángulo de giro obtenido y cómo influye la rigidez a torsión (J*G) en transmisiones de potencia reales o winches de extracción minera.
3. Una breve pregunta conceptual o desafío académico corto para que piensen.
      `;
    } else {
      userPrompt = `
Explica de forma general e introductoria la importancia del módulo del momento flector y de torsión en la Resistencia de Materiales. Cuéntanos brevemente sobre las hipótesis de Navier-Bernoulli para flexión pura y las hipótesis de torsión para barras circulares de Saint-Venant.
      `;
    }

    if (detail) {
      userPrompt += `\nEl estudiante tiene esta duda específica: "${detail}"`;
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Error in AI explanation endpoint:", error);
    res.status(500).json({ error: error?.message || "Algo salió mal procesando la respuesta de la IA." });
  }
});

// Setup Vite or static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Express in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Express in PRODUCTION mode serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Vite server setup failed:", err);
});
