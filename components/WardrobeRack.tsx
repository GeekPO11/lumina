
import React, { useState, useEffect } from 'react';
import { WardrobeParams, WardrobeReferences } from '../types';
import { Shirt, Search, Sparkles, Loader2, ArrowLeft, ImagePlus, Trash2, Wand2, Palette, Tag } from 'lucide-react';
import { searchFashionTrends, getStylistAdvice, analyzeGarmentImage } from '../services/geminiService';

interface WardrobeRackProps {
  initialData?: WardrobeParams | null;
  onComplete: (data: WardrobeParams) => void;
  onBack: () => void;
  onLog: (msg: string, system?: string) => void;
}

const WardrobeRack: React.FC<WardrobeRackProps> = ({ initialData, onComplete, onBack, onLog }) => {
  const [formData, setFormData] = useState<WardrobeParams>(initialData || {
    sku: '',
    fabric: '',
    fit: '',
    references: {},
    background: 'white',
    autoFabric: true
  });
  
  const [references, setReferences] = useState<WardrobeReferences>(initialData?.references || {});
  const [trendQuery, setTrendQuery] = useState('');
  const [trendResults, setTrendResults] = useState<{text: string, sources: any[]} | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Handle select element explicitly
    if (e.target.tagName === 'SELECT') {
       setFormData(prev => ({ ...prev, [name]: value }));
    } else {
       setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleAutoFabric = () => {
     setFormData(prev => ({ ...prev, autoFabric: !prev.autoFabric }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: keyof WardrobeReferences) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setReferences(prev => ({ ...prev, [type]: base64 }));
      setFormData(prev => ({
        ...prev,
        references: { ...prev.references, [type]: base64 }
      }));
      onLog(`Uploaded garment asset: ${type}`, "INPUT");

      // Trigger Smart Analysis on Front (for SKU/Fabric) or Detail (Fabric)
      if ((type === 'front' || type === 'detail') && formData.autoFabric) {
         setAnalyzingImage(true);
         onLog(`Smart Analyzing ${type} image for details...`, "GEMINI_VISION");
         try {
             const analysis = await analyzeGarmentImage(base64);
             
             setFormData(prev => ({
                 ...prev,
                 sku: (!prev.sku && analysis.sku) ? analysis.sku : prev.sku,
                 fabric: analysis.fabric || prev.fabric
             }));
             
             onLog(`Analysis complete. Detected: ${analysis.sku || 'Unknown Item'}`, "SUCCESS");
         } catch(err) {
             onLog("Smart analysis failed.", "ERROR");
         } finally {
             setAnalyzingImage(false);
         }
      }
    };
    reader.readAsDataURL(file);
  };

  const removeReference = (type: keyof WardrobeReferences) => {
    setReferences(prev => {
      const newRefs = { ...prev };
      delete newRefs[type];
      return newRefs;
    });
    setFormData(prev => {
        const newRefs = { ...prev.references };
        delete newRefs[type];
        return { ...prev, references: newRefs };
    });
  };

  const handleTrendSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trendQuery) return;
    setLoadingSearch(true);
    onLog(`Searching trends for: ${trendQuery}`, "GOOGLE_SEARCH");
    try {
      const results = await searchFashionTrends(trendQuery);
      setTrendResults(results);
      onLog("Trend data retrieved.", "GEMINI_FLASH");
    } catch (err) {
      onLog("Search failed.", "ERROR");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Quick validation
    if (!formData.sku) {
        onLog("Please enter an SKU or Item Name.", "VALIDATION");
        return;
    }

    setSubmitting(true);

    // Non-blocking Stylist Call (Fire and Forget)
    onLog(`Analyzing SKU: ${formData.sku}`, "GEMINI_3_PRO_THINKING");
    getStylistAdvice(formData)
      .then(advice => onLog(`Stylist Note: ${advice}`, "STYLIST"))
      .catch(() => onLog("Stylist unavailable.", "SYSTEM"));
    
    // Immediate Transition
    setTimeout(() => {
        onComplete(formData);
        setSubmitting(false);
    }, 500); // Small visual delay for button feedback
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center border-b border-lumina-700 pb-4">
        <h2 className="text-2xl font-light tracking-wider flex items-center gap-2 text-lumina-text">
          <Shirt className="text-lumina-accent" />
          WARDROBE RACK
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Input Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Visual Assets */}
          <div className="bg-lumina-800 p-6 rounded-xl border border-lumina-700">
             <h3 className="text-lumina-text text-sm font-bold uppercase mb-4 tracking-wider">1. Asset Digitization</h3>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {['front', 'back', 'detail', 'accessory'].map((type) => {
                   const key = type as keyof WardrobeReferences;
                   const hasImage = !!references[key];
                   const isAccessory = type === 'accessory';
                   return (
                     <div key={type} className={`aspect-[3/4] border-2 border-dashed rounded-xl relative group transition-all ${hasImage ? 'border-lumina-accent bg-white shadow-sm' : 'border-lumina-dim/30 hover:border-lumina-dim bg-white'}`}>
                        {hasImage ? (
                          <>
                            <img src={references[key]} alt={type} className="w-full h-full object-cover rounded-lg" />
                            <button type="button" onClick={() => removeReference(key)} className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-600 shadow-sm hover:scale-110 transition-transform"><Trash2 size={14} /></button>
                            <div className="absolute bottom-1 left-1 bg-lumina-accent text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">{type}</div>
                          </>
                        ) : (
                           <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-lumina-light transition-colors rounded-xl">
                              {isAccessory ? <Tag className="text-lumina-dim w-6 h-6 mb-2"/> : <ImagePlus className="text-lumina-dim w-6 h-6 mb-2" />}
                              <span className="text-xs font-bold text-lumina-text uppercase text-center">{isAccessory ? "Accessory\n(Opt)" : type}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, key)} />
                           </label>
                        )}
                     </div>
                   );
                })}
             </div>
             <p className="text-xs text-lumina-dim mt-2">Upload 'Front' or 'Detail' shot to auto-generate SKU info. Use 'Accessory' for hats/bags.</p>
          </div>

          {/* Section 2: Text Context */}
          <div className="bg-lumina-800 p-6 rounded-xl border border-lumina-700">
            <h3 className="text-lumina-text text-sm font-bold uppercase mb-4 tracking-wider">2. Fabric & Context</h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-lumina-text mb-1 flex justify-between">
                    Item SKU / Name
                    {analyzingImage && <span className="text-xs text-lumina-accent animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Detecting Item...</span>}
                </label>
                <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="w-full bg-white border border-lumina-700 rounded p-3 text-lumina-text text-lg focus:ring-1 focus:ring-lumina-accent focus:border-lumina-accent outline-none transition-all" placeholder="e.g. Vintage Leather Jacket" />
              </div>
              
              <div className="relative">
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-sm font-medium text-lumina-text">Fabric Details</label>
                   <button type="button" onClick={handleToggleAutoFabric} className="flex items-center gap-1 text-xs font-bold text-lumina-accent">
                      <Wand2 size={12}/> {formData.autoFabric ? "SMART ANALYSIS ON" : "MANUAL MODE"}
                   </button>
                </div>
                {formData.autoFabric ? (
                    <div className="w-full bg-lumina-light border border-lumina-700 rounded p-4 text-lumina-dim text-sm italic min-h-[6rem] flex items-center justify-center transition-all">
                       {analyzingImage ? <span className="flex items-center gap-2"><Loader2 className="animate-spin"/> Analyzing Texture & Material...</span> : (formData.fabric ? formData.fabric : "Upload an image to auto-detect fabric properties.")}
                    </div>
                ) : (
                    <textarea name="fabric" value={formData.fabric} onChange={handleInputChange} className="w-full bg-white border border-lumina-700 rounded p-3 text-lumina-text h-24 focus:ring-1 focus:ring-lumina-accent outline-none" placeholder="Describe weight, texture, stiffness..." />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-lumina-text mb-1">Fit Preference</label>
                <input type="text" name="fit" value={formData.fit} onChange={handleInputChange} className="w-full bg-white border border-lumina-700 rounded p-3 text-lumina-text focus:ring-1 focus:ring-lumina-accent outline-none" placeholder="e.g. Oversized, Slim Fit, Tailored"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-lumina-text mb-1 flex items-center gap-2"><Palette size={14}/> Studio Background</label>
                <select name="background" value={formData.background} onChange={handleInputChange} className="w-full bg-white border border-lumina-700 rounded p-3 text-lumina-text focus:ring-1 focus:ring-lumina-accent outline-none">
                    <option value="white">Pure White (E-Commerce Standard)</option>
                    <option value="grey">Soft Grey Gradient (Editorial)</option>
                    <option value="lifestyle">Lifestyle / Outdoor</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-lumina-700">
            <button 
              type="button" 
              onClick={onBack}
              disabled={submitting}
              className="px-6 py-3 rounded border border-lumina-700 hover:bg-lumina-200 text-lumina-dim hover:text-lumina-text transition-colors flex items-center gap-2 font-medium"
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className={`bg-lumina-accent text-white px-8 py-3 rounded font-bold transition-all flex items-center gap-2 shadow-lg ${submitting ? 'opacity-90 scale-95' : 'hover:opacity-90'}`}
            >
              {submitting ? (
                <>INITIALIZING... <Loader2 size={18} className="animate-spin" /></>
              ) : (
                <>START PHOTOSHOOT <Sparkles size={18} /></>
              )}
            </button>
          </div>
        </form>

        {/* Sidebar: Trends */}
        <div className="bg-white rounded-xl p-6 border border-lumina-700 h-fit shadow-sm">
          <h3 className="text-lumina-text text-sm font-bold uppercase mb-4 flex items-center gap-2">
            <Search size={14}/> Trend Researcher
          </h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={trendQuery}
              onChange={(e) => setTrendQuery(e.target.value)}
              placeholder="e.g. 2025 Summer Silk"
              className="flex-1 bg-lumina-800 border border-lumina-700 rounded px-2 py-2 text-sm text-lumina-text outline-none"
            />
            <button onClick={handleTrendSearch} disabled={loadingSearch} className="bg-lumina-accent hover:opacity-90 text-white px-3 rounded">
              {loadingSearch ? <Loader2 className="animate-spin" size={14}/> : 'Go'}
            </button>
          </div>
          
          {trendResults && (
            <div className="text-xs text-lumina-dim space-y-2 max-h-60 overflow-y-auto p-2 bg-lumina-800 rounded">
              <p className="whitespace-pre-line">{trendResults.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WardrobeRack;
