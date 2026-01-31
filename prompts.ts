
import { Type } from "@google/genai";

export const VISION_PROMPT = `Analyze this sports play image. 
1. Identify the specific sport being played (e.g. Soccer, Tennis, Basketball, American Football, Cricket).
2. Identify all key players on the field and the ball. 
3. Return a JSON object containing the detected sport and an array of players.

Coordinates (x, y) must be integers from 0 to 100 representing their position relative to the image dimensions (percentage).
Team should be 'home', 'away', or 'neutral'.
Type should be 'player' or 'ball'.
Label should be a short identifier like 'ST', 'GK', 'DEF-1', 'BALL'.

Respond ONLY with valid JSON.`;

export const PLAYER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sport: { type: Type.STRING, description: "The name of the sport detected (e.g. Soccer, Basketball)" },
    players: {
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
    }
  },
  required: ['sport', 'players']
};

export const SIMULATION_PROMPT = (original: string, modified: string, sport: string) => `
You are a world-class ${sport} tactical analyst and physics expert. 
I am providing you with two states of a ${sport} play (Original vs Modified positions).

ORIGINAL STATE (JSON):
${original}

MODIFIED STATE (JSON):
${modified}

**GROUNDING INSTRUCTIONS (CRITICAL):**
1. **Context:** Use the specific rules and tactical trends of ${sport}. Use Google Search to verify specific rule constraints (e.g., offside lines in Soccer, formations in American Football) if needed to ground your answer.
2. **Phase of Play:** Is this a high-threat scoring opportunity or a low-threat situation?
3. **Do Not Hallucinate:** If the situation doesn't warrant a score, verdict should be 'No Immediate Threat'.
4. **Verdict Logic:**
   - If a score/goal is imminent/plausible in the Modified state -> 'Goal Likely'
   - If the defense neutralizes the threat -> 'Defense Likely'
   - If no immediate scoring chance -> 'No Immediate Threat'
   - If too complex -> 'Inconclusive'

**Task:**
1. Analyze the movement of players from the ORIGINAL to the MODIFIED state.
2. Predict the immediate outcome based on ${sport} physics and strategy.
3. Discuss the 'Butterfly Effect': How does shifting these players change the shape?
4. Estimate 'Scoring Probability' (Chance of a goal/point in this phase, 0-100).

Format your response as a JSON object:
{
  "analysis": "Detailed tactical breakdown...",
  "verdict": "Goal Likely | Defense Likely | Inconclusive | No Immediate Threat",
  "butterflyEffect": "Explanation of space and angles created or closed.",
  "originalWinProbability": 5,
  "newWinProbability": 12
}
`;

export const SIMULATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    analysis: { type: Type.STRING },
    verdict: { type: Type.STRING, enum: ['Goal Likely', 'Defense Likely', 'Inconclusive', 'No Immediate Threat'] },
    butterflyEffect: { type: Type.STRING },
    originalWinProbability: { type: Type.INTEGER },
    newWinProbability: { type: Type.INTEGER },
  },
  required: ['analysis', 'verdict', 'butterflyEffect', 'originalWinProbability', 'newWinProbability'],
};
