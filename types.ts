
export enum AppMode {
  CATALOG = 'Catálogo',
  SOCIAL = 'Post Social',
}

export enum ArtStyle {
  MINIMALIST = 'MINIMALIST',
  BOLD = 'BOLD',
  PROMO = 'PROMO',
  HIGHLIGHT = 'HIGHLIGHT',
  SCENE = 'SCENE',
}

export enum MarketingTone {
  ATTENTION = 'Chamativo',
  CREATIVE = 'Criativo',
  SALES = 'Vendas',
  PROMOTIONAL = 'Promocional',
  MINIMALIST = 'Minimalista',
  INSTITUTIONAL = 'Institucional',
  EMOTIONAL = 'Emocional',
}

export enum TextPresence {
  LARGE = 'Texto grande',
  MEDIUM = 'Texto médio',
  SMALL = 'Texto pequeno',
  MINIMAL = 'Texto mínimo',
  NONE = 'Sem texto',
}

export enum CameraAngle {
  FRONT = 'Frente',
  THREE_QUARTERS = '3/4',
  TOP = 'Topo',
}

export enum ShadowType {
  CONTACT = 'Contato',
  SOFT = 'Suave',
  MEDIUM = 'Média',
  STRONG = 'Forte',
  NONE = 'Nenhuma',
}

export type CatalogBackgroundType = 'Branco Puro' | 'Estúdio' | 'Dia de Sol' | 'Amarelado' | 'Escuro' | 'Customizado';

export enum BackgroundType {
  WHITE = 'Branco puro',
  GREY = 'Cinza studio',
  OFF_WHITE = 'Off-white quente',
  MARBLE = 'Mármore claro',
  BLACK_PREMIUM = 'Preto premium',
  SCENE_CONTEXT = 'Cena contextualizada'
}

export interface Ambience {
  id: string;
  title: string;
  description: string;
  isCustom?: boolean;
  useCount?: number;
}

export type ReferenceUsageType = 'Contorno' | 'Medidas' | 'Personalização' | 'Formato';

export interface ReferenceImage {
  id: string;
  dataUrl: string;
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  sizeMb?: string;
  isHero: boolean;
  usageType: ReferenceUsageType;
}

export type AspectRatio = '1:1' | '3:4' | '4:5' | '9:16' | '16:9';
export type RotationDegree = 0 | 90 | 180 | 270;

export interface FormData {
  productName: string;
  material: string;
  
  // Briefing System
  baseBrief: string;       // Layer A (System/Fixed)
  userBrief: string;       // Layer B (User Input)
  finalBriefPt: string;    // Merge Result
  
  briefingStatus: 'automático' | 'personalizado' | 'vazio';

  lastBriefingUpdate?: number;
  
  objective: AppMode;
  style: ArtStyle;
  marketingDirection: 'Espaço reservado' | 'Texto integrado';
  tone: MarketingTone;
  textPresence: TextPresence;
  angle: CameraAngle;
  shadow: ShadowType;
  background: BackgroundType;
  catalogBackground?: CatalogBackgroundType; // Novo campo específico para catálogo
  props: string[];
  customProps: string;
  
  // Post Social Specific
  socialCopyTitle: string;
  socialCopySubtitle: string;
  socialCopyOffer: string;
  selectedAmbienceId?: string;
  suggestedAmbiences: Ambience[];
  customAmbiences: Ambience[];

  referenceImages: ReferenceImage[];
  useRefImages: boolean;
  lockProduct: boolean;
  prioritizeFidelity: boolean;
  imageNotes: string;

  personalizationVariations: string;
  activeVariation: string;
  customPersonalization: string; 
  
  // Preset fields
  defaultAspectRatio: AspectRatio;
  defaultRotation: RotationDegree;
}

export interface GeneratedPrompt {
  layout: string;
  promptPt: string;
  negativePt: string;
  promptEn: string;
  negativeEn: string;
  highlights: string;
  copyTitle?: string;
  copySubtitle?: string;
  copyOffer?: string;
  heroImageId?: string;
  finalPromptEn?: string; 
}

// Configuração visual da Layer de Texto
export interface TextLayerConfig {
  yPercent: number; // Posição vertical em % (0-100)
  visible: boolean;
  scale: number; // Multiplicador de tamanho
  color?: string; // Cor do texto (Hex)
}

export type TextStyle = 'modern' | 'classic' | 'bold' | 'ribbon' | 'banner';

export interface GalleryItem {
  id: string;
  timestamp: number;
  data: GeneratedPrompt;
  referenceImages: ReferenceImage[];
  generatedImageUrl?: string;
  aspectRatio: AspectRatio;
  rotation: RotationDegree;
  label?: string;
  isRegenerated?: boolean;
  isEdited?: boolean;
  status: 'draft' | 'queued' | 'rendering' | 'completed' | 'error';
  
  // Configuração visual persistente dos textos
  textLayerSettings?: {
    title: TextLayerConfig;
    subtitle: TextLayerConfig;
    offer: TextLayerConfig;
  };

  textStyle?: TextStyle; // Novo campo para estilo do texto
  renderMode?: 'integrated' | 'layer'; // Novo campo para modo de renderização

  // Snapshot para regeneração determinística
  creationSettings?: {
    objective: AppMode;
    background: BackgroundType;
    catalogBackground?: CatalogBackgroundType;
    shadow: ShadowType;
    angle: CameraAngle;
    props: string[];
    customProps?: string;
    propsEnabled: boolean;
    lockProduct?: boolean;
    ambienceDescription?: string;
    tone?: MarketingTone;
    textPresence?: TextPresence;
    customPersonalization?: string; 
    marketingDirection?: 'Espaço reservado' | 'Texto integrado';
  };
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;

  mode: AppMode;
  style: ArtStyle;
  marketingDirection: 'Espaço reservado' | 'Texto integrado';
  copyTone: MarketingTone;

  aspectRatio: AspectRatio;
  angle: CameraAngle;
  shadow: ShadowType;
  background: BackgroundType;
  catalogBackground?: CatalogBackgroundType;

  propsEnabled: boolean;
  propsList: string[];
  propsPolicy: 'restrito' | 'livre';

  useReferenceImages: boolean;
  lockProductFidelity: boolean;

  defaultRotation: RotationDegree;
  showNegativePrompts: boolean;
}

// --- NOVAS INTERFACES PARA O SISTEMA LEVE ---

export interface HistoryMetadata {
  id: string;
  date: string; // ISO
  productName: string;
  presetUsed: string;
  ambienceTitle?: string;
  aspectRatio: string;
  promptFinalEn: string; // Prompt técnico final (o mais valioso)
  tags: string[]; // ex: ['Post Social', 'Texto integrado']
}

export interface BackupPayload {
  version: string; // Alterado para string ('4.0')
  exportedAt: string;
  presets: Preset[];
  ambiences: Ambience[];
  history: HistoryMetadata[];
  currentDraft?: FormData; // Opcional: Inclui o estado atual com imagens
}
