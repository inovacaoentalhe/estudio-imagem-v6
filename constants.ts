
import { AppMode, ArtStyle, BackgroundType, CameraAngle, MarketingTone, ShadowType, AspectRatio, RotationDegree, TextPresence, FormData, Preset } from './types';

export const BRAND_COLOR = "#FCB82E";

export const PROPS_OPTIONS = [
  "Sal grosso",
  "Ervas frescas",
  "Fumaça leve",
  "Tecido de linho",
  "Madeira rústica",
  "Luz natural"
];

export const BASE_BRIEF_TEXT = `[REGRAS VISUAIS FIXAS - INOVAÇÃO ENTALHE]:
1. Fotografia profissional de estúdio, alta resolução (8k), texturas realistas.
2. Iluminação controlada para valorizar o relevo e o material do produto.
3. Sem distorções de lente (exceto se solicitado ângulo wide).
4. Cores fiéis ao material (madeira, metal, couro).
5. Limpeza visual: sem ruído, sem artefatos, foco cravado no produto.`;

export const INITIAL_FORM_STATE: FormData = {
  productName: "",
  material: "",
  
  baseBrief: BASE_BRIEF_TEXT,
  userBrief: "",
  finalBriefPt: "",
  briefingStatus: 'vazio',
  
  objective: AppMode.CATALOG,
  style: ArtStyle.MINIMALIST,
  marketingDirection: 'Espaço reservado',
  tone: MarketingTone.SALES,
  textPresence: TextPresence.MEDIUM,
  angle: CameraAngle.THREE_QUARTERS,
  shadow: ShadowType.SOFT,
  background: BackgroundType.WHITE,
  props: [],
  customProps: "",
  
  socialCopyTitle: "",
  socialCopySubtitle: "",
  socialCopyOffer: "",
  suggestedAmbiences: [],
  customAmbiences: [],

  referenceImages: [],
  useRefImages: false,
  lockProduct: true,
  prioritizeFidelity: true,
  imageNotes: "",

  personalizationVariations: "",
  activeVariation: "",
  customPersonalization: "",

  defaultAspectRatio: '1:1',
  defaultRotation: 0,
};

export const MANDATORY_STRINGS = {
  CATALOG: "Entire product must be fully sharp and in focus. No depth of field blur. No cinematic blur. No bokeh. High clarity, high definition, product-focused sharpness. Minimalist technical photography.",
  SOCIAL: "High-end commercial look. Controlled highlights and shadows. Professional studio lighting, 8k resolution, premium textures.",
  
  // REGRA DE OURO: ZERO TEXTO
  NEGATIVE_SUFFIX: "text, typography, letters, numbers, symbols, writing, watermark, logo, signature, blurry, distorted, low quality, warped, extra parts, text errors, unreadable, artistic blur, depth of field, vignette, dark corners, altered product, changed logo, missing engraving, wrong proportions, different design, morphing, words, alphabets, kanji, characters.",
  
  FIDELITY_RULES: "CRITICAL: Use the attached reference image as the EXACT product reference. Do not change the product design, proportions, engravings, texts, or logos. The attached image defines the final product geometry. NO REDESIGN ALLOWED. Preserve exact material details.",
  REFERENCE_LOGIC: "The HERO image defines the absolute geometry. Additional images are only for contour understanding.",
  
  // Frase de Controle Absoluto
  NO_TEXT_ENFORCEMENT: "No text, no typography, no letters, no numbers, no symbols, no writing of any kind. Clean image only. All text will be added in post-production. DO NOT RENDER TEXT."
};

export const ASPECT_RATIO_TECHNICAL_TEXTS: Record<AspectRatio, string> = {
  '1:1': "Square aspect ratio (1:1), centered composition.",
  '3:4': "Vertical aspect ratio (3:4), portrait composition for feed. Reserve vertical space.",
  '4:5': "Vertical aspect ratio (4:5), optimized for Instagram feed.",
  '9:16': "Tall vertical aspect ratio (9:16), optimized for Stories and Reels. Extensive vertical negative space.",
  '16:9': "Widescreen aspect ratio (16:9), cinematic landscape format."
};

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:5', '9:16', '16:9'];
export const ROTATION_OPTIONS: RotationDegree[] = [0, 90, 180, 270];
export const REFERENCE_USAGE_TYPES = ['Contorno', 'Medidas', 'Personalização', 'Formato'];

export const SYSTEM_PRESETS: Preset[] = [
  {
    id: 'sys_catalogo_ml',
    name: 'Catálogo — Mercado Livre (Branco)',
    description: 'Fundo branco puro, iluminação técnica, foco total, sem props.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.CATALOG,
    style: ArtStyle.MINIMALIST,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.SALES,
    aspectRatio: '1:1',
    angle: CameraAngle.FRONT,
    shadow: ShadowType.SOFT,
    background: BackgroundType.WHITE,
    propsEnabled: false,
    propsList: [],
    propsPolicy: 'restrito',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  },
  {
    id: 'sys_catalogo_premium',
    name: 'Catálogo — Premium Studio (Cinza)',
    description: 'Fundo cinza estúdio, iluminação de contato, ângulo 3/4 valorizando volume.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.CATALOG,
    style: ArtStyle.HIGHLIGHT,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.MINIMALIST,
    aspectRatio: '1:1',
    angle: CameraAngle.THREE_QUARTERS,
    shadow: ShadowType.CONTACT,
    background: BackgroundType.GREY,
    propsEnabled: true,
    propsList: ["Sal grosso", "Temperos secos"],
    propsPolicy: 'restrito',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  },
  {
    id: 'sys_social_bold',
    name: 'Post Social — Bold Impacto',
    description: 'Alto contraste, sombras médias, ideal para anúncios de performance.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.SOCIAL,
    style: ArtStyle.BOLD,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.ATTENTION,
    aspectRatio: '3:4',
    angle: CameraAngle.THREE_QUARTERS,
    shadow: ShadowType.MEDIUM,
    background: BackgroundType.BLACK_PREMIUM,
    propsEnabled: false,
    propsList: [],
    propsPolicy: 'livre',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  },
  {
    id: 'sys_social_promo',
    name: 'Post Social — Promo Vende Agora',
    description: 'Texto integrado (Overlay), cores vibrantes, ângulo frontal direto.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.SOCIAL,
    style: ArtStyle.PROMO,
    marketingDirection: 'Texto integrado',
    copyTone: MarketingTone.PROMOTIONAL,
    aspectRatio: '4:5',
    angle: CameraAngle.FRONT,
    shadow: ShadowType.STRONG,
    background: BackgroundType.OFF_WHITE,
    propsEnabled: false,
    propsList: [],
    propsPolicy: 'livre',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  },
  {
    id: 'sys_social_scene',
    name: 'Post Social — Scene Churrasco',
    description: 'Ambientação rica, props de contexto, luz suave de janela.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.SOCIAL,
    style: ArtStyle.SCENE,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.CREATIVE,
    aspectRatio: '3:4',
    angle: CameraAngle.THREE_QUARTERS,
    shadow: ShadowType.SOFT,
    background: BackgroundType.SCENE_CONTEXT,
    propsEnabled: true,
    propsList: ["Carne", "Sal grosso", "Fumaça leve", "Madeira rústica"],
    propsPolicy: 'livre',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  },
  {
    id: 'sys_banner_inst',
    name: 'Banner Site — 16:9 Institucional',
    description: 'Formato wide, minimalista, limpo para header de site.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.CATALOG,
    style: ArtStyle.MINIMALIST,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.MINIMALIST,
    aspectRatio: '16:9',
    angle: CameraAngle.FRONT,
    shadow: ShadowType.SOFT,
    background: BackgroundType.OFF_WHITE,
    propsEnabled: false,
    propsList: [],
    propsPolicy: 'restrito',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  }
];
