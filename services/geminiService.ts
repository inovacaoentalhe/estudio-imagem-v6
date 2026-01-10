
import { GoogleGenAI, Type } from "@google/genai";
import { FormData, GeneratedPrompt, AppMode, ArtStyle, AspectRatio, TextPresence, CameraAngle, ShadowType, MarketingTone, Ambience, ReferenceImage, RotationDegree, BackgroundType } from "../types";
import { MANDATORY_STRINGS, ASPECT_RATIO_TECHNICAL_TEXTS, BASE_BRIEF_TEXT } from "../constants";

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
        contents: `Corrija estritamente a gramática e ortografia PT-BR do seguinte briefing técnico, mantendo o sentido original: "${text}"`,
        config: { systemInstruction: "Você é um revisor ortográfico PT-BR sênior especializado em marketing." }
      });
      return response.text?.trim() || text;
  });
};

export const generateStructuredBrief = async (formData: FormData): Promise<any> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const prompt = `
    ATUE COMO DIRETOR DE MARKETING E FOTOGRAFIA SÊNIOR.
    Gere um Briefing Final e sugestões de COPY atraentes.
    PRODUTO: ${formData.productName} | MATERIAL: ${formData.material}
    MODO: ${formData.objective} | ESTILO: ${formData.style}
    USER INPUT: ${formData.userBrief}
    TAREFA: Retorne JSON com brief_pt (instrução técnica imagem) e copy_pt (title, subtitle, offer).
    `;
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
              },
              required: ["title", "subtitle", "offer"]
            }
          },
          required: ["brief_pt", "copy_pt"]
        }
      }
    });
    return JSON.parse(response.text?.trim() || "{}");
  });
};

export const generateCreativePrompts = async (formData: FormData): Promise<GeneratedPrompt[]> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const allAmbiences = [...formData.suggestedAmbiences, ...formData.customAmbiences];
      const activeAmbience = allAmbiences.find(a => a.id === formData.selectedAmbienceId);
      const heroImage = formData.referenceImages.find(img => img.isHero);
      
      const systemInstruction = `Você é um Engenheiro de Prompts especialista em fotografia de produto.
      Gere 2 variações REALMENTE DIFERENTES para o produto ${formData.productName}.
      As variações DEVEM mudar: iluminação, composição/ângulo e fundo/superfície.
      AMBIENTAÇÃO OBRIGATÓRIA: ${activeAmbience?.description || "Estúdio profissional clássico"}.
      MODO: ${formData.objective}. TOM: ${formData.tone}.
      TEXTO: Use ${formData.textPresence}. Reserve espaço negativo apropriado.
      REGRAS CRÍTICAS: ZERO TEXTO NA IMAGEM. NUNCA gere letras ou números.
      Se o modo for 'Texto integrado', crie copy Title, Subtitle e Offer criativos por variação.`;

      const parts: any[] = [{ text: `Briefing base: ${formData.finalBriefPt || formData.userBrief || "Produto premium"}` }];
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
                highlights: { type: Type.STRING },
                copyTitle: { type: Type.STRING },
                copySubtitle: { type: Type.STRING },
                copyOffer: { type: Type.STRING }
              },
              required: ["layout", "promptPt", "negativePt", "highlights"]
            }
          }
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "[]");
      return parsed;
  });
};

export const prepareTechnicalPrompt = async (
  promptPt: string, 
  negativePt: string, 
  settings: any,
  overrideSceneEn?: string
): Promise<{ promptEn: string, negativeEn: string, finalPromptEn: string }> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      let sceneEn = "";
      let sceneNegEn = "";

      if (overrideSceneEn) {
         sceneEn = overrideSceneEn;
      } else {
          const trans = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Translate to Image Prompt English: "${promptPt}". Negative: "${negativePt}"`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { promptEn: { type: Type.STRING }, negativeEn: { type: Type.STRING } } } 
            }
          });
          const parsed = JSON.parse(trans.text?.trim() || `{"promptEn": "", "negativeEn": ""}`);
          sceneEn = parsed.promptEn;
          sceneNegEn = parsed.negativeEn;
      }

      let blocks: string[] = [];
      blocks.push(`[TECHNICAL_SCENE]: ${sceneEn}`);
      
      const toneMap: any = {
          'Chamativo': "Vibrant, high-energy, punchy contrast.",
          'Vendas': "Clean commercial product photography.",
          'Minimalista': "Soft lighting, minimalist background, plenty of white space.",
          'Criativo': "Artistic shadows, editorial style.",
          'Promocional': "Bright, retail focus.",
          'Institucional': "Premium corporate polish.",
          'Emocional': "Warm cinematic lighting."
      };
      
      blocks.push(`[STYLE]: ${toneMap[settings.tone] || "Studio."}`);
      
      if (settings.ambienceDescription) {
          blocks.push(`[AMBIENCE]: ${settings.ambienceDescription}`);
      } else {
          blocks.push(`[AMBIENCE]: Professional Studio Setup.`);
      }

      const angleMap: any = { 'Frente': "Front view.", '3/4': "3/4 perspective.", 'Topo': "Top-down view." };
      blocks.push(`[CAMERA]: ${angleMap[settings.angle] || "Eye level."}`);

      if (settings.marketingDirection === 'Texto integrado') {
          blocks.push(`[COMPOSITION]: Empty space for text overlay as requested. Clean negative space.`);
      }

      blocks.push(MANDATORY_STRINGS.NO_TEXT_ENFORCEMENT);
      const finalPromptEn = `${blocks.join('\n\n')}\n\n[NEGATIVE]: ${sceneNegEn}, ${MANDATORY_STRINGS.NEGATIVE_SUFFIX}`.trim();

      return { promptEn: sceneEn, negativeEn: sceneNegEn, finalPromptEn };
  });
};

export const generateImageFromPrompt = async (
  finalPromptEn: string,
  referenceImages?: ReferenceImage[],
  aspectRatio: AspectRatio = "1:1"
): Promise<string> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const parts: any[] = [{ text: finalPromptEn }];
      if (referenceImages?.length) {
        referenceImages.forEach(img => parts.push({ inlineData: { data: img.dataUrl.split(',')[1], mimeType: img.mimeType } }));
      }
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio as any } },
      });
      const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  });
};
