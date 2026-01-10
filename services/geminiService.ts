
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
      
      // 1. CENA PRINCIPAL
      blocks.push(`[SCENE]: ${sceneEn}`);

      // 2. PROPS / ACESSÓRIOS
      const propsList = settings.props && settings.props.length > 0 
        ? `Surround the product with these high-quality props: ${settings.props.join(', ')}. Arrange them naturally, some items can slightly overlap the product (max 20%) to create depth.`
        : '';
      if (propsList) blocks.push(`[PROPS/ACCESSORIES]: ${propsList}`);
      
      // 3. ESTILO E TOM
      const toneMap: any = {
          'Chamativo': "Vibrant colors, high-energy, punchy contrast, pop art influence",
          'Vendas': "Clean commercial product photography, e-commerce standard, balanced light",
          'Minimalista': "Soft lighting, minimalist background, plenty of white/negative space, airy feel",
          'Criativo': "Artistic shadows, editorial style, unique composition, dramatic flair",
          'Promocional': "Bright retail focus, eye-catching, supermarket premium style",
          'Institucional': "Premium corporate polish, trustworthy, elegant, neutral tones",
          'Emocional': "Warm cinematic lighting, golden hour feel, cozy atmosphere"
      };
      const toneDesc = toneMap[settings.tone] || "Professional Studio";
      blocks.push(`[STYLE/TONE]: ${toneDesc}`);

      // 4. ILUMINAÇÃO E SOMBRAS
      const shadowMap: any = {
        'Contato': "Hard contact shadows, grounded feel",
        'Suave': "Soft diffused softbox lighting, gentle gradients, no harsh shadows",
        'Média': "Balanced studio lighting, defined but soft shadows",
        'Forte': "High contrast, dramatic chiaroscuro, sharp cast shadows",
        'Nenhuma': "Floating product, shadowless lighting, isolation style"
      };
      const shadowDesc = shadowMap[settings.shadow] || "Soft lighting";
      blocks.push(`[LIGHTING]: ${shadowDesc}`);

      // 5. AMBIENTE / FUNDO (COM SUPORTE A CATÁLOGO)
      let bgDesc = "";
      if (settings.objective === 'Catálogo' && settings.catalogBackground) {
          const catBgMap: any = {
              'Branco Puro': 'Pure white background (HEX #FFFFFF), perfect isolation, no distractions',
              'Estúdio': 'Professional grey studio cyclorama background, subtle gradient',
              'Dia de Sol': 'Bright daylight setting, hard sun shadows, outdoor feel',
              'Amarelado': 'Warm beige/yellowish background, organic feel',
              'Escuro': 'Dark mode premium background, matte black/charcoal surface',
              'Customizado': 'Neutral background customized'
          };
          bgDesc = catBgMap[settings.catalogBackground] || 'Pure white background';
      } else if (settings.ambienceDescription) {
          bgDesc = settings.ambienceDescription;
      } else {
          const bgMap: any = {
             'Branco puro': 'Pure white background, hex #FFFFFF',
             'Cinza studio': 'Neutral grey studio paper background',
             'Off-white quente': 'Warm beige cream background, organic feel',
             'Mármore claro': 'Carrara marble surface, luxury texture',
             'Preto premium': 'Matte black premium background, luxury dark mode',
             'Cena contextualizada': 'Blurred lifestyle background context'
          };
          bgDesc = bgMap[settings.background] || 'Professional Studio Setup';
      }
      blocks.push(`[BACKGROUND/ENVIRONMENT]: ${bgDesc}`);

      // 6. CÂMERA E ÂNGULO
      const angleMap: any = { 
        'Frente': "Frontal view, eye-level straight on", 
        '3/4': "3/4 isometric perspective view", 
        'Topo': "Top-down flat lay view, 90 degree angle" 
      };
      blocks.push(`[CAMERA]: ${angleMap[settings.angle] || "Eye level"}. Sharp focus on product.`);

      // 7. INTEGRAÇÃO DE TEXTO vs ESPAÇO NEGATIVO (CORRIGIDO PARA CATÁLOGO)
      // Se for CATÁLOGO, ignoramos qualquer pedido de texto integrado e forçamos limpeza.
      if (settings.marketingDirection === 'Texto integrado' && settings.objective !== 'Catálogo') {
          blocks.push(`[TEXT_INTEGRATION]: Include the following text naturally in the composition using modern typography: 
          TITLE: "${settings.copyTitle}"
          SUBTITLE: "${settings.copySubtitle}"
          CTA: "${settings.copyOffer}"
          Ensure text is legible, correctly spelled in Portuguese, and integrates with the scene perspective.`);
      } else {
          // Se for Catálogo OU Modo 'Espaço Reservado'
          blocks.push(`[COMPOSITION]: Leave 40% empty negative space for future text overlay. Do not generate any text. Clean composition.`);
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
