
import { FormData, Preset } from '../types';
import { SYSTEM_PRESETS, INITIAL_FORM_STATE } from '../constants';

// Chave versionada para alinhar com o "Combo Campeão"
const STORAGE_KEY = 'ie.presets.v1';

export const getPresets = (): Preset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const userPresets: Preset[] = stored ? JSON.parse(stored) : [];
    return [...SYSTEM_PRESETS, ...userPresets];
  } catch (e) {
    console.error("Erro ao carregar presets", e);
    return SYSTEM_PRESETS;
  }
};

export const saveUserPreset = (preset: Preset): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const userPresets: Preset[] = stored ? JSON.parse(stored) : [];
    // Atualiza se já existe (por ID) ou adiciona novo
    const index = userPresets.findIndex(p => p.id === preset.id);
    if (index >= 0) {
      userPresets[index] = preset;
    } else {
      userPresets.push(preset);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
  } catch (e) {
    console.error("Erro ao salvar preset", e);
  }
};

export const deleteUserPreset = (id: string): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let userPresets: Preset[] = stored ? JSON.parse(stored) : [];
    userPresets = userPresets.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
  } catch (e) {
    console.error("Erro ao deletar preset", e);
  }
};

export const mapPresetToForm = (preset: Preset, currentForm: FormData): FormData => {
  return {
    ...currentForm,
    objective: preset.mode,
    style: preset.style,
    marketingDirection: preset.marketingDirection,
    tone: preset.copyTone,
    angle: preset.angle,
    shadow: preset.shadow,
    background: preset.background,
    
    // Lógica de Props
    props: preset.propsEnabled ? preset.propsList : [],
    
    // Configurações de Referência
    useRefImages: preset.useReferenceImages ? (currentForm.referenceImages.length > 0) : false,
    lockProduct: preset.lockProductFidelity,
    
    // Configurações Padrão de Pós-Geração
    defaultAspectRatio: preset.aspectRatio,
    defaultRotation: preset.defaultRotation,
  };
};

export const mapFormToPreset = (form: FormData, name: string, description: string): Preset => {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    mode: form.objective,
    style: form.style,
    marketingDirection: form.marketingDirection,
    copyTone: form.tone,
    
    angle: form.angle,
    shadow: form.shadow,
    background: form.background,
    
    propsEnabled: form.props.length > 0,
    propsList: form.props,
    propsPolicy: form.objective === 'Catálogo' ? 'restrito' : 'livre', 
    
    useReferenceImages: form.useRefImages,
    lockProductFidelity: form.lockProduct,
    
    aspectRatio: form.defaultAspectRatio,
    defaultRotation: form.defaultRotation,
    showNegativePrompts: true 
  };
};
