
import { GoogleGenAI, Type } from "@google/genai";
import { CalorieResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    totalCalories: { type: Type.NUMBER, description: "Общо калории (kcal)" },
    totalWeight: { type: Type.STRING, description: "Общо тегло (напр. 450г)" },
    protein: { type: Type.NUMBER, description: "Общо протеини (г)" },
    carbs: { type: Type.NUMBER, description: "Общо въглехидрати (г)" },
    fat: { type: Type.NUMBER, description: "Общо мазнини (г)" },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Име на продукта на български" },
          weightValue: { type: Type.NUMBER, description: "Числена стойност в грамове за този продукт" },
          calories: { type: Type.NUMBER, description: "Калории за това количество" },
          protein: { type: Type.NUMBER, description: "Протеини (г)" },
          carbs: { type: Type.NUMBER, description: "Въглехидрати (г)" },
          fat: { type: Type.NUMBER, description: "Мазнини (г)" }
        },
        required: ["name", "weightValue", "calories", "protein", "carbs", "fat"]
      }
    },
    explanation: { type: Type.STRING, description: "Обяснение на български" }
  },
  required: ["totalCalories", "totalWeight", "protein", "carbs", "fat", "ingredients", "explanation"]
};

export const analyzeFood = async (imagesBase64: string[], notes: string): Promise<CalorieResult> => {
  const imageParts = imagesBase64.map(base64 => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64
    }
  }));

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          ...imageParts,
          {
            text: `Анализирай тези снимки на храна с професионална точност.
            Бележки от потребителя: "${notes}".
            
            Инструкции:
            1. Цялата информация да е на БЪЛГАРСКИ ЕЗИК.
            2. Изчисли теглото и макросите за ВСЕКИ продукт поотделно.
            3. Бъди изключително прецизен с порциите, базирайки се на чинията и околната среда.
            4. Не завишавай калориите излишно, ако ястието изглежда леко.
            5. Ако има дресинг, оцени го като отделен елемент в списъка съставки.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  const response = await model;
  const result = JSON.parse(response.text || "{}");
  return result as CalorieResult;
};
