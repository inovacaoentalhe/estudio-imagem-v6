import { Ambience, BackupPayload, FormData, HistoryMetadata, Preset } from "../types";
import { getPresets } from "./presetService"; // Acesso aos presets atuais
import { saveDraftToDB } from "./storageService";

// CHAVES VERSIONADAS
const KEYS = {
  PRESETS: 'ie.presets.v1',
  AMBIENCES: 'ie.ambiences.v1',
  HISTORY: 'ie.history.v1'
};

const MAX_HISTORY_ITEMS = 100;

// --- AMBIENCES ---

export const getStoredAmbiences = (): Ambience[] => {
  try {
    const data = localStorage.getItem(KEYS.AMBIENCES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Erro ao carregar ambientações:", e);
    return [];
  }
};

export const saveStoredAmbience = (ambience: Ambience) => {
  try {
    const current = getStoredAmbiences();
    // Evita duplicatas por ID
    const updated = [ambience, ...current.filter(a => a.id !== ambience.id)];
    localStorage.setItem(KEYS.AMBIENCES, JSON.stringify(updated));
  } catch (e) {
    console.error("Erro ao salvar ambientação:", e);
  }
};

export const deleteStoredAmbience = (id: string) => {
  try {
    const current = getStoredAmbiences();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem(KEYS.AMBIENCES, JSON.stringify(updated));
  } catch (e) {
    console.error("Erro ao deletar ambientação:", e);
  }
};

// --- HISTORY (LIGHTWEIGHT) ---

export const getHistoryMetadata = (): HistoryMetadata[] => {
  try {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Erro ao carregar histórico:", e);
    return [];
  }
};

export const addToHistory = (item: HistoryMetadata) => {
  try {
    const current = getHistoryMetadata();
    // Adiciona no topo e corta no limite
    const updated = [item, ...current].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error("Erro ao salvar histórico:", e);
  }
};

export const clearHistory = () => {
  localStorage.removeItem(KEYS.HISTORY);
};

// --- BACKUP SYSTEM (EXPORT/IMPORT) ---

export const exportData = (currentFormData?: FormData): void => {
  try {
    const presets = getPresets().filter(p => !p.isSystem); // Apenas presets do usuário
    const ambiences = getStoredAmbiences();
    const history = getHistoryMetadata();

    const payload: BackupPayload = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      presets,
      ambiences,
      history,
      currentDraft: currentFormData // Inclui imagens e estado atual
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `entalhe_backup_v4_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Erro ao exportar dados.");
    console.error(e);
  }
};

export const importData = async (file: File): Promise<FormData | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const payload: BackupPayload = JSON.parse(json);

        // Validação de versão
        if (!payload.version || (payload.version !== '4.0' && (payload.version as any) !== 1)) {
            console.warn('Versão antiga ou incompatível detectada. Tentando migrar...');
        }

        // 1. Restore Presets
        if (payload.presets && Array.isArray(payload.presets)) {
           localStorage.setItem(KEYS.PRESETS, JSON.stringify(payload.presets));
        }

        // 2. Restore Ambiences
        if (payload.ambiences && Array.isArray(payload.ambiences)) {
           localStorage.setItem(KEYS.AMBIENCES, JSON.stringify(payload.ambiences));
        }

        // 3. Restore History
        if (payload.history && Array.isArray(payload.history)) {
           localStorage.setItem(KEYS.HISTORY, JSON.stringify(payload.history));
        }

        // 4. Restore Draft (Form Data + Images)
        if (payload.currentDraft) {
            await saveDraftToDB(payload.currentDraft);
            resolve(payload.currentDraft);
        } else {
            resolve(null);
        }

      } catch (err) {
        console.error(err);
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};