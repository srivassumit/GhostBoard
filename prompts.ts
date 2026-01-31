
import { Type } from "@google/genai";

export const VISION_PROMPT = `Analyze this sports play image. 
1. Identify the specific sport being played (e.g. Soccer, Tennis, Basketball, American Football, Cricket).
2. Identify all key players on the field and the ball. 
3. Identify the Goal, Net, Basket, or Wickets if visible (set type to 'goal_net').
4. Return a JSON object containing the detected sport and an array of players/items.

Coordinates (x, y) must be integers from 0 to 100 representing their position relative to the image dimensions (percentage).
Team should be 'home', 'away', or 'neutral'.
Type should be 'player', 'ball', or 'goal_net'.
Label should be a short identifier like 'ST', 'GK', 'DEF-1', 'BALL', 'NET'.

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
          type: { type: Type.STRING, enum: ['player', 'ball', 'goal_net'] },
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
1. **Context:** Use the specific rules and tactical trends of ${sport}. Use Google Search to verify specific rule constraints.
2. **Goal Orientation:** If a 'goal_net' object is present, calculate the vector from the 'ball' to the 'goal_net'.
3. **Phase of Play:** Is this a high-threat scoring opportunity or a low-threat situation?
4. **Verdict Logic:**
   - 'Goal Likely': The sequence MUST show the ball entering the goal/net area.
   - 'Defense Likely': The sequence MUST show a defender intercepting or the ball missing.
   - 'No Immediate Threat': Minimal movement or possession recycling.

**Task:**
1. Analyze the movement.
2. Predict the immediate outcome.
3. **Generate a Prediction Sequence:** Create 6 sequential frames (steps) of coordinates showing how the play unfolds over the next 2-3 seconds. 
   - Move the ball and key players. 
   - Step 1 is the immediate next moment. Step 6 is the final outcome (goal or clearance).
4. Discuss the 'Butterfly Effect'.
5. Estimate 'Scoring Probability'.

Format your response as a JSON object:
{
  "analysis": "Detailed tactical breakdown...",
  "verdict": "Goal Likely | Defense Likely | Inconclusive | No Immediate Threat",
  "butterflyEffect": "Explanation...",
  "originalWinProbability": 5,
  "newWinProbability": 12,
  "predictionSequence": [
    { "step": 1, "updates": [{ "id": "ball-1", "x": 55, "y": 40 }, { "id": "p-1", "x": 52, "y": 42 }] },
    ...
  ]
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
    predictionSequence: {
      type: Type.ARRAY,
      description: "A sequence of 6 coordinate steps simulating the future play",
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER },
          updates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER }
              }
            }
          }
        }
      }
    }
  },
  required: ['analysis', 'verdict', 'butterflyEffect', 'originalWinProbability', 'newWinProbability', 'predictionSequence'],
};
