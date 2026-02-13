
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAISuggestions = async (prompt: string): Promise<AISuggestion[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this context: "${prompt}", suggest 3 creative color schemes (primary and secondary hex codes) and professional labels for a QR code. 
    Think about brand psychology (e.g., tech uses blues, food uses reds/yellows, luxury uses black/gold).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING, description: "Hex code for the QR dots" },
            secondaryColor: { type: Type.STRING, description: "Hex code for the background" },
            label: { type: Type.STRING, description: "A short, catchy label for this style (e.g., 'Midnight Tech', 'Sunset Vibes')" },
            description: { type: Type.STRING, description: "A brief reason for this choice" }
          },
          required: ["primaryColor", "secondaryColor", "label", "description"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return [];
  }
};
