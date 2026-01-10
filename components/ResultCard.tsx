
import React, { useState, useEffect, useRef } from 'react';
import { GalleryItem, AspectRatio, TextLayerConfig, TextStyle } from '../types';
import { BRAND_COLOR } from '../constants';
import { 
  Loader2, Download, Copy, RefreshCw, Type, Eye,
  Sliders, FileText, ArrowDownToLine, ShoppingBag, Palette
} from 'lucide-react';

interface ResultCardProps {
  item: GalleryItem;
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  isActive?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, setItems, isActive = true, onSelect, isSelected = false }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'prompt'>('visual');
  const [isDownloading, setIsDownloading] = useState(false);
  const [localPromptPt, setLocalPromptPt] = useState(item.data.promptPt);
  
  // Controle Visual de Texto (Layers) com Cores
  const [textConfig, setTextConfig] = useState<{
    title: TextLayerConfig;
    subtitle: TextLayerConfig;
    offer: TextLayerConfig;
  }>(item.textLayerSettings || {
    title: { yPercent: 15, visible: true, scale: 1, color: '#FFFFFF' },
    subtitle: { yPercent: 45, visible: true, scale: 1, color: '#FFFFFF' },
    offer: { yPercent: 80, visible: true, scale: 1, color: '#000000' }
  });

  const [currentTextStyle, setCurrentTextStyle] = useState<TextStyle>(item.textStyle || 'modern');

  // Texto Editável
  const [editTitle, setEditTitle] = useState(item.data.copyTitle || "");
  const [editSubtitle, setEditSubtitle] = useState(item.data.copySubtitle || "");
  const [editOffer, setEditOffer] = useState(item.data.copyOffer || "");

  const isIntegratedText = item.creationSettings?.marketingDirection === 'Texto integrado';

  useEffect(() => {
    setLocalPromptPt(item.data.promptPt);
    setEditTitle(item.data.copyTitle || "");
    setEditSubtitle(item.data.copySubtitle || "");
    setEditOffer(item.data.copyOffer || "");
  }, [item.id]);

  useEffect(() => {
    if (isActive) {
        setItems(prev => prev.map(i => i.id === item.id ? { 
            ...i, 
            textLayerSettings: textConfig, 
            textStyle: currentTextStyle 
        } : i));
    }
  }, [textConfig, currentTextStyle, isActive]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(item.data.finalPromptEn || "");
    alert("Prompt Técnico (EN) copiado!");
  };

  const handleRegenerate = (withIntegratedText: boolean) => {
    const newItem: GalleryItem = {
        ...item,
        id: crypto.randomUUID(),
        status: 'queued',
        timestamp: Date.now(),
        isRegenerated: true,
        data: {
            ...item.data,
            promptPt: localPromptPt,
            copyTitle: editTitle,
            copySubtitle: editSubtitle,
            copyOffer: editOffer
        },
        creationSettings: {
            ...item.creationSettings!,
            marketingDirection: withIntegratedText ? 'Texto integrado' : 'Espaço reservado'
        }
    };
    setItems(prev => [newItem, ...prev]);
  };

  const toggleTextStyle = () => {
      const styles: TextStyle[] = ['modern', 'classic', 'bold', 'ribbon', 'banner'];
      const nextIndex = (styles.indexOf(currentTextStyle) + 1) % styles.length;
      setCurrentTextStyle(styles[nextIndex]);
  };

  // Funções de Estilo CSS para o DOM
  const getStyleClasses = (style: TextStyle) => {
      switch(style) {
          case 'modern': return "font-sans tracking-tight";
          case 'classic': return "font-serif tracking-widest";
          case 'bold': return "font-black tracking-tighter uppercase";
          case 'ribbon': return "font-bold"; 
          case 'banner': return "font-bold tracking-wide";
          default: return "font-sans";
      }
  };

  /**
   * Função Unificada de Download (HD e E-commerce)
   * Funde texto e imagem usando Canvas
   */
  const downloadMergedImage = async (resolution: 'hd' | 'ecommerce') => {
    if (!item.generatedImageUrl) return;
    setIsDownloading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.generatedImageUrl;
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Define tamanho do Canvas
        let targetW, targetH;
        if (resolution === 'hd') {
            targetW = img.width;
            targetH = img.height;
        } else {
            // E-commerce: 1200px max
            const scale = 1200 / Math.min(img.width, img.height);
            targetW = img.width * scale;
            targetH = img.height * scale;
        }
        
        canvas.width = targetW;
        canvas.height = targetH;

        // 1. Desenha Imagem Base
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // 2. Desenha Texto (Se não for integrado e estiver visível)
        if (!isIntegratedText) {
            const centerX = targetW / 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Configurar fonte baseada no estilo
            const getFont = (baseSize: number, weight: string = 'bold') => {
                const family = currentTextStyle === 'classic' ? 'serif' : 'sans-serif';
                return `${weight} ${baseSize}px ${family}`;
            };

            // TÍTULO
            if (textConfig.title.visible && editTitle) {
                const fontSize = targetW * 0.08 * textConfig.title.scale;
                const yPos = targetH * (textConfig.title.yPercent / 100);
                
                ctx.font = getFont(fontSize, currentTextStyle === 'bold' ? '900' : 'bold');
                ctx.fillStyle = textConfig.title.color || '#FFFFFF';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 15;
                
                // Caixa para Banner style
                if (currentTextStyle === 'banner') {
                     const metrics = ctx.measureText(editTitle.toUpperCase());
                     ctx.fillStyle = 'rgba(0,0,0,0.7)';
                     ctx.fillRect(0, yPos - fontSize/1.5, targetW, fontSize * 1.5);
                     ctx.fillStyle = textConfig.title.color || '#FFFFFF';
                }

                const textToDraw = currentTextStyle === 'bold' || currentTextStyle === 'banner' ? editTitle.toUpperCase() : editTitle;
                ctx.fillText(textToDraw, centerX, yPos);
            }

            // SUBTÍTULO
            if (textConfig.subtitle.visible && editSubtitle) {
                const fontSize = targetW * 0.04 * textConfig.subtitle.scale;
                const yPos = targetH * (textConfig.subtitle.yPercent / 100);
                
                ctx.font = getFont(fontSize, '500');
                ctx.fillStyle = textConfig.subtitle.color || 'rgba(255,255,255,0.95)';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 10;
                ctx.fillText(editSubtitle, centerX, yPos);
            }

            // OFERTA / CTA
            if (textConfig.offer.visible && editOffer) {
                const fontSize = targetW * 0.035 * textConfig.offer.scale;
                const yPos = targetH * (textConfig.offer.yPercent / 100);
                
                ctx.font = getFont(fontSize, '900');
                const text = editOffer.toUpperCase();
                const metrics = ctx.measureText(text);
                const paddingX = fontSize;
                const bgW = metrics.width + paddingX * 2;
                const bgH = fontSize * 2.2;

                ctx.save();
                ctx.translate(centerX, yPos);

                if (currentTextStyle === 'ribbon') {
                    ctx.transform(1, 0, -0.2, 1, 0, 0); // Skew
                    ctx.fillStyle = '#dc2626'; // Red fixo para Ribbon
                } else {
                    ctx.fillStyle = BRAND_COLOR; // Amber default background
                }

                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 20;
                ctx.fillRect(-bgW/2, -bgH/2, bgW, bgH);
                
                ctx.restore();

                ctx.shadowBlur = 0;
                // Aplica cor do texto escolhida pelo usuário sobre o botão
                ctx.fillStyle = textConfig.offer.color || 'black';
                
                ctx.fillText(text, centerX, yPos);
            }
        }

        // Compressão dinâmica e Download
        const link = document.createElement('a');
        const fileName = resolution === 'hd' ? `entalhe_hd_${item.id}.jpg` : `entalhe_ecommerce_${item.id}.jpg`;
        const quality = resolution === 'hd' ? 0.95 : 0.82;
        
        link.download = fileName;
        link.href = canvas.toDataURL('image/jpeg', quality); 
        link.click();
        setIsDownloading(false);
    };
  };

  const updateTextConfig = (layer: 'title' | 'subtitle' | 'offer', key: keyof TextLayerConfig, value: any) => {
    setTextConfig(prev => ({
        ...prev,
        [layer]: { ...prev[layer], [key]: value }
    }));
  };

  if (!isActive) {
      return (
          <div onClick={onSelect} className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all aspect-square border-2 bg-zinc-900 ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-zinc-800 hover:border-zinc-600'}`}>
              {item.generatedImageUrl ? (
                <img src={item.generatedImageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                    {item.status === 'rendering' ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <div className="w-2 h-2 rounded-full bg-zinc-700" />}
                </div>
              )}
          </div>
      );
  }

  // RENDERIZAÇÃO PRINCIPAL
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-fade-in min-h-[750px]">
      
      {/* 1. ÁREA DA IMAGEM (ESQUERDA) - AUMENTADA PARA 85vh max */}
      <div className="flex-1 bg-zinc-950 relative flex items-center justify-center p-0 group overflow-hidden">
        {item.generatedImageUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                <img src={item.generatedImageUrl} className="w-full h-full object-contain max-h-[85vh]" />
                
                {/* LAYER DE TEXTO (SOBREPOSIÇÃO HTML - WYSIWYG) */}
                {!isIntegratedText && (
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${getStyleClasses(currentTextStyle)}`}>
                        {textConfig.title.visible && editTitle && (
                            <div style={{ top: `${textConfig.title.yPercent}%` }} className={`absolute w-full flex justify-center transform -translate-y-1/2`}>
                                <h2 
                                    style={{ 
                                        transform: `scale(${textConfig.title.scale})`,
                                        color: textConfig.title.color || '#FFFFFF' 
                                    }}
                                    className={`text-center drop-shadow-2xl px-8 ${currentTextStyle === 'banner' ? 'bg-black/60 w-full py-4' : ''} ${currentTextStyle === 'bold' ? 'text-4xl md:text-6xl' : 'text-3xl md:text-5xl font-bold'}`}
                                >
                                    {editTitle}
                                </h2>
                            </div>
                        )}
                        {textConfig.subtitle.visible && editSubtitle && (
                            <div style={{ top: `${textConfig.subtitle.yPercent}%` }} className="absolute w-full flex justify-center transform -translate-y-1/2">
                                <p 
                                    style={{ 
                                        transform: `scale(${textConfig.subtitle.scale})`,
                                        color: textConfig.subtitle.color || '#FFFFFF'
                                    }}
                                    className="text-center text-sm md:text-xl drop-shadow-lg px-8 font-medium"
                                >
                                    {editSubtitle}
                                </p>
                            </div>
                        )}
                        {textConfig.offer.visible && editOffer && (
                            <div style={{ top: `${textConfig.offer.yPercent}%` }} className="absolute w-full flex justify-center transform -translate-y-1/2">
                                <span 
                                    style={{ 
                                        transform: `scale(${textConfig.offer.scale})`,
                                        color: textConfig.offer.color || '#000000'
                                    }}
                                    className={`${currentTextStyle === 'ribbon' ? 'bg-red-600 text-white skew-x-[-10deg]' : 'bg-amber-500'} px-6 py-2 font-black uppercase text-xs md:text-sm shadow-xl`}
                                >
                                    {editOffer}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Switch de Estilo Rápido */}
                {!isIntegratedText && (
                    <button 
                        onClick={toggleTextStyle}
                        className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white p-2 rounded-full hover:bg-amber-600 transition-colors z-10 border border-white/20 group"
                        title={`Estilo: ${currentTextStyle}`}
                    >
                        <Type className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                )}
            </div>
        ) : (
            <div className="text-center space-y-3 p-10">
                {item.status === 'rendering' ? <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" /> : <RefreshCw className="w-12 h-12 text-zinc-700 mx-auto" />}
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.status === 'rendering' ? 'Renderizando Pixel a Pixel...' : 'Aguardando Processamento'}</p>
            </div>
        )}
      </div>

      {/* 2. ÁREA DE CONTROLES (DIREITA) */}
      <div className="w-full md:w-[320px] bg-zinc-900 border-l border-zinc-800 flex flex-col">
          
          <div className="flex border-b border-zinc-800">
              <button onClick={() => setActiveTab('visual')} className={`flex-1 py-3 text-[10px] font-bold uppercase ${activeTab === 'visual' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500'}`}>
                  <Sliders className="w-3 h-3 inline mr-1" /> Ajustes
              </button>
              <button onClick={() => setActiveTab('prompt')} className={`flex-1 py-3 text-[10px] font-bold uppercase ${activeTab === 'prompt' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-500'}`}>
                  <FileText className="w-3 h-3 inline mr-1" /> Prompt
              </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              {activeTab === 'visual' && !isIntegratedText && (
                  <div className="space-y-6 animate-slide-in">
                     
                     {/* Estilo Texto (Sidebar Control) */}
                     <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                         <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2 mb-2">
                             <Palette className="w-3 h-3" /> Estilo do Texto
                         </label>
                         <div className="grid grid-cols-3 gap-1">
                             {['modern', 'classic', 'bold', 'ribbon', 'banner'].map(s => (
                                 <button
                                    key={s}
                                    onClick={() => setCurrentTextStyle(s as TextStyle)}
                                    className={`text-[9px] uppercase font-bold py-1.5 px-1 rounded border transition-all ${currentTextStyle === s ? 'bg-amber-600 text-white border-amber-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
                                 >
                                     {s}
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* Controles de Posição E TAMANHO (RESTAURADO) */}
                     {['title', 'subtitle', 'offer'].map((layer) => (
                         <div key={layer} className="space-y-2 pb-4 border-b border-zinc-800 last:border-0">
                             <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-amber-500 uppercase">{layer === 'offer' ? 'CTA / Oferta' : layer === 'title' ? 'Título Principal' : 'Subtítulo'}</label>
                                <button onClick={() => updateTextConfig(layer as any, 'visible', !textConfig[layer as any].visible)}><Eye className={`w-3 h-3 ${textConfig[layer as any].visible ? 'text-white' : 'text-zinc-600'}`} /></button>
                             </div>
                             
                             {/* Input de Texto */}
                             <input 
                                value={layer === 'title' ? editTitle : layer === 'subtitle' ? editSubtitle : editOffer}
                                onChange={(e) => {
                                    if(layer==='title') setEditTitle(e.target.value);
                                    if(layer==='subtitle') setEditSubtitle(e.target.value);
                                    if(layer==='offer') setEditOffer(e.target.value);
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white mb-2 focus:border-amber-500 outline-none"
                                placeholder={`Texto do ${layer}...`}
                             />

                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Posição Y</label>
                                     <input 
                                        type="range" min="5" max="95" 
                                        value={textConfig[layer as any].yPercent} 
                                        onChange={(e) => updateTextConfig(layer as any, 'yPercent', Number(e.target.value))}
                                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Tamanho</label>
                                     <input 
                                        type="range" min="0.5" max="2.5" step="0.1"
                                        value={textConfig[layer as any].scale} 
                                        onChange={(e) => updateTextConfig(layer as any, 'scale', Number(e.target.value))}
                                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                     />
                                 </div>
                             </div>

                             {/* SELETOR DE COR DO TEXTO */}
                             <div className="flex items-center gap-2 mt-2">
                                <label className="text-[8px] font-bold text-zinc-500 uppercase">Cor do Texto:</label>
                                <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                                    <input 
                                        type="color" 
                                        value={textConfig[layer as any].color || '#FFFFFF'}
                                        onChange={(e) => updateTextConfig(layer as any, 'color', e.target.value)}
                                        className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0"
                                    />
                                    <span className="text-[9px] text-zinc-400 font-mono uppercase">{textConfig[layer as any].color || '#FFF'}</span>
                                </div>
                             </div>
                         </div>
                     ))}
                  </div>
              )}

              {activeTab === 'prompt' && (
                  <div className="space-y-4">
                      <textarea 
                        value={localPromptPt}
                        onChange={(e) => setLocalPromptPt(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-300 h-40 outline-none resize-none"
                      />
                      <button onClick={handleCopyPrompt} className="text-[10px] text-blue-400 flex items-center gap-1"><Copy className="w-3 h-3" /> Copiar Técnico (EN)</button>
                  </div>
              )}
          </div>

          <div className="p-3 bg-zinc-950 border-t border-zinc-800 grid grid-cols-2 gap-2">
              <button 
                onClick={() => downloadMergedImage('hd')} 
                disabled={!item.generatedImageUrl || isDownloading}
                className="py-2 bg-zinc-800 text-zinc-300 rounded flex items-center justify-center gap-1 text-[10px] font-bold uppercase hover:bg-zinc-700"
              >
                  {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Original (+ Texto)
              </button>
              <button 
                onClick={() => downloadMergedImage('ecommerce')} 
                disabled={!item.generatedImageUrl || isDownloading}
                className="py-2 bg-amber-600 text-white rounded flex items-center justify-center gap-1 text-[10px] font-bold uppercase hover:bg-amber-500 shadow-lg"
              >
                  {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingBag className="w-3 h-3" />} E-commerce
              </button>
              <button 
                onClick={() => handleRegenerate(false)}
                className="col-span-2 py-2 border border-zinc-700 text-zinc-400 rounded flex items-center justify-center gap-1 text-[10px] font-bold uppercase hover:text-white"
              >
                  <ArrowDownToLine className="w-3 h-3" /> Regerar (Layer)
              </button>
          </div>
      </div>
    </div>
  );
};
