
import React, { useState, useEffect } from 'react';
import { GalleryItem, AspectRatio, RotationDegree, MarketingTone } from '../types';
import { ASPECT_RATIOS, ROTATION_OPTIONS, BRAND_COLOR } from '../constants';
import { 
  CheckCircle2, Zap, ShieldCheck, Eye, EyeOff, Loader2, Sparkles, RefreshCw, ShoppingCart, Share2, Copy, FileText, Calendar, Maximize2, PlayCircle, Clock, Type, Layout, Download
} from 'lucide-react';

interface ResultCardProps {
  item: GalleryItem;
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  isActive?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

const getOverlayPosition = (item: GalleryItem) => {
    const isVertical = item.aspectRatio === '9:16' || item.aspectRatio === '3:4' || item.aspectRatio === '4:5';
    if (isVertical) {
        return "justify-end pb-[15%] items-center text-center px-[10%]";
    }
    return "justify-center items-center text-center px-[12%]"; 
};

export const ResultCard: React.FC<ResultCardProps> = ({ item, setItems, isActive = true, onSelect, isSelected = false }) => {
  const [showEnglish, setShowEnglish] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  
  const [pPt, setPPt] = useState(item.data.promptPt);
  const [nPt, setNPt] = useState(item.data.negativePt);
  const [lAR, setLAR] = useState<AspectRatio>(item.aspectRatio || '1:1');

  // Lógica de Copy: Prioriza IA em "Texto Integrado"
  const useAiCopy = item.creationSettings?.marketingDirection === 'Texto integrado';
  
  const [editTitle, setEditTitle] = useState(useAiCopy ? (item.data.copyTitle || "") : "");
  const [editSubtitle, setEditSubtitle] = useState(useAiCopy ? (item.data.copySubtitle || "") : "");
  const [editOffer, setEditOffer] = useState(useAiCopy ? (item.data.copyOffer || "") : "");

  useEffect(() => {
    setPPt(item.data.promptPt);
    setNPt(item.data.negativePt);
    setLAR(item.aspectRatio);
    if (useAiCopy) {
        setEditTitle(item.data.copyTitle || "");
        setEditSubtitle(item.data.copySubtitle || "");
        setEditOffer(item.data.copyOffer || "");
    }
  }, [item.id, item.data.copyTitle, item.data.copySubtitle, item.data.copyOffer, useAiCopy]);

  const addToQueue = () => {
    const updatedData = { ...item.data, promptPt: pPt, negativePt: nPt, copyTitle: editTitle, copySubtitle: editSubtitle, copyOffer: editOffer };
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'queued', aspectRatio: lAR, data: updatedData } : i));
  };

  const processAndDownload = async (type: 'HQ' | 'ECOMMERCE') => {
    if (!item.generatedImageUrl) return;
    setIsDownloading(type);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.generatedImageUrl;
    
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const targetWidth = type === 'HQ' ? 2048 : 1200;
      const targetHeight = targetWidth / (img.width / img.height);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      if (showOverlay && (editTitle || editSubtitle || editOffer)) {
          const isVertical = item.aspectRatio === '9:16' || item.aspectRatio === '3:4' || item.aspectRatio === '4:5';
          const safeArea = targetWidth * 0.12;
          const maxWidth = targetWidth - (safeArea * 2);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let currentY = isVertical ? (targetHeight * 0.75) : (targetHeight * 0.45);

          if (editTitle) {
              const fontSize = targetWidth * 0.08;
              ctx.font = `900 ${fontSize}px sans-serif`;
              ctx.fillStyle = 'white';
              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur = 15;
              ctx.fillText(editTitle.toUpperCase(), targetWidth / 2, currentY, maxWidth);
              currentY += fontSize * 1.1;
          }

          if (editSubtitle) {
              const fontSize = targetWidth * 0.04;
              ctx.font = `600 ${fontSize}px sans-serif`;
              ctx.fillStyle = 'rgba(255,255,255,0.95)';
              ctx.shadowBlur = 8;
              ctx.fillText(editSubtitle, targetWidth / 2, currentY, maxWidth);
              currentY += fontSize * 2.2;
          }

          if (editOffer) {
              const fontSize = targetWidth * 0.035;
              ctx.font = `900 ${fontSize}px sans-serif`;
              const metrics = ctx.measureText(editOffer.toUpperCase());
              const bgW = metrics.width + (fontSize * 2);
              const bgH = fontSize * 2.2;
              ctx.fillStyle = BRAND_COLOR;
              ctx.fillRect((targetWidth / 2) - (bgW / 2), currentY - (bgH / 2), bgW, bgH);
              ctx.fillStyle = 'black';
              ctx.fillText(editOffer.toUpperCase(), targetWidth / 2, currentY);
          }
      }
      
      const link = document.createElement('a');
      link.download = `entalhe_${type}_${item.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
      setIsDownloading(null);
    };
  };

  const isCompleted = item.status === 'completed';
  const isRendering = item.status === 'rendering';
  const hasText = !!(editTitle || editSubtitle || editOffer);

  if (!isActive) {
      return (
          <div onClick={onSelect} className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all aspect-square border-2 ${isSelected ? 'border-[#FCB82E] scale-105 z-10' : 'border-zinc-800 opacity-60 hover:opacity-100'}`}>
              {item.generatedImageUrl ? <img src={item.generatedImageUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full bg-zinc-900">{isRendering ? <Loader2 className="animate-spin text-[#FCB82E] w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-zinc-800" />}</div>}
          </div>
      );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col border-t-2 border-t-[#FCB82E]/30 animate-fade-in">
      <div className="bg-zinc-800/80 px-4 py-3 border-b border-zinc-700/50 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <Layout className="w-3 h-3 text-[#FCB82E]" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.data.layout}</span>
         </div>
         <div className="flex items-center gap-4">
            {hasText && (
                <button onClick={() => setShowOverlay(!showOverlay)} className={`text-[9px] font-bold uppercase px-2 py-1 rounded border transition-all ${showOverlay ? 'bg-amber-900/20 border-amber-500 text-amber-500' : 'bg-zinc-950 border-zinc-700 text-zinc-500'}`}>
                    {showOverlay ? 'Overlay: ON' : 'Overlay: OFF'}
                </button>
            )}
            <select disabled={!isCompleted} value={lAR} onChange={e => setLAR(e.target.value as AspectRatio)} className="bg-zinc-950 border border-zinc-700 text-[10px] text-zinc-300 rounded px-2 py-1 outline-none">
                {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
         </div>
      </div>

      <div className="flex flex-col flex-1">
          <div className="w-full bg-zinc-950 flex flex-col items-center p-6 relative min-h-[400px]">
              {item.generatedImageUrl ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative overflow-hidden rounded shadow-2xl border border-zinc-800 bg-zinc-900 w-full flex items-center justify-center group">
                        <img src={item.generatedImageUrl} className="max-h-[600px] w-auto object-contain" />
                        {showOverlay && hasText && (
                            <div className={`absolute inset-0 flex flex-col pointer-events-none z-10 transition-all ${getOverlayPosition(item)}`}>
                                <div className="space-y-2 w-full break-words animate-slide-up">
                                    {editTitle && <h2 className="text-2xl md:text-4xl text-white font-black uppercase drop-shadow-2xl leading-none">{editTitle}</h2>}
                                    {editSubtitle && <h3 className="text-xs md:text-lg text-zinc-100 font-medium drop-shadow-lg opacity-90">{editSubtitle}</h3>}
                                    {editOffer && <div className="mt-3 inline-block px-4 py-1.5 bg-[#FCB82E] text-black text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl">{editOffer}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                        <button disabled={!!isDownloading} onClick={() => processAndDownload('HQ')} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase border border-zinc-700 transition-all active:scale-95">
                            {isDownloading === 'HQ' ? <Loader2 className="animate-spin w-3 h-3" /> : <Download className="w-3 h-3 text-blue-400" />} Baixar HQ (2K)
                        </button>
                        <button disabled={!!isDownloading} onClick={() => processAndDownload('ECOMMERCE')} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase border border-zinc-700 transition-all active:scale-95">
                            {isDownloading === 'ECOMMERCE' ? <Loader2 className="animate-spin w-3 h-3" /> : <ShoppingCart className="w-3 h-3 text-emerald-400" />} E-commerce
                        </button>
                    </div>
                  </div>
              ) : (
                  <div className="py-24 flex flex-col items-center justify-center text-zinc-700 flex-1">
                      {isRendering ? <div className="flex flex-col items-center"><Loader2 className="w-12 h-12 animate-spin text-[#FCB82E] mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Renderizando Cena...</p></div> : <div className="opacity-30 flex flex-col items-center"><Clock className="w-12 h-12 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Na Fila</p></div>}
                  </div>
              )}
          </div>
          <div className="p-6 bg-zinc-900/40 border-t border-zinc-800/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-600 uppercase">Título</label>
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-[#FCB82E]" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-600 uppercase">Subtítulo</label>
                      <input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-[#FCB82E]" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-600 uppercase">CTA / Oferta</label>
                      <input value={editOffer} onChange={e => setEditOffer(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-[#FCB82E]" />
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
