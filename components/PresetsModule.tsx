
import React, { useState, useEffect } from 'react';
import { FormData, Preset } from '../types';
import { getPresets, mapPresetToForm, saveUserPreset, deleteUserPreset, mapFormToPreset } from '../services/presetService';
import { Layers, CheckCircle2, Save, Trash2, Copy, Play, AlertCircle, Bookmark, ChevronDown } from 'lucide-react';

interface PresetsModuleProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export const PresetsModule: React.FC<PresetsModuleProps> = ({ formData, setFormData }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    setPresets(getPresets());
  };

  const handleApply = () => {
    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset) return;
    
    const newForm = mapPresetToForm(preset, formData);
    setFormData(newForm);
    
    setFeedback(`Preset "${preset.name}" aplicado! Pronto para gerar.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este preset?")) {
      deleteUserPreset(id);
      loadPresets();
      if (selectedPresetId === id) setSelectedPresetId('');
    }
  };

  const handleSave = () => {
    if (!newPresetName) return;
    const newPreset = mapFormToPreset(formData, newPresetName, newPresetDesc);
    saveUserPreset(newPreset);
    loadPresets();
    setSelectedPresetId(newPreset.id);
    setShowSaveModal(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setFeedback("Preset salvo com sucesso!");
    setTimeout(() => setFeedback(null), 3000);
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  return (
    <div className="bg-zinc-950 border-b border-zinc-800 p-4 sticky top-0 z-40 shadow-xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Presets de Produção
            </h3>
            {feedback && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50 flex items-center gap-1 animate-fade-in">
                    <CheckCircle2 className="w-3 h-3" /> {feedback}
                </span>
            )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
                <select 
                    value={selectedPresetId} 
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-amber-500 appearance-none font-medium"
                >
                    <option value="">Selecione um Preset...</option>
                    <optgroup label="SISTEMA (Built-in)">
                        {presets.filter(p => p.isSystem).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="MEUS PRESETS">
                        {presets.filter(p => !p.isSystem).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </optgroup>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            <button 
                onClick={handleApply}
                disabled={!selectedPresetId}
                className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-900/20"
            >
                <Play className="w-3 h-3 fill-current" /> Aplicar
            </button>

            <div className="w-px h-8 bg-zinc-800 mx-1"></div>

            <button 
                onClick={() => setShowSaveModal(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all border border-zinc-700"
                title="Salvar configuração atual como novo preset"
            >
                <Save className="w-3 h-3" /> Salvar Atual
            </button>

            {selectedPreset && !selectedPreset.isSystem && (
                <button 
                    onClick={() => handleDelete(selectedPreset.id)}
                    className="bg-red-900/20 hover:bg-red-900/40 text-red-400 text-[10px] font-black uppercase px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all border border-red-900/30"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}
        </div>

        {selectedPreset && (
            <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase font-bold">{selectedPreset.mode}</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase font-bold">{selectedPreset.style}</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase font-bold">{selectedPreset.aspectRatio}</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase font-bold">{selectedPreset.shadow}</span>
                {selectedPreset.description && <span className="text-[10px] text-zinc-500 ml-2 italic truncate max-w-md hidden md:block">- {selectedPreset.description}</span>}
            </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Save className="w-5 h-5 text-amber-500" /> Salvar Preset Customizado
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome do Preset</label>
                        <input 
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                            placeholder="Ex: Minha Campanha Natal"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Descrição (Opcional)</label>
                        <input 
                            value={newPresetDesc}
                            onChange={(e) => setNewPresetDesc(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                            placeholder="Breve resumo das configurações..."
                        />
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                            <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                            Isso salvará todas as configurações atuais (estilo, luz, props, aspect ratio) para uso futuro. Imagens de referência não são salvas no preset.
                        </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-all">Cancelar</button>
                        <button onClick={handleSave} disabled={!newPresetName} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-50">Salvar</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
