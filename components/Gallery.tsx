
import React, { useState, useEffect, useRef } from 'react';
import { GalleryItem } from '../types';
import { Image as ImageIcon, LayoutGrid, Clock, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { ResultCard } from './ResultCard';

interface GalleryProps {
  items: GalleryItem[];
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
}

export const Gallery: React.FC<GalleryProps> = ({ items, setItems }) => {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevItemsLength = useRef(items.length);

  // Auto-select logic & Auto-scroll logic
  useEffect(() => {
    // Se a quantidade de itens aumentou (novos itens adicionados no topo)
    if (items.length > prevItemsLength.current) {
        // Scroll para o início (esquerda) suavemente
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }

        // Seleciona o novo item se for rascunho ou renderizando
        const firstItem = items[0];
        if (firstItem && (firstItem.status === 'rendering' || firstItem.status === 'draft' || firstItem.status === 'queued')) {
            setActiveItemId(firstItem.id);
        }
    }
    prevItemsLength.current = items.length;

    // Fallback de seleção inicial
    if (!activeItemId && items.length > 0) {
        setActiveItemId(items[0].id);
    }
  }, [items, activeItemId]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-50 p-12 border-2 border-dashed border-zinc-800 rounded-xl">
        <ImageIcon className="w-12 h-12 mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs">Aguardando geração de prompts...</p>
      </div>
    );
  }

  const activeItem = items.find(i => i.id === activeItemId) || items[0];

  return (
    <div className="space-y-6">
      
      {/* 1. Histórico Horizontal (Sidebar) - AGORA NO TOPO */}
      <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <History className="w-3 h-3" /> Histórico da Sessão
              </h3>
              <span className="text-[9px] font-bold bg-zinc-900 px-2 py-1 rounded text-zinc-400">
                  {items.length} Versões
              </span>
          </div>

          <div className="relative group">
              <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto custom-scrollbar pb-4 pt-1 px-1 snap-x scroll-smooth">
                  {items.map((item) => (
                      <div key={item.id} className="snap-start shrink-0 w-24 sm:w-28">
                        <ResultCard 
                            item={item} 
                            setItems={setItems} 
                            isActive={false} 
                            onSelect={() => setActiveItemId(item.id)}
                            isSelected={activeItemId === item.id}
                        />
                      </div>
                  ))}
              </div>
              
              {/* Fade indicators */}
              <div className="absolute top-0 bottom-4 left-0 w-8 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
              <div className="absolute top-0 bottom-4 right-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
          </div>
      </div>

      {/* 2. Item Ativo em destaque (Main View) - AGORA EMBAIXO */}
      <div className="mb-8 animate-fade-in">
          <ResultCard item={activeItem} setItems={setItems} isActive={true} />
      </div>

    </div>
  );
};
