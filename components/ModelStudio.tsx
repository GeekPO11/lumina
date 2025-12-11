
import React, { useState } from 'react';
import { ModelParams, ModelReferences } from '../types';
import { Camera, User, Upload, Loader2, Wand2, ImagePlus, Trash2, Sliders, Lock, Unlock } from 'lucide-react';
import { analyzeReferenceImage } from '../services/geminiService';

interface ModelStudioProps {
  initialData?: ModelParams | null;
  onComplete: (data: ModelParams) => void;
  onLog: (msg: string, system?: string) => void;
}

const ModelStudio: React.FC<ModelStudioProps> = ({ initialData, onComplete, onLog }) => {
  const [mode, setMode] = useState<'upload' | 'generate'>(initialData?.type === 'generated' ? 'generate' : 'upload');
  const [analyzing, setAnalyzing] = useState(false);
  
  const [references, setReferences] = useState<ModelReferences>(initialData?.references || {});
  
  const [formData, setFormData] = useState<ModelParams>(initialData || {
    type: 'reference',
    useBiometrics: true, 
    gender: 'Female',
    ethnicity: 'Mixed/Multi-racial',
    ageRange: '25-34',
    eyeColor: 'Brown',
    hairColor: 'Brown',
    height: "5'10\"",
    bodyType: 'Slim',
    
    // Measurements
    chest: 34,
    waist: 25,
    hips: 36,
    shoulder: 16,
    inseam: 32,

    references: {}
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? (parseInt(value) || 0) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleToggleBiometrics = () => {
    setFormData(prev => ({ ...prev, useBiometrics: !prev.useBiometrics }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, angle: keyof ModelReferences) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      setReferences(prev => ({ ...prev, [angle]: base64 }));
      setFormData(prev => ({ 
        ...prev, 
        references: { ...prev.references, [angle]: base64 } 
      }));

      if (angle === 'front') {
        setAnalyzing(true);
        onLog(`Analyzing biometrics from ${angle} view...`, "GEMINI_3_PRO");
        try {
          const analysis = await analyzeReferenceImage(base64);
          onLog("Biometrics extracted.", "ANALYSIS");
          
          setFormData(prev => {
            // Normalize Gender to match dropdown - FIXED LOGIC
            let detectedGender = analysis.gender || prev.gender;
            const gLower = detectedGender.toLowerCase();
            
            // Strict checks to avoid 'female' matching 'male' via includes
            if (gLower === 'male' || gLower === 'man') {
                detectedGender = 'Male';
            } else if (gLower === 'female' || gLower === 'woman') {
                detectedGender = 'Female';
            } else if (gLower.includes('non') || gLower.includes('binary')) {
                detectedGender = 'Non-Binary';
            } else {
                // Fallback for looser matches, checking female first to avoid substring issue
                if (gLower.includes('woman') || gLower.includes('female')) detectedGender = 'Female';
                else if (gLower.includes('man') || gLower.includes('male')) detectedGender = 'Male';
            }

            return {
              ...prev,
              gender: detectedGender,
              ethnicity: analysis.ethnicity || prev.ethnicity,
              bodyType: analysis.bodyType || prev.bodyType,
              height: analysis.estimatedHeight || prev.height,
              chest: analysis.estimatedChestInches || prev.chest,
              waist: analysis.estimatedWaistInches || prev.waist,
              hips: analysis.estimatedHipsInches || prev.hips,
              shoulder: analysis.estimatedShoulderInches || prev.shoulder,
              inseam: analysis.estimatedInseamInches || prev.inseam,
              references: { ...prev.references, [angle]: base64 }
            };
          });
        } catch (err) {
          onLog("Auto-analysis failed, please enter manually.", "ERROR");
        } finally {
          setAnalyzing(false);
        }
      } else {
        onLog(`Uploaded ${angle} reference.`, "INPUT");
      }
    };
    reader.readAsDataURL(file);
  };

  const removeReference = (angle: keyof ModelReferences) => {
    setReferences(prev => {
      const newRefs = { ...prev };
      delete newRefs[angle];
      return newRefs;
    });
    setFormData(prev => {
        const newRefs = { ...prev.references };
        delete newRefs[angle];
        return { ...prev, references: newRefs };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analyzing) return; // Prevent submission during analysis

    const finalType = mode === 'upload' ? 'reference' : 'generated';
    
    if (finalType === 'reference' && !references.front) {
      onLog("Error: Front view is required for reference mode.", "VALIDATION");
      return;
    }

    onLog(`Model Configured: ${formData.gender}, ${formData.ethnicity} (${finalType})`, "SYSTEM");
    onComplete({ ...formData, type: finalType });
  };

  const ethnicityOptions = [
    'Asian', 'Black/African Descent', 'Caucasian/White', 'Hispanic/Latino', 
    'Middle Eastern', 'Mixed/Multi-racial', 'South Asian', 'Indigenous', 'Pacific Islander'
  ];

  const bodyTypeOptions = [
    'Slim', 'Athletic', 'Curvy', 'Plus Size', 'Hourglass', 'Pear', 'Rectangle', 'Inverted Triangle'
  ];

  const heightOptions = [
    "4'10\"", "4'11\"", "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", 
    "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\""
  ];

  const eyeColorOptions = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey'];
  const hairColorOptions = ['Black', 'Brown', 'Blonde', 'Red', 'Grey/White', 'Dyed/Colorful'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center border-b border-lumina-700 pb-4">
        <h2 className="text-2xl font-light tracking-wider flex items-center gap-2 text-lumina-text">
          <User className="text-lumina-accent" />
          MODEL STUDIO
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setMode('upload')}
            className={`px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors ${mode === 'upload' ? 'bg-lumina-accent text-white font-bold' : 'bg-lumina-800 text-lumina-dim hover:bg-lumina-200'}`}
          >
            <Upload size={14} /> Reference Upload
          </button>
          <button 
            onClick={() => setMode('generate')}
            className={`px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors ${mode === 'generate' ? 'bg-lumina-accent text-white font-bold' : 'bg-lumina-800 text-lumina-dim hover:bg-lumina-200'}`}
          >
            <Wand2 size={14} /> Parametric
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: VISUALS */}
        <div className="space-y-4">
           {mode === 'upload' ? (
             <div className="bg-lumina-800 p-6 rounded-xl border border-lumina-700 h-full">
                <h3 className="text-lumina-text text-sm font-bold uppercase mb-4 tracking-wider">Reference Assets</h3>
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* FRONT UPLOAD (PRIMARY) */}
                  <div className={`col-span-2 aspect-[4/5] border-2 border-dashed rounded-xl relative group transition-all ${references.front ? 'border-lumina-accent bg-white shadow-sm' : 'border-lumina-dim/30 hover:border-lumina-dim bg-white'}`}>
                     {references.front ? (
                       <>
                         <img src={references.front} alt="Front" className="w-full h-full object-cover rounded-lg" />
                         <button type="button" onClick={() => removeReference('front')} className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 size={16} />
                         </button>
                         <div className="absolute bottom-2 left-2 bg-lumina-accent text-white text-xs font-bold px-2 py-1 rounded">FRONT VIEW</div>
                       </>
                     ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-lumina-light transition-colors rounded-xl">
                           {analyzing ? (
                              <Loader2 className="animate-spin text-lumina-accent w-10 h-10 mb-2" />
                           ) : (
                              <ImagePlus className="text-lumina-dim w-10 h-10 mb-2" />
                           )}
                           <span className="text-sm font-bold text-lumina-text">Upload Front View</span>
                           <span className="text-xs text-lumina-dim">Primary Reference (Required)</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'front')} disabled={analyzing} />
                        </label>
                     )}
                  </div>

                  {/* SIDE UPLOAD */}
                  <div className={`aspect-square border-2 border-dashed rounded-xl relative group transition-all ${references.side ? 'border-lumina-accent bg-white' : 'border-lumina-dim/30 hover:border-lumina-dim bg-white'}`}>
                     {references.side ? (
                       <>
                         <img src={references.side} alt="Side" className="w-full h-full object-cover rounded-lg" />
                         <button type="button" onClick={() => removeReference('side')} className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-600 shadow-sm"><Trash2 size={14} /></button>
                         <div className="absolute bottom-1 left-1 bg-lumina-800 text-lumina-dim text-[10px] px-1 rounded border border-lumina-700">SIDE</div>
                       </>
                     ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-lumina-light transition-colors rounded-xl">
                           <ImagePlus className="text-lumina-dim w-6 h-6 mb-1" />
                           <span className="text-xs text-lumina-dim">Side (Opt)</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'side')} disabled={analyzing} />
                        </label>
                     )}
                  </div>

                  {/* BACK UPLOAD */}
                  <div className={`aspect-square border-2 border-dashed rounded-xl relative group transition-all ${references.back ? 'border-lumina-accent bg-white' : 'border-lumina-dim/30 hover:border-lumina-dim bg-white'}`}>
                     {references.back ? (
                       <>
                         <img src={references.back} alt="Back" className="w-full h-full object-cover rounded-lg" />
                         <button type="button" onClick={() => removeReference('back')} className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-600 shadow-sm"><Trash2 size={14} /></button>
                         <div className="absolute bottom-1 left-1 bg-lumina-800 text-lumina-dim text-[10px] px-1 rounded border border-lumina-700">BACK</div>
                       </>
                     ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-lumina-light transition-colors rounded-xl">
                           <ImagePlus className="text-lumina-dim w-6 h-6 mb-1" />
                           <span className="text-xs text-lumina-dim">Back (Opt)</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'back')} disabled={analyzing} />
                        </label>
                     )}
                  </div>

                </div>
             </div>
           ) : (
             <div className="h-full bg-lumina-800 rounded-xl border border-lumina-700 p-8 flex flex-col items-center justify-center text-center">
                <Wand2 className="w-16 h-16 text-lumina-dim mb-4" />
                <h3 className="text-xl font-light text-lumina-text">Parametric Generation</h3>
                <p className="text-lumina-dim text-sm mt-2 max-w-xs">
                  The AI will generate a unique synthetic model based on the biometric data on the right. No reference image required.
                </p>
             </div>
           )}
        </div>

        {/* RIGHT COLUMN: DATA */}
        <div className="space-y-6">
          
          <div className="flex items-center justify-between">
            <h3 className="text-lumina-text text-sm font-bold uppercase tracking-wider">Biometric Configuration</h3>
            {mode === 'upload' && (
              <button 
                type="button" 
                onClick={handleToggleBiometrics}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-colors ${formData.useBiometrics ? 'bg-lumina-accent text-white' : 'bg-lumina-200 text-lumina-dim'}`}
              >
                {formData.useBiometrics ? <Lock size={12} /> : <Unlock size={12} />}
                {formData.useBiometrics ? 'CONSTRAINTS ON' : 'CONSTRAINTS OFF'}
              </button>
            )}
          </div>

          <div className={`space-y-6 transition-opacity duration-300 ${!formData.useBiometrics && mode === 'upload' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
            
            {/* Demographics */}
            <div className="space-y-4 p-5 bg-white rounded-xl border border-lumina-700 shadow-sm">
               <h4 className="text-xs text-lumina-dim uppercase tracking-wider mb-2 font-bold">Demographics</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-lumina-text mb-1">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-Binary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-lumina-text mb-1">Age Range</label>
                    <select name="ageRange" value={formData.ageRange} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                      <option>18-24</option>
                      <option>25-34</option>
                      <option>35-44</option>
                      <option>45-54</option>
                      <option>55+</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-lumina-text mb-1">Ethnicity</label>
                    <select name="ethnicity" value={formData.ethnicity} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                      {ethnicityOptions.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4 p-5 bg-white rounded-xl border border-lumina-700 shadow-sm">
               <h4 className="text-xs text-lumina-dim uppercase tracking-wider mb-2 font-bold">Physical Attributes</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-medium text-lumina-text mb-1">Height</label>
                     <select name="height" value={formData.height} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                        {heightOptions.map(opt => <option key={opt}>{opt}</option>)}
                     </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-lumina-text mb-1">Body Type</label>
                    <select name="bodyType" value={formData.bodyType} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                      {bodyTypeOptions.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-lumina-text mb-1">Eye Color</label>
                    <select name="eyeColor" value={formData.eyeColor} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                      {eyeColorOptions.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-lumina-text mb-1">Hair Color</label>
                    <select name="hairColor" value={formData.hairColor} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-sm outline-none focus:ring-1 focus:ring-lumina-accent">
                      {hairColorOptions.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            {/* Measurements */}
            <div className="space-y-4 p-5 bg-white rounded-xl border border-lumina-700 shadow-sm relative">
               <h4 className="text-xs text-lumina-dim uppercase tracking-wider mb-2 flex items-center gap-2 font-bold">
                 <Sliders size={12}/> Measurements (Inches)
               </h4>
               <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-lumina-dim mb-1 uppercase font-bold">Chest</label>
                    <input type="number" name="chest" value={formData.chest} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-lg font-mono text-center outline-none focus:border-lumina-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-lumina-dim mb-1 uppercase font-bold">Waist</label>
                    <input type="number" name="waist" value={formData.waist} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-lg font-mono text-center outline-none focus:border-lumina-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-lumina-dim mb-1 uppercase font-bold">Hips</label>
                    <input type="number" name="hips" value={formData.hips} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-lg font-mono text-center outline-none focus:border-lumina-accent" />
                  </div>
                  <div className="col-span-1.5">
                    <label className="block text-[10px] text-lumina-dim mb-1 uppercase font-bold">Shoulder</label>
                    <input type="number" name="shoulder" value={formData.shoulder} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-base font-mono text-center outline-none focus:border-lumina-accent" />
                  </div>
                  <div className="col-span-1.5">
                    <label className="block text-[10px] text-lumina-dim mb-1 uppercase font-bold">Inseam</label>
                    <input type="number" name="inseam" value={formData.inseam} onChange={handleInputChange} className="w-full bg-lumina-light border border-lumina-700 rounded p-2 text-lumina-text text-base font-mono text-center outline-none focus:border-lumina-accent" />
                  </div>
               </div>
            </div>
            
          </div>

          <p className="text-xs text-lumina-dim italic border-t border-lumina-700 pt-2">
            {mode === 'upload' 
              ? (!formData.useBiometrics 
                  ? "Biometrics ignored. AI will strictly adhere to the visual proportions of the uploaded photo."
                  : "Biometrics ENFORCED. AI will modify the uploaded model to match these exact numbers.")
              : "Precise values required for parametric generation."}
          </p>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={analyzing}
              className={`bg-lumina-accent text-white px-8 py-3 rounded font-bold transition-all flex items-center gap-2 w-full justify-center lg:w-auto shadow-lg ${analyzing ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90 hover:shadow-2xl hover:-translate-y-1'}`}
            >
              {analyzing ? (
                <>ANALYZING... <Loader2 className="animate-spin" size={18} /></>
              ) : (
                <>CONFIRM MODEL <Camera size={18} /></>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ModelStudio;
