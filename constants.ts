
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
3. Sem distorções de lente.
4. Cores e entalhes fiéis ao material original.
5. Limpeza visual absoluta em modo catálogo.`;

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
  CATALOG: "PURE CATALOG PHOTOGRAPHY. NO SCENERY. NO ENVIRONMENT. NO BACKGROUND ELEMENTS. The product must be on a totally neutral, clean, solid background (pure white or studio grey). Focus on product geometry and materials only. Technical lighting.",
  SOCIAL: "High-end commercial marketing post. Realistic environment. Professional studio lighting, 8k resolution, premium textures.",
  
  NEGATIVE_SUFFIX: "text, typography, letters, numbers, symbols, writing, watermark, logo, signature, blurry, distorted, low quality, warped, extra parts, unreadable, artistic blur, depth of field, vignette, dark corners, altered product shape, changed logo, missing engraving, wrong proportions, morphing, words, alphabets.",
  
  FIDELITY_RULES: "CRITICAL: The attached HERO image is the ABSOLUTE geometry reference. DO NOT CHANGE product design, engravings, text on wood, or logos. The product in the generated image must be IDENTICAL to the reference image in terms of shape, material, and personalization details.",
  
  NO_TEXT_ENFORCEMENT: "DO NOT RENDER ANY TEXT. Clean image only. No letters, no symbols."
};

export const ASPECT_RATIO_TECHNICAL_TEXTS: Record<AspectRatio, string> = {
  '1:1': "Square aspect ratio (1:1), centered composition.",
  '3:4': "Vertical aspect ratio (3:4).",
  '4:5': "Vertical aspect ratio (4:5).",
  '9:16': "Tall vertical aspect ratio (9:16).",
  '16:9': "Widescreen aspect ratio (16:9)."
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
    id: 'sys_social_scene',
    name: 'Post Social — Churrasco Realista',
    description: 'Ambientação de churrasco, carnes sobre a tábua, luz natural.',
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
    propsList: ["Carne fatiada", "Sal grosso"],
    propsPolicy: 'livre',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  }
];
