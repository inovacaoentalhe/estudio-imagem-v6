
import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, Star, Trash2, Users, PenTool } from 'lucide-react';
import { FormData, ReferenceImage, ReferenceUsageType } from '../types';
import { REFERENCE_USAGE_TYPES } from '../constants';

interface ReferenceUploadProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export const ReferenceUpload: React.FC<ReferenceUploadProps> = ({ formData, setFormData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert(`Formato não suportado: ${file.name}. Use PNG, JPG ou WEBP.`);
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setFormData(prev => {
          const isFirst = prev.referenceImages.length === 0;
          const newImage: ReferenceImage = {
            id: crypto.randomUUID(),
            dataUrl,
            mimeType: file.type,
            fileName: file.name,
            width: img.width,
            height: img.height,
            sizeMb,
            isHero: isFirst,
            usageType: 'Formato'
          };
          return {
            ...prev,
            referenceImages: [...prev.referenceImages, newImage],
            useRefImages: true
          };
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(processFile);
  };

  const setHero = (id: string) => {
    setFormData(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.map(img => ({
        ...img,
        isHero: img.id === id
      }))
    }));
  };

  const setUsageType = (id: string, type: ReferenceUsageType) => {
    setFormData(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.map(img => ({
        ...img,
        usageType: img.id === id ? type : img.usageType
      }))
    }));
  };

  const removeImage = (id: string) => {
    setFormData(prev => {
      const newImages = prev.referenceImages.filter(img => img.id !== id);
      if (newImages.length > 0 && !newImages.some(i => i.isHero)) {
        newImages[0].isHero = true;
      }
      return {
        ...prev,
        referenceImages: newImages,
        useRefImages: newImages.length > 0
      };
    });
  };

  const heroImage = formData.referenceImages.find(img => img.isHero);

  return (
    <div className="space-y-6">
      {/* Hero Preview Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                Imagem Principal (HERO)
            </label>
        </div>
        
        {heroImage ? (
            <div className="relative aspect-square w-full bg-zinc-950 rounded-xl overflow-hidden border border-amber-500/30 group">
                <img src={heroImage.dataUrl} alt="Hero" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                        onClick={() => removeImage(heroImage.id)}
                        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-500 shadow-xl"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
                <div className="absolute top-3 left-3 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg uppercase">
                    HERO PREVIEW
                </div>
            </div>
        ) : (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square w-full border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-amber-500/50 cursor-pointer transition-all group"
            >
                <Upload className="w-10 h-10 text-zinc-700 group-hover:text-amber-500 mb-3 transition-colors" />
                <p className="text-sm text-zinc-500 font-medium">Envie a imagem HERO do produto</p>
                <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG ou WEBP suportados</p>
            </div>
        )}
      </div>

      {/* Multi-upload & Grid Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-500" /> Galeria de Referências
            </h3>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
            >
                Adicionar mais
            </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileChange} />
            
            {formData.referenceImages.map(img => (
                <div key={img.id} className={`relative bg-zinc-950 rounded-lg border p-2 flex flex-col gap-2 transition-all ${img.isHero ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-zinc-800'}`}>
                    <div className="relative aspect-video rounded overflow-hidden bg-zinc-900">
                        <img src={img.dataUrl} alt="ref" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => removeImage(img.id)}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white hover:text-red-400 rounded"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        {img.isHero && (
                            <div className="absolute top-1 left-1 bg-amber-500 text-black p-0.5 rounded shadow">
                                <Star className="w-2.5 h-2.5 fill-black" />
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-1.5">
                        <select 
                            value={img.usageType}
                            onChange={(e) => setUsageType(img.id, e.target.value as any)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-400 rounded px-1 py-0.5 outline-none focus:border-pink-500"
                        >
                            {REFERENCE_USAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        
                        {!img.isHero && (
                            <button 
                                onClick={() => setHero(img.id)}
                                className="w-full py-1 text-[8px] font-bold uppercase tracking-tight text-zinc-500 hover:text-amber-500 border border-zinc-800 hover:border-amber-500/30 rounded transition-all"
                            >
                                Definir como HERO
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Personalization Section */}
      <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-zinc-300">
              <Users className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold">Controle de Personalização</h3>
          </div>
          
          <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                  <PenTool className="w-3 h-3" /> Alterar Personalização (Sobrescrever)
              </label>
              <textarea 
                  value={formData.customPersonalization}
                  onChange={(e) => setFormData(prev => ({ ...prev, customPersonalization: e.target.value }))}
                  placeholder="Ex: Trocar logo para 'Apple'. Escrever 'Feliz Natal'. Remover texto lateral."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none placeholder:text-zinc-600"
                  rows={2}
              />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="lockFid" 
                    checked={formData.lockProduct}
                    onChange={(e) => setFormData(p => ({ ...p, lockProduct: e.target.checked }))}
                    className="accent-blue-500"
                  />
                  <label htmlFor="lockFid" className="text-[11px] text-zinc-400 cursor-pointer">
                      Travar produto (fidelidade)
                  </label>
              </div>
              <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="prioritizeFid" 
                    checked={formData.prioritizeFidelity}
                    onChange={(e) => setFormData(p => ({ ...p, prioritizeFidelity: e.target.checked }))}
                    className="accent-green-500"
                  />
                  <label htmlFor="prioritizeFid" className="text-[11px] text-zinc-400 cursor-pointer">
                      Fidelidade máxima
                  </label>
              </div>
          </div>
      </div>
    </div>
  );
};
