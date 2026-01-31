
import { GoogleGenAI } from "@google/genai";
import { VISION_PROMPT, PLAYER_SCHEMA, SIMULATION_PROMPT, SIMULATION_SCHEMA } from "../prompts";
import { Player, SimulationResult } from "../types";

// Initialize Gemini API Client
// In a production environment, this would run on a server.
// For this "GhostBoard" demo, it runs in the browser acting as the backend layer.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeSportsFrame(base64Image: string): Promise<Player[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: VISION_PROMPT }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: PLAYER_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("Backend: Empty response from vision model");
      return [];
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Backend Error: Failed to analyze vision response", e);
    return [];
  }
}

export async function simulatePlay(original: Player[], modified: Player[]): Promise<SimulationResult> {
  try {
    const prompt = SIMULATION_PROMPT(JSON.stringify(original), JSON.stringify(modified));
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: SIMULATION_SCHEMA,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Backend: Empty response from simulation model");
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Backend Error: Failed to parse simulation response", e);
    return {
      analysis: "Error analyzing the simulation. Please try again.",
      verdict: "Inconclusive",
      butterflyEffect: "The simulation engine encountered a data mismatch or API error.",
      originalWinProbability: 0,
      newWinProbability: 0
    };
  }
}
