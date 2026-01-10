import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_FORM_STATE } from './constants';
import { FormData, GalleryItem, HistoryMetadata } from './types';
import { generateCreativePrompts, prepareTechnicalPrompt, generateImageFromPrompt } from './services/geminiService';
import { loadGalleryFromDB, saveGalleryToDB, clearGalleryDB, loadDraftFromDB, saveDraftToDB } from './services/storageService';
import { addToHistory, exportData, importData, clearHistory, getHistoryMetadata, getStoredAmbiences } from './services/persistenceService';
import { Controls } from './components/Controls';
import { Gallery } from './components/Gallery';
import { Toast } from './components/Toast';
import { Aperture, Info, Loader2, Plus, Play, Layers, RotateCcw, Settings, Download, Upload, Trash2, Database, X, Sun, Moon } from 'lucide-react';

const MAX_CONCURRENCY = 1;

// Helper Hook para Debounce
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
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'|'warning'} | null>(null);
  
  // Ref para input de arquivo (Import)
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para controlar concorrência (IDs que estão rodando agora)
  const [activeRenders, setActiveRenders] = useState<string[]>([]);

  const showToast = (message: string, type: 'success'|'error'|'info'|'warning') => {
    setToast({ message, type });
  };

  // INIT
  useEffect(() => {
    const init = async () => {
      try {
        const [items, draft] = await Promise.all([loadGalleryFromDB(), loadDraftFromDB()]);
        setGalleryItems(items);
        
        // Carrega ambientações customizadas do LocalStorage
        const storedAmbiences = getStoredAmbiences();
        
        if (draft) {
             setFormData({
                 ...draft,
                 customAmbiences: storedAmbiences // Assegura que estamos usando a versão persistida
             });
        } else {
             setFormData(prev => ({ ...prev, customAmbiences: storedAmbiences }));
        }
        
        // Atualiza contagem de histórico
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

  // Salvamento Otimizado com Debounce
  useDebouncedEffect(() => {
    if (!isLoadingDB) {
      saveDraftToDB(formData).catch(err => 
        console.warn('Erro ao salvar rascunho:', err)
      );
    }
  }, [formData, isLoadingDB], 1000); // Salva 1s após a última alteração

  useDebouncedEffect(() => {
    if (!isLoadingDB) {
      saveGalleryToDB(galleryItems).catch(err => 
        console.warn('Erro ao salvar galeria:', err)
      );
    }
  }, [galleryItems, isLoadingDB], 1500); // Salva 1.5s após a última alteração

  // --- RENDER QUEUE WORKER ---
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
    setActiveRenders(prev => [...prev, item.id]);
    setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rendering' } : i));

    try {
        const isCatalog = item.data.layout.toLowerCase().includes("catálogo") || item.data.promptPt.includes("sharp");
        
        const settings = item.creationSettings || {
            objective: isCatalog ? 'Catálogo' : 'Post Social',
            aspectRatio: item.aspectRatio,
            angle: '3/4',
            shadow: 'Suave',
            background: 'Branco puro',
            props: [],
            rotation: item.rotation,
            lockProduct: true,
            ambienceDescription: undefined,
            tone: undefined,
            textPresence: undefined,
            customPersonalization: undefined,
            customProps: undefined,
            marketingDirection: undefined
        };

        const hasPersonalizationRef = item.referenceImages?.some(img => img.usageType === 'Personalização');

        const finalSettings = {
            ...settings,
            aspectRatio: item.aspectRatio,
            rotation: item.rotation,
            copyTitle: item.data.copyTitle,
            copySubtitle: item.data.copySubtitle,
            copyOffer: item.data.copyOffer,
            lockProduct: settings.lockProduct ?? true,
            hasPersonalizationRef,
            marketingDirection: formData.marketingDirection
        };

        const overrideEn = item.isRegenerated ? item.data.promptEn : undefined;

        const tech = await prepareTechnicalPrompt(
            item.data.promptPt,
            item.data.negativePt,
            // @ts-ignore
            finalSettings,
            overrideEn
        );

        const url = await generateImageFromPrompt(tech.finalPromptEn, item.referenceImages, item.aspectRatio);

        // SUCCESS: Atualiza galeria E salva no Histórico Leve
        setGalleryItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            status: 'completed',
            generatedImageUrl: url,
            data: {
                ...i.data,
                promptEn: tech.promptEn,
                negativeEn: tech.negativeEn,
                finalPromptEn: tech.finalPromptEn
            }
        } : i));

        // SALVA HISTÓRICO LEVE (Sem imagens, apenas metadados)
        const historyItem: HistoryMetadata = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            productName: formData.productName,
            presetUsed: settings.objective,
            ambienceTitle: settings.ambienceDescription ? 'Custom/Selected' : 'Studio Standard',
            aspectRatio: item.aspectRatio,
            promptFinalEn: tech.finalPromptEn,
            tags: [settings.marketingDirection || 'Standard', settings.objective]
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

  // --- ACTIONS ---

  const handleGeneratePrompts = async (isMore: boolean = false) => {
    if (!formData.productName) return;
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
        status: 'draft',
        creationSettings: {
            objective: formData.objective,
            background: formData.background,
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
      showToast("Prompts gerados! Revisão e criação disponíveis.", "success");
    } catch (error: any) { 
        showToast(`Erro ao gerar prompts: ${error.message}`, "error");
    } finally { 
        setIsGeneratingPrompts(false); 
    }
  };

  const handleQueueAllPending = () => {
      setGalleryItems(prev => prev.map(item => {
          if (item.status === 'draft' || item.status === 'error') {
              return { ...item, status: 'queued' };
          }
          return item;
      }));
      showToast("Itens adicionados à fila de processamento.", "info");
  };

  const clearGallery = async () => {
    if(confirm("ATENÇÃO: Deseja apagar todo o histórico de versões desta sessão?")) {
        try { 
            await clearGalleryDB(); 
            setGalleryItems([]); 
            showToast("Galeria limpa com sucesso.", "success");
        } catch (err: any) { 
            showToast("Erro ao limpar galeria.", "error"); 
        }
    }
  };

  const handleResetSession = async () => {
    if (confirm("INICIAR NOVO PRODUTO?\n\nIsso limpará o formulário, briefing e referências para você começar do zero.\n\nO histórico de imagens geradas será MANTIDO.")) {
        setIsGeneratingPrompts(false);
        // Preserva ambientações carregadas
        const currentAmbiences = getStoredAmbiences();
        setFormData({ ...INITIAL_FORM_STATE, customAmbiences: currentAmbiences });

        try { await saveDraftToDB(INITIAL_FORM_STATE); } catch (e) { console.error(e); }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast("Sessão reiniciada para novo produto.", "info");
    }
  };

  // --- DATA MANAGEMENT HANDLERS ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const restoredData = await importData(file);
        
        if (restoredData) {
          setFormData(restoredData);
          showToast('✅ Backup restaurado com sucesso! Carregando...', 'success');
        } else {
          showToast('✅ Backup restaurado parcialmente (Presets/Histórico).', 'info');
        }
        
        // Recarrega a página após 2 segundos para garantir sincronização
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } catch (error: any) {
        showToast(`❌ Falha na importação: ${error.message}`, 'error');
      }
      
      // Limpa o input para permitir reimportar o mesmo arquivo
      e.target.value = '';
  };

  const handleClearHistory = () => {
      if(confirm("Limpar todo o Histórico Leve (Metadados)? Isso não pode ser desfeito.")) {
          clearHistory();
          setHistoryCount(0);
          showToast("Histórico leve apagado.", "warning");
      }
  };

  const queuedCount = galleryItems.filter(i => i.status === 'queued').length;
  const pendingCount = galleryItems.filter(i => i.status === 'draft').length;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-white selection:bg-amber-500 selection:text-white' : 'bg-gray-50 text-zinc-900 selection:bg-amber-500 selection:text-white'}`}>
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <nav className={`border-b ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-white/80'} backdrop-blur-md sticky top-0 z-50 transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg"><Aperture className="text-white w-5 h-5" /></div>
                <div><h1 className="font-bold text-lg leading-tight">Inovação Entalhe</h1><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Image Studio AI</p></div>
            </div>
            <div className="flex items-center gap-4">
                 
                 <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
                    title="Alternar tema"
                 >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
                 </button>

                 <button 
                    onClick={handleResetSession}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-600' : 'bg-white hover:bg-zinc-50 text-zinc-600 border-zinc-200'}`}
                    title="Começar um novo produto (Mantém galeria)"
                 >
                    <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Novo Produto</span>
                 </button>

                 <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="text-zinc-500 hover:text-amber-500 transition-colors relative"
                    title="Gerenciar Dados e Backup"
                 >
                    <Settings className="w-5 h-5" />
                 </button>

                 {isLoadingDB && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                 
                 <div className={`hidden md:flex items-center gap-3 border rounded-full px-4 py-1.5 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${activeRenders.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Executando: <span className={theme === 'dark' ? 'text-white' : 'text-zinc-900'}>{activeRenders.length}</span></span>
                    </div>
                    <div className="w-px h-3 bg-zinc-600"></div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Na Fila: <span className="text-blue-500">{queuedCount}</span></span>
                 </div>
            </div>
        </div>
      </nav>

      {/* MODAL DE DADOS/BACKUP */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg shadow-2xl animate-scale-in relative">
                <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-500" /> Gerenciamento de Dados v4.0
                </h3>

                <div className="space-y-6">
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                        <h4 className="text-xs font-black uppercase text-zinc-400 mb-2">Base de Conhecimento (Leve)</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white font-mono">{historyCount} itens salvos</span>
                            <button onClick={handleClearHistory} className="text-[10px] font-bold uppercase text-red-400 hover:text-red-300 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Limpar
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                            Armazena apenas metadados (prompts, presets, configs) dos últimos 100 itens. Não ocupa memória do dispositivo com imagens.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => exportData(formData)} className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-950 border border-zinc-800 hover:border-amber-500 rounded-xl transition-all group">
                            <Download className="w-6 h-6 text-zinc-500 group-hover:text-amber-500" />
                            <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase">Exportar Completo</span>
                        </button>
                        
                        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-950 border border-zinc-800 hover:border-blue-500 rounded-xl transition-all group cursor-pointer">
                            <Upload className="w-6 h-6 text-zinc-500 group-hover:text-blue-500" />
                            <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase">Restaurar Backup</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-500">
                            Backup v4.0: Inclui Presets, Ambientações, Histórico e <strong>Imagens de Referência Atuais</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                <Controls formData={formData} setFormData={setFormData} onGenerate={() => handleGeneratePrompts(false)} isGenerating={isGeneratingPrompts} />
            </div>

            <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                <div className={`flex justify-between items-center p-4 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    <div>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}><Layers className="w-5 h-5 text-zinc-500" /> Fluxo de Criação</h2>
                        <p className="text-[10px] text-zinc-500 mt-1">Gerencie suas variações e renderizações.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {galleryItems.length > 0 && pendingCount > 0 && (
                             <button 
                                onClick={handleQueueAllPending}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-all shadow-lg hover:shadow-blue-900/20"
                            >
                                <Play className="w-3 h-3 fill-current" /> Criar ({pendingCount}) Pendentes
                            </button>
                        )}
                        
                        <button 
                            onClick={() => handleGeneratePrompts(true)}
                            disabled={isGeneratingPrompts}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-950/40 transition-all"
                        >
                            {isGeneratingPrompts ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} +2 Variações
                        </button>
                    </div>
                </div>

                {isLoadingDB ? 
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /><p>Carregando estúdio...</p></div> 
                    : 
                    <div className="space-y-4">
                        <Gallery items={galleryItems} setItems={setGalleryItems} />
                        {galleryItems.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <button onClick={clearGallery} className="text-[10px] text-zinc-600 hover:text-red-500 flex items-center gap-1 transition-colors">
                                    <RotateCcw className="w-3 h-3" /> Limpar Histórico de Imagens
                                </button>
                            </div>
                        )}
                    </div>
                }
            </div>
        </div>
      </main>
      <footer className={`border-t mt-12 py-8 text-center text-sm ${theme === 'dark' ? 'border-zinc-900 bg-zinc-950 text-zinc-600' : 'border-zinc-200 bg-gray-50 text-zinc-400'}`}><p>© {new Date().getFullYear()} Inovação Entalhe. Powered by Google Gemini.</p></footer>
    </div>
  );
};