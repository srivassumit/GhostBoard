
import { GoogleGenAI } from "@google/genai";
import { VISION_PROMPT, PLAYER_SCHEMA, SIMULATION_PROMPT, SIMULATION_SCHEMA } from "../prompts";
import { Player, SimulationResult } from "../types";

// Initialize Gemini API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeSportsFrame(base64Image: string): Promise<{ players: Player[], sport: string }> {
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
      return { players: [], sport: 'Unknown' };
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Backend Error: Failed to analyze vision response", e);
    return { players: [], sport: 'Unknown' };
  }
}

export async function simulatePlay(original: Player[], modified: Player[], sport: string = 'Sports'): Promise<SimulationResult> {
  try {
    const prompt = SIMULATION_PROMPT(JSON.stringify(original), JSON.stringify(modified), sport);
    
    // Using Gemini 3 Pro with Google Search for grounding
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: SIMULATION_SCHEMA,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Backend: Empty response from simulation model");
    }

    const result = JSON.parse(text);

    // Extract grounding URLs if available
    const groundingUrls: string[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          groundingUrls.push(chunk.web.uri);
        }
      });
    }

    return {
      ...result,
      groundingUrls: Array.from(new Set(groundingUrls)) // Remove duplicates
    };

  } catch (e) {
    console.error("Backend Error: Failed to parse simulation response", e);
    return {
      analysis: "Error analyzing the simulation. Please try again.",
      verdict: "Inconclusive",
      butterflyEffect: "The simulation engine encountered a data mismatch or API error.",
      originalWinProbability: 0,
      newWinProbability: 0,
      predictionSequence: []
    };
  }
}