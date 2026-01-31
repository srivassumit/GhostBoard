
import { GoogleGenAI } from "@google/genai";
import { VISION_PROMPT, PLAYER_SCHEMA, SIMULATION_PROMPT, SIMULATION_SCHEMA } from "../constants";
import { Player, SimulationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeSportsFrame(base64Image: string): Promise<Player[]> {
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

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse vision response", e);
    return [];
  }
}

export async function simulatePlay(original: Player[], modified: Player[]): Promise<SimulationResult> {
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

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse simulation response", e);
    return {
      analysis: "Error analyzing the simulation.",
      verdict: "Inconclusive",
      butterflyEffect: "The simulation engine encountered a data mismatch."
    };
  }
}
