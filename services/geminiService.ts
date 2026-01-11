
import { GoogleGenAI, Type } from "@google/genai";
import { FormData, GeneratedPrompt, ReferenceImage, AspectRatio, AppMode } from "../types";
import { MANDATORY_STRINGS } from "../constants";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const executeWithRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429;
    if (isQuotaError && retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return executeWithRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const correctPortuguese = async (text: string): Promise<string> => {
  if (!text.trim() || text.length < 5) return text;
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Corrija estritamente a gramática PT-BR deste briefing de imagem, sem mudar o sentido técnico: "${text}"`,
        config: { systemInstruction: "Você é um revisor técnico de marketing." }
      });
      return response.text?.trim() || text;
  });
};

export const suggestFieldsFromBriefing = async (formData: FormData): Promise<Partial<FormData>> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const briefingText = formData.finalBriefPt || formData.userBrief || "Produto genérico";
    const prompt = `Analise: "${briefingText}". Sugira JSON: objective (Catálogo ou Post Social), angle, shadow, background, tone.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objective: { type: Type.STRING },
            angle: { type: Type.STRING },
            shadow: { type: Type.STRING },
            background: { type: Type.STRING },
            tone: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateCreativePrompts = async (formData: FormData): Promise<GeneratedPrompt[]> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const isCatalog = formData.objective === AppMode.CATALOG;
      
      const systemInstruction = `Você é um Engenheiro de Prompts.
      OBJETIVO: ${formData.objective}.
      REGRAS: 
      - Se for Catálogo: Fundo BRANCO OU CINZA NEUTRO apenas. Sem cenários. Sem pessoas. Foco total no produto.
      - Se for Social: Criar ambientação realista.
      - NUNCA adicionar texto decorativo na imagem, EXCETO se solicitado especificamente na PERSONALIZAÇÃO.
      - FIDELIDADE: O produto deve ter os mesmos entalhes e logos da referência, A MENOS que o campo de PERSONALIZAÇÃO solicite alteração.`;

      const parts: any[] = [{ 
        text: `Gere 2 variações para: ${formData.productName}. 
        Material: ${formData.material}.
        Briefing: ${formData.userBrief}.
        ALTERAÇÕES DE PERSONALIZAÇÃO/SOBREPOSIÇÃO: ${formData.customPersonalization || "Manter original da referência"}.` 
      }];
      
      const heroImage = formData.referenceImages.find(img => img.isHero);
      if (heroImage) {
          parts.push({ inlineData: { mimeType: heroImage.mimeType, data: heroImage.dataUrl.split(',')[1] } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                layout: { type: Type.STRING },
                promptPt: { type: Type.STRING },
                negativePt: { type: Type.STRING },
                highlights: { type: Type.STRING }
              }
            }
          }
        },
      });

      return JSON.parse(response.text || "[]");
  });
};

export const prepareTechnicalPrompt = async (
  promptPt: string,
  negativePt: string,
  settings: any,
  referenceImages: ReferenceImage[]
) => {
  const isCatalog = settings.objective === AppMode.CATALOG;
  const ai = getAiClient();

  // Tradução do prompt principal
  const translation = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate to English focusing ONLY on technical visual description (materials, lighting, sharpness), DO NOT add creative flair: "${promptPt}"`
  });
  const promptEnTranslated = translation.text || promptPt;

  // Tradução da personalização se existir
  let customizationEn = "";
  if (settings.customPersonalization) {
    const customTrans = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate this specific product customization instruction to technical English: "${settings.customPersonalization}"`
    });
    customizationEn = customTrans.text || settings.customPersonalization;
  }

  const customizationBlock = customizationEn 
    ? `CUSTOM PERSONALIZATION (PRIORITY OVERRIDE): ${customizationEn}. Change only the specific part mentioned, keeping all other product traits from the reference.` 
    : "";

  // Montagem do Prompt com base na Hierarquia de Autoridade
  let finalPromptEn = `
    PRODUCT PHOTOGRAPHY, 8K RESOLUTION. 
    ${MANDATORY_STRINGS.FIDELITY_RULES}
    ${customizationBlock}
    
    OBJECTIVE: ${isCatalog ? MANDATORY_STRINGS.CATALOG : MANDATORY_STRINGS.SOCIAL}
    
    TECHNICAL SPECS:
    - Angle: ${settings.angle}
    - Shadow: ${settings.shadow}
    - Lighting: Professional Studio Light.
    - Background: ${isCatalog ? (settings.catalogBackground || "Pure solid white studio background, no scenery") : (settings.background || "Realistic environment")}.
    
    CONTENT:
    - Main Subject: ${promptEnTranslated}
    - Material Details: Must preserve original textures and engravings.
    - Props: ${settings.props?.length > 0 ? `Include ${settings.props.join(", ")} logically placed on or near the product.` : "NO PROPS."}
    
    ${(settings.customPersonalization || settings.marketingDirection === 'Texto integrado') ? "" : MANDATORY_STRINGS.NO_TEXT_ENFORCEMENT}
  `.replace(/\s+/g, " ").trim();

  return {
    promptEn: promptEnTranslated,
    negativeEn: `${MANDATORY_STRINGS.NEGATIVE_SUFFIX}, ${negativePt}`,
    finalPromptEn: finalPromptEn
  };
};

export const generateImageFromPrompt = async (
  finalPromptEn: string,
  referenceImages: ReferenceImage[],
  aspectRatio: AspectRatio
): Promise<string> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const parts: any[] = [{ text: finalPromptEn }];
      
      const hero = referenceImages.find(img => img.isHero);
      if (hero) {
          parts.push({ 
            inlineData: { 
              data: hero.dataUrl.split(',')[1], 
              mimeType: hero.mimeType 
            } 
          });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { 
            imageConfig: { aspectRatio: aspectRatio as any } 
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (!imagePart?.inlineData) throw new Error("Image generation failed.");
      
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  });
};

export const generateStructuredBrief = async (formData: FormData): Promise<any> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const prompt = `Gere brief_pt e copy_pt (title, subtitle, offer) para ${formData.productName}. MODO: ${formData.objective}. JSON.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brief_pt: { type: Type.STRING },
            copy_pt: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                offer: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};
