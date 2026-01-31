export const cleanGeminiJSON = (text: string): string => {
    // Remove markdown code blocks if present
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    // Trim whitespace
    clean = clean.trim();
    return clean;
};