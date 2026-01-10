
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

      // CLEANUP MARKDOWN (Fix comum para erros de JSON)
      let text = response.text?.trim() || "[]";
      text = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      
      const parsed = JSON.parse(text);
      return parsed;
  });
};

export const prepareTechnicalPrompt = async (
  promptPt: string, 
  negativePt: string, 
  settings: any,
  referenceImages: ReferenceImage[] = [], // Aceita imagens para verificar Hero
  overrideSceneEn?: string
): Promise<{ promptEn: string, negativeEn: string, finalPromptEn: string }> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      let sceneEn = "";
      let sceneNegEn = "";

      // 1. TRADUÇÃO PT -> EN (Essencial para qualidade do modelo Gemini Image)
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
          
          let transText = trans.text?.trim() || `{"promptEn": "", "negativeEn": ""}`;
          transText = transText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
          
          const parsed = JSON.parse(transText);
          sceneEn = parsed.promptEn;
          sceneNegEn = parsed.negativeEn;
      }

      let blocks: string[] = [];
      
      // 2. HERO IMAGE RULE (Explicitamente solicitado)
      const hasHero = referenceImages && referenceImages.some(img => img.isHero);
      if (hasHero) {
          blocks.push(`[REFERENCE]: Hero image provided. Use it as the absolute source of truth for product geometry, details, and material.`);
      }

      // 3. CENA (Traduzida)
      blocks.push(`[SCENE]: ${sceneEn}`);

      // 4. PARÂMETROS DE ESTÚDIO + ROTAÇÃO
      // Incluindo Ângulo, Sombra e Rotação conforme solicitado
      const shadowMap: any = {
        'Contato': "Hard contact shadows", 'Suave': "Soft diffused lighting", 
        'Média': "Balanced studio lighting", 'Forte': "High contrast shadows", 'Nenhuma': "Shadowless isolation"
      };
      const angleMap: any = { 
        'Frente': "Frontal view, eye-level", '3/4': "3/4 isometric perspective", 'Topo': "Top-down flat lay" 
      };
      
      const rot = settings.rotation || 0;
      blocks.push(`[STUDIO_PARAMS]: Angle: ${angleMap[settings.angle] || "Eye level"}. Shadow: ${shadowMap[settings.shadow] || "Soft"}. Rotation: ${rot} degrees.`);

      // 5. CUSTOMIZATION / PERSONALIZAÇÃO
      if (settings.customPersonalization) {
          blocks.push(`[PERSONALIZATION_RULES]: ${settings.customPersonalization}`);
      }

      // 6. AMBIENTAÇÃO / FUNDO
      let bgDesc = "";
      if (settings.objective === 'Catálogo' && settings.catalogBackground) {
          bgDesc = `${settings.catalogBackground} background.`;
      } else if (settings.ambienceDescription) {
          bgDesc = settings.ambienceDescription;
      } else {
          bgDesc = settings.background || "Professional Studio";
      }
      blocks.push(`[BACKGROUND/ENVIRONMENT]: ${bgDesc}`);

      // 7. PROPS / ACESSÓRIOS
      if (settings.props && settings.props.length > 0) {
          blocks.push(`[PROPS]: Surround product with: ${settings.props.join(', ')}. Natural arrangement.`);
      }

      // 8. DIREÇÃO DE ARTE & COPY DO POST
      // Adiciona o texto se for "Texto integrado", caso contrário, pede limpeza.
      if (settings.marketingDirection === 'Texto integrado') {
          blocks.push(`[TEXT_OVERLAY]: Include the following text using modern typography: 
          TITLE: "${settings.copyTitle}"
          SUBTITLE: "${settings.copySubtitle}"
          OFFER: "${settings.copyOffer}"
          Ensure spelling is correct in Portuguese.`);
      } else {
          blocks.push(`[COMPOSITION]: Leave negative space for text. Do not generate text.`);
          blocks.push(MANDATORY_STRINGS.NO_TEXT_ENFORCEMENT);
      }

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
