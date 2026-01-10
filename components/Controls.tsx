
import React, { useState, useMemo } from 'react';
import { AppMode, ArtStyle, CameraAngle, FormData, MarketingTone, ShadowType, TextPresence, Ambience, BackgroundType } from '../types';
import { PROPS_OPTIONS } from '../constants';
import { generateStructuredBrief } from '../services/geminiService';
import { saveStoredAmbience, deleteStoredAmbience } from '../services/persistenceService';
import { 
  Sparkles, Layers, Megaphone, Package, BookOpen, RefreshCw, 
  Layout, Palette, ChevronDown, Plus, Trash2, Settings2,
  Bookmark, Info, Loader2, Lock, Eraser, Type
} from 'lucide-react';
import { ReferenceUpload } from './ReferenceUpload';
import { PresetsModule } from './PresetsModule';

interface ControlsProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ formData, setFormData, onGenerate, isGenerating }) => {
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [newAmbTitle, setNewAmbTitle] = useState('');
  const [newAmbDesc, setNewAmbDesc] = useState('');
  const [showAllAmbiences, setShowAllAmbiences] = useState(false);

  const isSocial = formData.objective === AppMode.SOCIAL;
  const isPlaceholderMode = formData.marketingDirection === 'Espaço reservado';

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModeChange = (mode: AppMode) => {
      let newAspectRatio = formData.defaultAspectRatio;
      if (mode === AppMode.CATALOG) newAspectRatio = '1:1';
      if (mode === AppMode.SOCIAL) newAspectRatio = '3:4';

      setFormData(prev => ({
          ...prev,
          objective: mode,
          defaultAspectRatio: newAspectRatio
      }));
  };

  const handleGenerateBrief = async () => {
    if (!formData.productName) return;
    setIsGeneratingBriefing(true);
    try {
      const briefData = await generateStructuredBrief(formData);
      setFormData(prev => ({
        ...prev,
        finalBriefPt: briefData.brief_pt || prev.finalBriefPt,
        socialCopyTitle: briefData.copy_pt?.title || prev.socialCopyTitle,
        socialCopySubtitle: briefData.copy_pt?.subtitle || prev.socialCopySubtitle,
        socialCopyOffer: briefData.copy_pt?.offer || prev.socialCopyOffer,
        briefingStatus: 'automático',
        marketingDirection: 'Texto integrado' 
      }));
    } catch (e: any) {
      alert("Erro ao gerar briefing: " + e.message);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleAddCustomAmbience = () => {
    if (!newAmbTitle || !newAmbDesc) return;
    const newAmb: Ambience = {
      id: crypto.randomUUID(),
      title: newAmbTitle,
      description: newAmbDesc,
      isCustom: true,
      useCount: 0
    };
    setFormData(prev => ({
      ...prev,
      customAmbiences: [...prev.customAmbiences, newAmb],
      selectedAmbienceId: newAmb.id
    }));
    saveStoredAmbience(newAmb);
    setNewAmbTitle('');
    setNewAmbDesc('');
  };

  const removeCustomAmbience = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customAmbiences: prev.customAmbiences.filter(a => a.id !== id),
      selectedAmbienceId: prev.selectedAmbienceId === id ? undefined : prev.selectedAmbienceId
    }));
    deleteStoredAmbience(id);
  };

  const allAmbiences = useMemo(() => {
    return [...formData.suggestedAmbiences, ...formData.customAmbiences];
  }, [formData.suggestedAmbiences, formData.customAmbiences]);

  const topAmbiences = useMemo(() => {
    return allAmbiences.slice(0, 5);
  }, [allAmbiences]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl animate-fade-in overflow-hidden max-h-[125vh] flex flex-col">
      <PresetsModule formData={formData} setFormData={setFormData} />

      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* 1. OBJETIVO */}
          <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#FCB82E]" /> Objetivo
              </h2>
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {Object.values(AppMode).map(mode => (
                      <button key={mode} onClick={() => handleModeChange(mode)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${formData.objective === mode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          {mode}
                      </button>
                  ))}
              </div>
          </div>

          <ReferenceUpload formData={formData} setFormData={setFormData} />

          {/* 2. BRIEFING */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" /> Briefing do Produto
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={formData.productName} onChange={e => handleChange('productName', e.target.value)} placeholder="Produto" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500" />
              <input type="text" value={formData.material} onChange={e => handleChange('material', e.target.value)} placeholder="Material" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500" />
            </div>

            <textarea value={formData.userBrief} onChange={(e) => handleChange('userBrief', e.target.value)} placeholder="Ex: Clima rústico, luz lateral, para redes sociais..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-white h-20 outline-none resize-none focus:border-blue-500" />

            <button onClick={handleGenerateBrief} disabled={!formData.productName} className="w-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase text-zinc-300 py-3 rounded-lg flex items-center justify-center gap-2 border border-zinc-700 transition-all">
              {isGeneratingBriefing ? <RefreshCw className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3 text-[#FCB82E]" />} Gerar Briefing & Copy (Flash AI)
            </button>

            {formData.finalBriefPt && (
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                    <label className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1"><Lock className="w-2 h-2" /> Briefing Consolidado</label>
                    <textarea value={formData.finalBriefPt} onChange={(e) => handleChange('finalBriefPt', e.target.value)} className="w-full bg-transparent border-0 text-[11px] text-zinc-300 h-20 outline-none resize-none" />
                </div>
            )}
          </div>

          {/* 3. POST SOCIAL / COPY / ARTE */}
          {isSocial && (
            <div className="space-y-6 pt-4 border-t border-zinc-800 animate-slide-up">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#FCB82E] flex items-center gap-2"><Layout className="w-4 h-4" /> Direção de Arte</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleChange('marketingDirection', 'Texto integrado')} className={`py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all ${formData.marketingDirection === 'Texto integrado' ? 'bg-amber-900/20 border-[#FCB82E] text-[#FCB82E]' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>Texto Integrado</button>
                      <button onClick={() => handleChange('marketingDirection', 'Espaço reservado')} className={`py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all ${formData.marketingDirection === 'Espaço reservado' ? 'bg-amber-900/20 border-[#FCB82E] text-[#FCB82E]' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>Espaço Reservado</button>
                  </div>
                  
                  {!isPlaceholderMode && (
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase">Tom de Marketing</label>
                              <select value={formData.tone} onChange={e => handleChange('tone', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-300 outline-none">
                                  {Object.values(MarketingTone).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase">Presença Texto</label>
                              <select value={formData.textPresence} onChange={e => handleChange('textPresence', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-300 outline-none">
                                  {Object.values(TextPresence).map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                          </div>
                      </div>
                  )}
                </div>

                {!isPlaceholderMode && (
                    <div className="space-y-3 animate-fade-in">
                        <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2"><Megaphone className="w-4 h-4" /> Copy do Post</h3>
                        <input value={formData.socialCopyTitle} onChange={e => handleChange('socialCopyTitle', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-xs" placeholder="Título Impactante" />
                        <input value={formData.socialCopySubtitle} onChange={e => handleChange('socialCopySubtitle', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-xs" placeholder="Subtítulo Descritivo" />
                        <input value={formData.socialCopyOffer} onChange={e => handleChange('socialCopyOffer', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-xs" placeholder="Oferta / CTA" />
                    </div>
                )}

                {/* 4. AMBIENTAÇÃO VISUAL */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Ambientação Visual
                        </h3>
                        <button onClick={() => setShowAllAmbiences(!showAllAmbiences)} className="text-[9px] font-bold text-zinc-500 flex items-center gap-1">
                            {showAllAmbiences ? <ChevronDown className="w-3 h-3 rotate-180" /> : <ChevronDown className="w-3 h-3" />}
                            {showAllAmbiences ? "Ver Menos" : `Ver Todas (${allAmbiences.length})`}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {(showAllAmbiences ? allAmbiences : topAmbiences).map((amb) => (
                            <div
                                key={amb.id}
                                onClick={() => handleChange('selectedAmbienceId', amb.id)}
                                className={`group p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                                    formData.selectedAmbienceId === amb.id 
                                    ? 'bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/20' 
                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex justify-between items-start pr-8">
                                    <span className={`text-[10px] font-black uppercase ${formData.selectedAmbienceId === amb.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                        {amb.title}
                                    </span>
                                </div>
                                <p className="text-[9px] text-zinc-500 leading-tight mt-1">{amb.description}</p>
                                
                                {amb.isCustom && (
                                    <span 
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { 
                                            e.preventDefault();
                                            e.stopPropagation(); 
                                            removeCustomAmbience(amb.id); 
                                        }}
                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 p-1 rounded hover:bg-zinc-800 transition-all cursor-pointer z-10"
                                        title="Remover ambientação"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-2 border-dashed">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase"><Plus className="w-3 h-3" /> Criar Customizada</div>
                        <input value={newAmbTitle} onChange={e => setNewAmbTitle(e.target.value)} placeholder="Título" className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white" />
                        <textarea value={newAmbDesc} onChange={e => setNewAmbDesc(e.target.value)} placeholder="Descrição da cena..." className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white h-16 resize-none" />
                        <button onClick={handleAddCustomAmbience} disabled={!newAmbTitle || !newAmbDesc} className="w-full bg-emerald-600 text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all disabled:opacity-30">Salvar Ambientação</button>
                    </div>
                </div>
            </div>
          )}

          {/* 5. PARÂMETROS TÉCNICOS */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Parâmetros Studio
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Ângulo</label>
                    <select value={formData.angle} onChange={(e) => handleChange('angle', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-300">
                        {Object.values(CameraAngle).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Sombra</label>
                    <select value={formData.shadow} onChange={(e) => handleChange('shadow', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-300">
                        {Object.values(ShadowType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>
          </div>

          <button onClick={onGenerate} disabled={isGenerating || !formData.productName} className="w-full py-4 text-black rounded-xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all" style={{ backgroundColor: '#FCB82E' }}>
            {isGenerating ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="w-5 h-5" />} Gerar 2 Variações de Imagem
          </button>
      </div>
    </div>
  );
};
