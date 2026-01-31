
import { Type } from "@google/genai";

export const VISION_PROMPT = `Analyze this sports play image. 
Identify all key players on the field and the ball. 
Return a JSON array of objects representing their positions.
Coordinates (x, y) must be integers from 0 to 100 representing their position relative to the image dimensions (percentage).
Team should be 'home', 'away', or 'neutral'.
Type should be 'player' or 'ball'.
Label should be a short identifier like 'ST', 'GK', 'DEF-1', 'BALL'.

Respond ONLY with valid JSON.`;

export const PLAYER_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['player', 'ball'] },
      team: { type: Type.STRING, enum: ['home', 'away', 'neutral'] },
      x: { type: Type.INTEGER },
      y: { type: Type.INTEGER },
      label: { type: Type.STRING },
    },
    required: ['id', 'type', 'team', 'x', 'y', 'label'],
  },
};

export const SIMULATION_PROMPT = (original: string, modified: string) => `
You are a world-class sports tactical analyst and physics expert. 
I am providing you with two states of a sports play.

ORIGINAL STATE (JSON):
${original}

MODIFIED STATE (JSON):
${modified}

Task:
1. Analyze the movement of players from the ORIGINAL to the MODIFIED state.
2. Predict the outcome of this specific play if the players had been in the NEW positions.
3. Discuss the 'Butterfly Effect': How does shifting these specific players change the defensive shape or attacking opportunity?
4. Provide a tactical verdict.

Format your response as a JSON object:
{
  "analysis": "Detailed tactical breakdown...",
  "verdict": "Success | Failure | Inconclusive",
  "butterflyEffect": "Short explanation of the cascading changes..."
}
`;

export const SIMULATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    analysis: { type: Type.STRING },
    verdict: { type: Type.STRING, enum: ['Success', 'Failure', 'Inconclusive'] },
    butterflyEffect: { type: Type.STRING },
  },
  required: ['analysis', 'verdict', 'butterflyEffect'],
};
