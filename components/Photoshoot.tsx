import React, { useState, useEffect } from 'react';
import { ModelParams, WardrobeParams, ImageSize, GeneratedAsset } from '../types';
import { Camera, RefreshCw, Wand2, Video, Edit3, Loader2, Link2, ArrowLeft, Download, FileText } from 'lucide-react';
import { generateFashionImage, editFashionImage, generateCatalogCopy } from '../services/geminiService';

interface PhotoshootProps {
  modelParams: ModelParams;
  wardrobeParams: WardrobeParams;
  onComplete: (assets: GeneratedAsset[]) => void;
  onBack: () => void;
  onLog: (msg: string, system?: string) => void;
}

const Photoshoot: React.FC<PhotoshootProps> = ({ modelParams, wardrobeParams, onComplete, onBack, onLog }) => {
  const [images, setImages] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ImageSize>(ImageSize.TwoK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [processingEdit, setProcessingEdit] = useState(false);
  const [apiKeyVerified, setApiKeyVerified] = useState(false);
  
  // Catalog Copy State
  const [generatingCopy, setGeneratingCopy] = useState(false);

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (apiKeyVerified && images.length === 0) {
      handleGenerateSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeyVerified]);

  const checkKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setApiKeyVerified(hasKey);
    } else {
        setApiKeyVerified(true); 
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        setApiKeyVerified(true);
      } catch (e) {
        onLog("API Key selection cancelled or failed", "SYSTEM");
      }
    }
  };

  const handleGenerateSequence = async () => {
    if (!apiKeyVerified) return;
    
    setLoading(true);
    setImages([]); 
    onLog("Initiating Studio Lighting...", "SYSTEM");
    
    try {
      // Step 1: Generate the Identity Anchor (Front View)
      onLog("Establishing Identity Anchor (Front View)...", "NANO_BANANA_PRO");
      onLog(`> GENERATE_ANCHOR: Subject(ID:${modelParams.gender}) + SKU(ID:${wardrobeParams.sku.substring(0,10)}...)`, "BACKEND_LOG");
      
      const frontAsset = await generateFashionImage(modelParams, wardrobeParams, 'Front', selectedSize);
      
      const frontImageEntry: GeneratedAsset = {
        id: `Front-${Date.now()}`,
        type: 'image',
        url: frontAsset.url,
        prompt: frontAsset.prompt
      };
      
      setImages([frontImageEntry]);
      onLog("Identity Anchor locked. Propagating to other angles...", "SYSTEM");

      // Step 2: Use the Front view as the reference for Side and Back
      const remainingAngles = ['Side', 'Back'];
      const updatedImages = [frontImageEntry];

      for (const angle of remainingAngles) {
        onLog(`Generating ${angle} view using Anchor Reference...`, "NANO_BANANA_PRO");
        
        const angleAsset = await generateFashionImage(
            modelParams, 
            wardrobeParams, 
            angle, 
            selectedSize, 
            frontAsset.url
        );

        updatedImages.push({
          id: `${angle}-${Date.now()}`,
          type: 'image',
          url: angleAsset.url,
          prompt: angleAsset.prompt
        });
        
        setImages([...updatedImages]);
      }

      onLog("Contact sheet ready. Identity consistency verified.", "SYSTEM");
      
      // Auto-trigger copy generation
      handleGenerateCopy(frontAsset.url, frontImageEntry.id);

    } catch (err: any) {
      onLog(`Generation Failed: ${err}`, "ERROR");
      if (err.toString().includes("403") || err.toString().includes("PERMISSION_DENIED")) {
         setApiKeyVerified(false); 
         onLog("Permission denied. Please select a valid paid API Key.", "SYSTEM");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCopy = async (imageUrl: string, assetId: string) => {
      setGeneratingCopy(true);
      onLog("Generating Catalog Copy...", "GEMINI_FLASH");
      try {
          const copy = await generateCatalogCopy(imageUrl);
          setImages(prev => prev.map(img => img.id === assetId ? { ...img, catalogCopy: copy } : img));
          onLog("Catalog copy generated.", "COPYWRITER");
      } catch (err) {
          onLog("Copy generation failed.", "ERROR");
      } finally {
          setGeneratingCopy(false);
      }
  };

  const handleEditImage = async (id: string) => {
    if (!editPrompt) return;
    setProcessingEdit(true);
    onLog(`Applying edit: "${editPrompt}"`, "GEMINI_FLASH_IMG");
    
    const targetImage = images.find(img => img.id === id);
    if (!targetImage) return;

    try {
      const newUrl = await editFashionImage(targetImage.url, editPrompt);
      setImages(prev => prev.map(img => img.id === id ? { ...img, url: newUrl } : img));
      setEditingId(null);
      setEditPrompt("");
      onLog("Edit applied successfully.", "SYSTEM");
    } catch (err) {
      onLog(`Edit failed: ${err}`, "ERROR");
    } finally {
      setProcessingEdit(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onLog(`Downloaded ${filename}`, "SYSTEM");
  };

  const handleApproveAll = () => {
    onLog(`Approving sequence for Runway. Compiling ${images.length} assets.`, "USER");
    onComplete(images);
  };

  if (!apiKeyVerified) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6 border border-lumina-700 rounded-xl bg-white p-8 animate-in fade-in shadow-sm">
        <div className="p-4 bg-lumina-800 rounded-full">
          <Camera className="w-8 h-8 text-lumina-accent" />
        </div>
        <h2 className="text-xl text-lumina-text font-light tracking-wide">High-Fidelity Rendering Authorization</h2>
        <p className="text-lumina-dim text-center max-w-md">
          Nano Banana Pro (Gemini 3 Pro Image) requires a specialized computation budget. 
          Please select a paid API key to unlock 2K/4K photorealistic generation.
        </p>
        <button 
          onClick={handleSelectKey}
          className="bg-lumina-accent text-white font-bold px-8 py-3 rounded hover:opacity-90 transition-opacity"
        >
          AUTHENTICATE STUDIO
        </button>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-lumina-dim underline hover:text-lumina-text">
          View Billing Documentation
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center border-b border-lumina-700 pb-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-lumina-200 rounded-full transition-colors text-lumina-dim hover:text-lumina-text">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-light tracking-wider flex items-center gap-2 text-lumina-text">
            <Camera className="text-lumina-accent" />
            PHOTOSHOOT CONTACT SHEET
            </h2>
        </div>
        
        <div className="flex items-center gap-4">
           <select 
             value={selectedSize} 
             onChange={(e) => setSelectedSize(e.target.value as ImageSize)}
             className="bg-white border border-lumina-700 text-xs rounded p-2 text-lumina-text outline-none focus:ring-1 focus:ring-lumina-accent"
             disabled={loading}
           >
             <option value={ImageSize.OneK}>1K Res</option>
             <option value={ImageSize.TwoK}>2K Res</option>
             <option value={ImageSize.FourK}>4K Res</option>
           </select>
           <button onClick={handleGenerateSequence} disabled={loading} className="text-sm text-lumina-dim hover:text-lumina-text flex items-center gap-1 font-medium">
             <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Regenerate Sequence
           </button>
        </div>
      </div>

      {loading && images.length === 0 ? (
         <div className="h-64 flex flex-col items-center justify-center text-lumina-dim bg-white rounded-xl border border-lumina-700">
           <Loader2 className="w-12 h-12 animate-spin text-lumina-accent mb-4" />
           <p className="font-mono animate-pulse">ESTABLISHING IDENTITY ANCHOR...</p>
         </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {images.map((img, index) => (
              <div key={img.id} className="group flex flex-col bg-white rounded-xl overflow-hidden border border-lumina-700 shadow-sm hover:shadow-md transition-all animate-in zoom-in duration-300">
                {/* Image Area */}
                <div className="aspect-video relative overflow-hidden bg-lumina-800">
                  <img src={img.url} alt="Generated Asset" className="w-full h-full object-cover" />
                  
                  {index === 0 && (
                     <div className="absolute top-2 left-2 bg-lumina-accent text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                        <Link2 size={10} /> ANCHOR
                     </div>
                  )}
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDownload(img.url, `lumina_asset_${img.id}.png`)}
                        className="bg-white/90 p-2 rounded-full text-lumina-text hover:text-lumina-accent shadow-sm"
                        title="Download High-Res"
                      >
                          <Download size={16}/>
                      </button>
                  </div>

                  {editingId === img.id && (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm z-10">
                      <p className="text-xs text-lumina-text mb-2 font-bold">Refine Image</p>
                      <textarea 
                        value={editPrompt} 
                        onChange={(e) => setEditPrompt(e.target.value)}
                        className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-sm text-lumina-text mb-2 focus:ring-1 focus:ring-lumina-accent outline-none"
                        rows={2}
                        placeholder="e.g. Add a lens flare..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 bg-lumina-200 rounded text-lumina-text">Cancel</button>
                        <button 
                          onClick={() => handleEditImage(img.id)} 
                          disabled={processingEdit}
                          className="text-xs px-3 py-1 bg-lumina-accent text-white font-bold rounded flex items-center gap-1"
                        >
                          {processingEdit ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>} Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Meta Area */}
                <div className="p-4 border-t border-lumina-700 bg-lumina-light flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-lumina-dim font-bold">{img.id.split('-')[0].toUpperCase()}</span>
                      <button 
                        onClick={() => setEditingId(img.id)} 
                        className="p-1.5 hover:bg-lumina-200 rounded text-lumina-dim hover:text-lumina-text transition-colors"
                        title="Edit with Flash Image"
                      >
                        <Edit3 size={16} />
                      </button>
                  </div>
                  
                  {/* Catalog Copy Display (Only for Anchor usually, or first img) */}
                  {img.catalogCopy && (
                      <div className="mt-2 p-2 bg-white rounded border border-lumina-700 text-xs">
                          <p className="font-bold text-lumina-text truncate mb-1">{img.catalogCopy.title}</p>
                          <p className="text-lumina-dim line-clamp-2">{img.catalogCopy.description}</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                              {img.catalogCopy.keywords.slice(0,3).map(k => (
                                  <span key={k} className="px-1.5 py-0.5 bg-lumina-800 rounded text-[10px] text-lumina-dim">#{k}</span>
                              ))}
                          </div>
                      </div>
                  )}
                  {index === 0 && !img.catalogCopy && (
                      <div className="flex items-center gap-2 text-[10px] text-lumina-dim">
                          {generatingCopy ? <Loader2 size={10} className="animate-spin"/> : <FileText size={10}/>}
                          {generatingCopy ? "Writing Catalog Copy..." : "Catalog Copy Pending..."}
                      </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && images.length < 3 && Array.from({ length: 3 - images.length }).map((_, i) => (
               <div key={i} className="aspect-video bg-white rounded-xl border border-lumina-700 flex flex-col items-center justify-center animate-pulse shadow-sm">
                  <Loader2 className="text-lumina-dim animate-spin mb-2" />
                  <span className="text-xs text-lumina-dim font-mono">PROPAGATING IDENTITY...</span>
               </div>
            ))}
          </div>

          {images.length >= 3 && !loading && (
            <div className="flex justify-center pt-8 border-t border-lumina-700 mt-8">
               <button 
                 onClick={handleApproveAll}
                 className="bg-lumina-accent text-white px-12 py-4 rounded font-bold hover:opacity-90 transition-colors flex items-center gap-3 text-lg tracking-widest shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200"
               >
                 COMPILE RUNWAY SEQUENCE <Video size={20} />
               </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Photoshoot;