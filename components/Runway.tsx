import React, { useState, useEffect } from 'react';
import { GeneratedAsset } from '../types';
import { Video, Download, Loader2, Play, ArrowLeft } from 'lucide-react';
import { generateRunwayVideo } from '../services/geminiService';

interface RunwayProps {
  sourceAssets: GeneratedAsset[];
  onBack: () => void;
  onLog: (msg: string, system?: string) => void;
}

const Runway: React.FC<RunwayProps> = ({ sourceAssets, onBack, onLog }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [apiKeyVerified, setApiKeyVerified] = useState(false);

  useEffect(() => {
    checkKey();
  }, []);

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
      await aistudio.openSelectKey();
      setApiKeyVerified(true);
    }
  };

  const handleGenerateVideo = async () => {
    setGenerating(true);
    onLog("Initializing Veo 3 Engine...", "VEO_3_MULTI_REF");
    onLog(`> INPUT: ${sourceAssets.length} Assets (Front, Side, Back)`, "BACKEND_LOG");
    onLog(`> MOTION: 360_Degree_Turn. > FORMAT: 16:9_Cinematic.`, "BACKEND_LOG");
    
    try {
      // Pass all asset URLs to service
      const urls = sourceAssets.map(a => a.url);
      const url = await generateRunwayVideo(urls);
      setVideoUrl(url);
      onLog("Runway Sequence Generation Complete.", "VEO_3");
    } catch (err: any) {
      onLog(`Video Failed: ${err.message || err}`, "ERROR");
    } finally {
      setGenerating(false);
    }
  };

  if (!apiKeyVerified) {
      return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 border border-lumina-700 rounded-xl bg-white p-8">
              <h2 className="text-xl text-lumina-text font-bold">Veo Authorization Required</h2>
              <p className="text-lumina-dim text-center max-w-md">
                  To use the Runway feature (Veo 3), you must select a paid API key from a valid Google Cloud Project.
              </p>
              <button 
                onClick={handleSelectKey}
                className="bg-lumina-accent text-white font-bold px-6 py-3 rounded hover:opacity-90 transition-opacity"
              >
                  Select API Key
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-lumina-dim underline">
                  Billing Documentation
              </a>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center border-b border-lumina-700 pb-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-lumina-200 rounded-full transition-colors text-lumina-dim hover:text-lumina-text">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-light tracking-wider flex items-center gap-2 text-lumina-text">
            <Video className="text-lumina-accent" />
            THE RUNWAY
            </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lumina-text text-sm font-bold uppercase mb-4 tracking-wider">Source Sequence</h3>
          <div className="grid grid-cols-1 gap-4">
            {sourceAssets.map((asset, i) => (
               <div key={i} className="aspect-video bg-white rounded-lg overflow-hidden border border-lumina-700 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                 <img src={asset.url} alt={`Source ${i}`} className="w-full h-full object-cover" />
               </div>
            ))}
          </div>
          <p className="text-xs text-lumina-dim mt-2 bg-lumina-light p-3 rounded border border-lumina-700">
            Veo 3.1 (Preview) will synthesize these multiple angles into a coherent 16:9 cinematic motion sequence.
          </p>
        </div>

        <div className="lg:col-span-2 flex flex-col justify-start space-y-6">
          {!videoUrl && !generating && (
            <div className="bg-white p-12 rounded-xl border border-lumina-700 text-center space-y-4 shadow-sm h-96 flex flex-col items-center justify-center">
               <Video className="w-20 h-20 text-lumina-dim mx-auto" />
               <p className="text-2xl font-light text-lumina-text">Ready to Animate</p>
               <p className="text-sm text-lumina-dim max-w-md mx-auto">
                 The Veo engine will apply high-fidelity cloth physics and gait analysis to the input sequence to generate a 16:9 cinematic runway video.
               </p>
               <button 
                 onClick={handleGenerateVideo}
                 className="w-full max-w-sm mx-auto bg-lumina-accent text-white font-bold py-4 rounded flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-4 shadow-lg"
               >
                 <Play size={20} fill="white" /> GENERATE RUNWAY VIDEO
               </button>
            </div>
          )}

          {generating && (
            <div className="bg-white p-12 rounded-xl border border-lumina-700 text-center space-y-4 h-96 flex flex-col items-center justify-center shadow-inner">
               <Loader2 className="w-20 h-20 text-lumina-accent animate-spin" />
               <p className="font-mono animate-pulse text-xl text-lumina-text">VEO ENGINE PROCESSING...</p>
               <p className="text-xs text-lumina-dim">Rendering 16:9 Cloth Dynamics...</p>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-4 flex flex-col items-center">
               {/* 16:9 Landscape Container */}
               <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border-4 border-white shadow-2xl">
                 <video src={videoUrl} autoPlay loop controls className="w-full h-full object-cover" />
               </div>
               
               <div className="w-full bg-white p-4 rounded border border-lumina-700 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs text-lumina-accent mb-1 font-mono font-bold">RENDER_STATUS: COMPLETE</p>
                    <p className="text-sm text-lumina-dim">16:9 Cinematic • 1080p HQ</p>
                  </div>
                  <a href={videoUrl} download="runway_sequence.mp4" className="bg-lumina-accent hover:opacity-90 text-white px-6 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
                    <Download size={16}/> DOWNLOAD VIDEO
                  </a>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Runway;