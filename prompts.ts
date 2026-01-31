
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
I am providing you with two states of a sports play (Original vs Modified positions).

ORIGINAL STATE (JSON):
${original}

MODIFIED STATE (JSON):
${modified}

**GROUNDING INSTRUCTIONS (CRITICAL):**
1. **Assess the Phase of Play:** Is this a high-threat scoring opportunity (e.g., inside the box, counter-attack, free kick) or a low-threat situation (e.g., midfield build-up, defensive possession, kickoff)?
2. **Do Not Hallucinate:** If the ball is in midfield or the defense is set and stable, DO NOT predict a goal just to be exciting.
3. **Verdict Logic:**
   - If a goal is imminent/plausible in the Modified state -> 'Goal Likely'
   - If the defense successfully neutralizes the threat -> 'Defense Likely'
   - If the situation is just possession/build-up with no immediate shot -> 'No Immediate Threat'
   - If too complex/unclear -> 'Inconclusive'

**Task:**
1. Analyze the movement of players from the ORIGINAL to the MODIFIED state.
2. Predict the immediate outcome.
3. Discuss the 'Butterfly Effect': How does shifting these players change the shape?
4. Estimate 'Scoring Probability' (Chance of a goal in this specific phase, 0-100).
   - If Verdict is 'No Immediate Threat', this should be low (0-15).

Format your response as a JSON object:
{
  "analysis": "Detailed tactical breakdown. If low threat, describe the possession structure.",
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
