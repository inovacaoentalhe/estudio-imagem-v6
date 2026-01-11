import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_FORM_STATE } from './constants';
import { FormData, GalleryItem, HistoryMetadata } from './types';
import { 
  generateCreativePrompts, 
  prepareTechnicalPrompt, 
  generateImageFromPrompt, 
  correctPortuguese,
  suggestFieldsFromBriefing 
} from './services/geminiService';
import { loadGalleryFromDB, saveGalleryToDB, clearGalleryDB, loadDraftFromDB, saveDraftToDB } from './services/storageService';
import { addToHistory, exportData, importData, clearHistory, getHistoryMetadata, getStoredAmbiences } from './services/persistenceService';
import { Controls } from './components/Controls';
import { Gallery } from './components/Gallery';
import { Toast } from './components/Toast';
import { Aperture, Loader2, Plus, Play, Layers, RotateCcw, Settings, Download, Upload, Database, X, Sun, Moon } from 'lucide-react';

const MAX_CONCURRENCY = 1;

const useDebouncedEffect = (effect: () => void, deps: any[], delay: number) => {
  useEffect(() => {
    const handler = setTimeout(effect, delay);
    return () => clearTimeout(handler);
  }, [...deps, delay]);
};

export const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isApplyingSuggestions, setIsApplyingSuggestions] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'|'warning'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRenders, setActiveRenders] = useState<string[]>([]);

  const showToast = (message: string, type: 'success'|'error'|'info'|'warning') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [items, draft] = await Promise.all([loadGalleryFromDB(), loadDraftFromDB()]);
        setGalleryItems(items);
        const storedAmbiences = getStoredAmbiences();
        if (draft) {
             setFormData({ ...draft, customAmbiences: storedAmbiences });
        } else {
             setFormData(prev => ({ ...prev, customAmbiences: storedAmbiences }));
        }
        setHistoryCount(getHistoryMetadata().length);
      } catch (err: any) { 
        console.error(err); 
        showToast("Erro ao inicializar banco de dados local.", "error");
      } finally { 
        setIsLoadingDB(false); 
      }
    };
    init();
  }, []);

  useDebouncedEffect(() => {
    if (!isLoadingDB) {
      saveDraftToDB(formData).catch(err => console.warn('Erro ao salvar rascunho:', err));
    }
  }, [formData, isLoadingDB], 1000);

  useDebouncedEffect(() => {
    if (!isLoadingDB) {
      saveGalleryToDB(galleryItems).catch(err => console.warn('Erro ao salvar galeria:', err));
    }
  }, [galleryItems, isLoadingDB], 1500);

  useEffect(() => {
    const processQueue = async () => {
      if (activeRenders.length >= MAX_CONCURRENCY) return;
      const nextItem = galleryItems.find(item => item.status === 'queued' && !activeRenders.includes(item.id));
      if (nextItem) {
        startRenderJob(nextItem);
      }
    };
    processQueue();
  }, [galleryItems, activeRenders]);

  const startRenderJob = async (item: GalleryItem) => {
    if (!item || activeRenders.includes(item.id)) return;
    setActiveRenders(prev => [...prev, item.id]);
    setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rendering' } : i));

    try {
        // 1. Correção Automática de Português (Pre-Translation)
        const correctedPromptPt = await correctPortuguese(item.data.promptPt);
        const correctedNegativePt = await correctPortuguese(item.data.negativePt);

        // 2. Preparação do Prompt Técnico (EN)
        const tech = await prepareTechnicalPrompt(
            correctedPromptPt,
            correctedNegativePt,
            item.creationSettings,
            item.referenceImages || []
        );

        // 3. Geração da Imagem
        const url = await generateImageFromPrompt(tech.finalPromptEn, item.referenceImages, item.aspectRatio);

        setGalleryItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            status: 'completed',
            generatedImageUrl: url,
            data: {
                ...i.data,
                promptPt: correctedPromptPt,
                negativePt: correctedNegativePt,
                promptEn: tech.promptEn,
                negativeEn: tech.negativeEn,
                finalPromptEn: tech.finalPromptEn
            }
        } : i));

        const historyItem: HistoryMetadata = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            productName: formData.productName,
            presetUsed: item.creationSettings?.objective || 'Desconhecido',
            ambienceTitle: item.creationSettings?.ambienceDescription || 'Estúdio',
            aspectRatio: item.aspectRatio,
            promptFinalEn: tech.finalPromptEn,
            tags: [item.creationSettings?.objective || 'Geral']
        };
        addToHistory(historyItem);
        setHistoryCount(prev => prev + 1);

    } catch (error: any) {
        console.error("Render error:", error);
        setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
        showToast("Erro na renderização. Tente novamente.", "error");
    } finally {
        setActiveRenders(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleGeneratePrompts = async (isMore: boolean = false) => {
    if (!formData.productName) {
        showToast("Por favor, digite o nome do produto.", "warning");
        return;
    }
    setIsGeneratingPrompts(true);
    try {
      const results = await generateCreativePrompts(formData);
      const allAmbiences = [...formData.suggestedAmbiences, ...formData.customAmbiences];
      const activeAmbience = allAmbiences.find(a => a.id === formData.selectedAmbienceId);

      const newItems: GalleryItem[] = results.map(result => ({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: result,
        referenceImages: formData.referenceImages.length > 0 ? [...formData.referenceImages] : [],
        aspectRatio: formData.defaultAspectRatio,
        rotation: formData.defaultRotation,
        status: isMore ? 'draft' : 'queued',
        renderMode: 'layer',
        creationSettings: {
            objective: formData.objective,
            background: formData.background,
            catalogBackground: formData.catalogBackground,
            shadow: formData.shadow,
            angle: formData.angle,
            props: formData.props,
            propsEnabled: formData.props.length > 0,
            lockProduct: formData.lockProduct,
            ambienceDescription: activeAmbience?.description,
            tone: formData.tone,
            textPresence: formData.textPresence,
            customProps: formData.customProps,
            customPersonalization: formData.customPersonalization,
            marketingDirection: formData.marketingDirection
        }
      }));
      setGalleryItems(prev => [...newItems, ...prev]);
      showToast(isMore ? "Novas variações geradas como rascunho." : "Enviado para renderização.", "success");
    } catch (error: any) { 
        showToast(`Erro ao gerar prompts: ${error.message}`, "error");
    } finally { 
        setIsGeneratingPrompts(false); 
    }
  };

  const handleAutoComplete = async () => {
    if (!formData.userBrief && !formData.finalBriefPt) {
        showToast("Briefing vazio. Gere um briefing primeiro.", "warning");
        return;
    }
    setIsApplyingSuggestions(true);
    try {
        const suggestions = await suggestFieldsFromBriefing(formData);
        setFormData(prev => ({
            ...prev,
            ...suggestions,
            objective: (suggestions.objective as any) || prev.objective
        }));
        showToast("Sugestões aplicadas com sucesso (editáveis).", "success");
    } catch (e) {
        showToast("Erro ao sugerir parâmetros.", "error");
    } finally {
        setIsApplyingSuggestions(false);
    }
  };

  const handleQueueAllPending = () => {
      setGalleryItems(prev => prev.map(item => (item.status === 'draft' || item.status === 'error' ? { ...item, status: 'queued' } : item)));
      showToast("Fila de processamento iniciada.", "info");
  };

  const handleResetSession = async () => {
    if (confirm("INICIAR NOVO PRODUTO?")) {
        const currentAmbiences = getStoredAmbiences();
        setFormData({ ...INITIAL_FORM_STATE, customAmbiences: currentAmbiences });
        showToast("Sessão reiniciada.", "info");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const restoredData = await importData(file);
        if (restoredData) setFormData(restoredData);
        showToast('Backup restaurado!', 'success');
      } catch (error: any) {
        showToast(`Falha na importação: ${error.message}`, 'error');
      }
      e.target.value = '';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'}`}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <nav className={`border-b ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-white/80'} backdrop-blur-md sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg"><Aperture className="text-white w-5 h-5" /></div>
                <div><h1 className="font-bold text-lg leading-tight">Inovação Entalhe</h1><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Image Studio AI</p></div>
            </div>
            <div className="flex items-center gap-4">
                 <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
                 </button>
                 <button onClick={handleResetSession} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800">
                    <RotateCcw className="w-3 h-3" /> Novo Produto
                 </button>
                 <button onClick={() => setShowSettingsModal(true)} className="text-zinc-500 hover:text-amber-500 transition-colors">
                    <Settings className="w-5 h-5" />
                 </button>
                 <div className="hidden md:flex items-center gap-3 border border-zinc-800 bg-zinc-900 rounded-full px-4 py-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Fila: <span className="text-blue-500">{galleryItems.filter(i => i.status === 'queued').length}</span></span>
                 </div>
            </div>
        </div>
      </nav>

      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
                <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-amber-500" /> Gerenciamento de Dados</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => exportData(formData)} className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-950 border border-zinc-800 hover:border-amber-500 rounded-xl transition-all group">
                        <Download className="w-6 h-6 text-zinc-500 group-hover:text-amber-500" />
                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase">Exportar Backup</span>
                    </button>
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-950 border border-zinc-800 hover:border-blue-500 rounded-xl transition-all group cursor-pointer">
                        <Upload className="w-6 h-6 text-zinc-500 group-hover:text-blue-500" />
                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase">Importar Backup</span>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Coluna de Controles - MD: 5/12 (Aproximadamente 41% - Aumento lateral para tablet) */}
            <div className="md:col-span-5 lg:col-span-4 xl:col-span-3 space-y-6">
                <Controls 
                  formData={formData} 
                  setFormData={setFormData} 
                  onGenerate={() => handleGeneratePrompts(false)} 
                  onAutoComplete={handleAutoComplete}
                  isGenerating={isGeneratingPrompts} 
                  isApplyingSuggestions={isApplyingSuggestions}
                />
            </div>

            {/* Coluna da Galeria - MD: 7/12 */}
            <div className="md:col-span-7 lg:col-span-8 xl:col-span-9 space-y-6">
                <div className="flex justify-between items-center p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Layers className="w-5 h-5 text-zinc-500" /> Galeria de Estúdio</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {galleryItems.filter(i => i.status === 'draft').length > 0 && (
                             <button onClick={handleQueueAllPending} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-all">
                                <Play className="w-3 h-3 fill-current" /> Criar Pendentes
                            </button>
                        )}
                        <button onClick={() => handleGeneratePrompts(true)} disabled={isGeneratingPrompts} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-950/40 transition-all">
                            <Plus className="w-3 h-3" /> +2 Variações
                        </button>
                    </div>
                </div>
                <Gallery items={galleryItems} setItems={setGalleryItems} />
            </div>
        </div>
      </main>
    </div>
  );
};