import React, { useState } from 'react';
import { AppState, ModelParams, WardrobeParams, GeneratedAsset, LogEntry } from './types';
import TerminalLog from './components/TerminalLog';
import ModelStudio from './components/ModelStudio';
import WardrobeRack from './components/WardrobeRack';
import Photoshoot from './components/Photoshoot';
import Runway from './components/Runway';
import { Aperture, ArrowRight, User, Shirt, Camera, Video } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Workflow State
  const [modelData, setModelData] = useState<ModelParams | null>(null);
  const [wardrobeData, setWardrobeData] = useState<WardrobeParams | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<GeneratedAsset[]>([]);

  const addLog = (message: string, system: string = "SYSTEM") => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      system,
      message
    }]);
  };

  const handleStart = () => {
    addLog("Initializing Lumina Studio v2.0...", "BOOT");
    addLog("Connected to Gemini 3 Pro Cluster.", "NETWORK");
    setAppState(AppState.MODEL_STUDIO);
  };

  const handleBack = () => {
    switch (appState) {
      case AppState.WARDROBE_RACK:
        setAppState(AppState.MODEL_STUDIO);
        addLog("Returning to Model Studio.", "NAVIGATION");
        break;
      case AppState.PHOTOSHOOT:
        setAppState(AppState.WARDROBE_RACK);
        addLog("Returning to Wardrobe Rack.", "NAVIGATION");
        break;
      case AppState.RUNWAY:
        setAppState(AppState.PHOTOSHOOT);
        addLog("Returning to Photoshoot Contact Sheet.", "NAVIGATION");
        break;
    }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.WELCOME:
        return (
          <div className="h-full flex flex-col bg-white overflow-hidden animate-in fade-in duration-700">
             {/* Hero Section */}
             <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-gray-50 to-transparent rounded-full blur-3xl -z-10"></div>
                
                <div className="mb-8 relative">
                   <div className="absolute -inset-6 bg-lumina-gold/10 blur-2xl rounded-full"></div>
                   <Aperture size={64} className="text-lumina-accent relative z-10" />
                </div>
                
                <h1 className="text-7xl font-light tracking-tight text-lumina-text mb-4 text-center">
                   LUMINA <span className="font-bold">STUDIO</span>
                </h1>
                
                <p className="text-xl text-lumina-dim tracking-wide max-w-2xl text-center font-light leading-relaxed mb-12">
                   The end-to-end generative photography suite for fashion retail. <br/>
                   Orchestrate <span className="text-lumina-text font-medium">Model</span>, <span className="text-lumina-text font-medium">Apparel</span>, and <span className="text-lumina-text font-medium">Motion</span> with enterprise-grade precision.
                </p>

                <button 
                  onClick={handleStart}
                  className="group relative px-10 py-4 bg-lumina-accent text-white text-sm font-bold tracking-[0.2em] uppercase transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden rounded-sm"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Initialize Workflow <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                  </span>
                  <div className="absolute inset-0 bg-lumina-dim/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
             </div>

             {/* Feature Grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-lumina-700 border-t border-lumina-700">
                <div className="bg-white p-8 group hover:bg-lumina-light transition-colors duration-300">
                   <div className="mb-4 text-lumina-accent opacity-50 group-hover:opacity-100 transition-opacity">
                      <User size={32} strokeWidth={1.5}/>
                   </div>
                   <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-lumina-text">01. Identity</h3>
                   <p className="text-xs text-lumina-dim leading-relaxed">
                      Define parametric digital mannequins with precise biometrics or upload real talent references for consistency.
                   </p>
                </div>
                
                <div className="bg-white p-8 group hover:bg-lumina-light transition-colors duration-300">
                   <div className="mb-4 text-lumina-accent opacity-50 group-hover:opacity-100 transition-opacity">
                      <Shirt size={32} strokeWidth={1.5}/>
                   </div>
                   <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-lumina-text">02. Wardrobe</h3>
                   <p className="text-xs text-lumina-dim leading-relaxed">
                      Digitize SKUs with AI fabric analysis. Upload flat-lays or detail shots to extract texture physics automatically.
                   </p>
                </div>

                <div className="bg-white p-8 group hover:bg-lumina-light transition-colors duration-300">
                   <div className="mb-4 text-lumina-accent opacity-50 group-hover:opacity-100 transition-opacity">
                      <Camera size={32} strokeWidth={1.5}/>
                   </div>
                   <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-lumina-text">03. Synthesis</h3>
                   <p className="text-xs text-lumina-dim leading-relaxed">
                      Generate high-fidelity 4K catalog photography. Virtual try-on with multi-angle consistency preservation.
                   </p>
                </div>

                <div className="bg-white p-8 group hover:bg-lumina-light transition-colors duration-300">
                   <div className="mb-4 text-lumina-accent opacity-50 group-hover:opacity-100 transition-opacity">
                      <Video size={32} strokeWidth={1.5}/>
                   </div>
                   <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-lumina-text">04. Runway</h3>
                   <p className="text-xs text-lumina-dim leading-relaxed">
                      Transform static assets into cinematic 1080p motion using Veo 3 generative video technology.
                   </p>
                </div>
             </div>
             
             {/* Tech Stack Footer */}
             <div className="bg-lumina-800 py-4 px-8 border-t border-lumina-700 flex justify-between items-center text-[10px] text-lumina-dim uppercase tracking-widest font-mono">
                <span>Powered by Google Gemini 3 Pro</span>
                <span className="flex items-center gap-4">
                   <span>Vision</span>
                   <span>Thinking</span>
                   <span>Veo Video</span>
                </span>
             </div>
          </div>
        );

      case AppState.MODEL_STUDIO:
        return (
          <ModelStudio 
            initialData={modelData}
            onComplete={(data) => {
              setModelData(data);
              setAppState(AppState.WARDROBE_RACK);
              addLog("Model parameters locked.", "STATE_MACHINE");
            }}
            onLog={addLog}
          />
        );

      case AppState.WARDROBE_RACK:
        return (
          <WardrobeRack 
            initialData={wardrobeData}
            onComplete={(data) => {
              setWardrobeData(data);
              setAppState(AppState.PHOTOSHOOT);
              addLog("SKU data ingested. Preparing physics simulation.", "STATE_MACHINE");
            }}
            onBack={handleBack}
            onLog={addLog}
          />
        );

      case AppState.PHOTOSHOOT:
        return (
          <Photoshoot 
            modelParams={modelData!}
            wardrobeParams={wardrobeData!}
            onComplete={(assets) => {
              setSelectedAssets(assets);
              setAppState(AppState.RUNWAY);
              addLog(`Migrating ${assets.length} assets to Video Pipeline.`, "STATE_MACHINE");
            }}
            onBack={handleBack}
            onLog={addLog}
          />
        );

      case AppState.RUNWAY:
        return (
          <Runway 
            sourceAssets={selectedAssets}
            onBack={handleBack}
            onLog={addLog}
          />
        );
      
      default:
        return null;
    }
  };

  const navButtonClass = (state: AppState) => {
      const isActive = appState === state;
      const canNavigate = 
        (state === AppState.MODEL_STUDIO) ||
        (state === AppState.WARDROBE_RACK && !!modelData) ||
        (state === AppState.PHOTOSHOOT && !!wardrobeData) ||
        (state === AppState.RUNWAY && selectedAssets.length > 0);
      
      if (isActive) return "text-lumina-accent underline underline-offset-4 cursor-default";
      if (canNavigate) return "text-lumina-dim hover:text-lumina-text cursor-pointer transition-colors";
      return "text-lumina-200 cursor-not-allowed";
  };

  return (
    <div className="min-h-screen bg-lumina-900 text-lumina-text flex flex-col font-sans selection:bg-lumina-accent selection:text-white">
      {/* Header */}
      {appState !== AppState.WELCOME && (
        <header className="h-16 border-b border-lumina-700 flex items-center justify-between px-8 bg-white/90 backdrop-blur sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Aperture className="text-lumina-accent" size={24} />
            <span className="text-xl font-light tracking-widest text-lumina-text">LUMINA</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-xs font-mono font-bold">
            <button onClick={() => setAppState(AppState.MODEL_STUDIO)} className={navButtonClass(AppState.MODEL_STUDIO)}>01.MODEL</button>
            <span className="text-lumina-200 px-2">/</span>
            
            <button 
                onClick={() => modelData && setAppState(AppState.WARDROBE_RACK)} 
                disabled={!modelData}
                className={navButtonClass(AppState.WARDROBE_RACK)}
            >
                02.WARDROBE
            </button>
            <span className="text-lumina-200 px-2">/</span>

            <button 
                onClick={() => wardrobeData && setAppState(AppState.PHOTOSHOOT)} 
                disabled={!wardrobeData}
                className={navButtonClass(AppState.PHOTOSHOOT)}
            >
                03.SHOOT
            </button>
            <span className="text-lumina-200 px-2">/</span>

            <button 
                onClick={() => selectedAssets.length > 0 && setAppState(AppState.RUNWAY)} 
                disabled={selectedAssets.length === 0}
                className={navButtonClass(AppState.RUNWAY)}
            >
                04.RUNWAY
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col">
        {appState !== AppState.WELCOME ? (
            <div className="p-6 md:p-8 w-full">
                {renderContent()}
            </div>
        ) : renderContent()}
      </main>

      {/* Footer / Terminal */}
      {appState !== AppState.WELCOME && (
        <footer className="p-8 border-t border-lumina-700 bg-lumina-800 z-40">
           <TerminalLog logs={logs} />
        </footer>
      )}
    </div>
  );
};

export default App;