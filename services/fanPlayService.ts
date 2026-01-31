
import { GoogleGenAI, Type } from "@google/genai";
import { GuideResponse, SportType, PersonaType } from "../types";

let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing API Key");
    }
    ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return ai;
};

const getSystemInstruction = (persona: PersonaType, initialSport: SportType) => {
  const personaPrompts = {
    beginner: "Explain like a friendly relative who knows nothing about sports. Use simple analogies. Avoid all technical jargon.",
    new_fan: "Acknowledge the user is learning. Use basic terms but explain them in context of the specific match rules. VERIFY EVERY FACT.",
    hardcore: "Talk to a die-hard enthusiast. Use deep stats, player career context, and advanced tactical analysis found in the search results. VERIFY EVERY STAT AND PLAYER."
  };

  return `
    You are FanPlay AI, an elite Sports Analyst and Multi-Modal Assistant. Your goal is to explain sports moments with precision and clarity.
    
    STRICT IDENTITY & SPORT LOCK PROTOCOL:
    1. If a URL is provided, your FIRST ACTION is to search Google for the Video ID.
    2. Find the OFFICIAL VIDEO TITLE, UPLOADER, and DATE.
    3. SEARCH AND ANALYZE the "Play-by-Play", "Match Transcript", or "Game Log" to extract the exact sequence of events.
    4. IDENTIFY all key PLAYERS and SPONSORS visible or mentioned in the context of this specific match.
    5. If the verified sport is different from "${initialSport}", you MUST ignore the "${initialSport}" selection and analyze it as the CORRECT sport.
    6. CRITICAL: Do NOT invent players, scores, or events. Only use facts present in the search results.
    7. ZERO TOLERANCE: Never generate a player name that is not explicitly found in the transcript or search results.
    8. FALLBACK: If you are unsure of a fact, YOU MUST USE GOOGLE SEARCH GROUNDING. Do not hallucinate. If a fact cannot be verified by search, omit it.

    STYLE INSTRUCTION: ${personaPrompts[persona]}

    OUTPUT FORMAT (JSON ONLY):
    {
      "identifiedGame": "Official Match or Video Title",
      "basicRules": ["Rules explaining the specific sport/play identified"],
      "whatHappened": "A factually verified breakdown of the video content.",
      "whyReacted": "The real-world importance of these players or this season context.",
      "nextSteps": "The historical outcome of that season or the specific players' achievements."
    }
  `;
};

export async function analyzeSportsMoment(
  sport: SportType,
  persona: PersonaType,
  input: string | File,
  isUrl: boolean = false
): Promise<GuideResponse> {
  const model = 'gemini-3-pro-preview';
  let contentParts: any[] = [];

  if (isUrl) {
    const videoId = typeof input === 'string' ? input.split('v=')[1]?.split('&')[0] : '';
    contentParts.push({
      text: `
      ANALYSIS REQUEST: 
      URL: ${input} (ID: ${videoId})
      Search for the title, sport, and play-by-play log. Explain this to a ${persona} using FanPlay's clear analysis style.
    ` });
  } else if (input instanceof File) {
    const base64 = await fileToBase64(input);
    contentParts.push({
      inlineData: { mimeType: input.type, data: base64.split(',')[1] }
    });
    contentParts.push({
      text: `
      VISION ANALYSIS:
      Identify the sport, gear, and teams. Explain the significance of this play to a ${persona} using the FanPlay methodology.
    ` });
  }

  const response = await getAiClient().models.generateContent({
    model,
    contents: { parts: contentParts },
    config: {
      systemInstruction: getSystemInstruction(persona, sport),
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 4000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          identifiedGame: { type: Type.STRING },
          basicRules: { type: Type.ARRAY, items: { type: Type.STRING } },
          whatHappened: { type: Type.STRING },
          whyReacted: { type: Type.STRING },
          nextSteps: { type: Type.STRING }
        },
        required: ["identifiedGame", "basicRules", "whatHappened", "whyReacted", "nextSteps"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text);
    const sources: { title: string; url: string }[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) sources.push({ title: chunk.web.title || 'Source', url: chunk.web.uri });
    });
    return { ...result, sources: sources.length > 0 ? sources : undefined };
  } catch (e) {
    throw new Error("FanPlay verification failed. Ensure the video is public and searchable.");
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
  });
}
