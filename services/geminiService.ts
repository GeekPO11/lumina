
import { GoogleGenAI, Type, VideoGenerationReferenceType, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ModelParams, WardrobeParams, ImageSize, CatalogCopy } from "../types";

// Helper to get fresh instance with potentially updated key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Image optimization helper to prevent payload errors (Error 500)
const resizeImageForApi = async (base64Str: string, maxWidth = 640): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.crossOrigin = "Anonymous"; 
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to JPEG with 0.8 quality to reduce size while maintaining visual fidelity
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

/**
 * Uses Gemini 3 Pro (Thinking Mode) to act as a stylist or analyzer
 */
export const getStylistAdvice = async (wardrobe: WardrobeParams) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Analyze this fashion item: ${wardrobe.sku} made of ${wardrobe.fabric}. 
    Provide a brief, 1-sentence technical description of how this fabric should behave under studio lighting 
    and one suggestion for a pose that highlights its features.`,
    config: {
      thinkingConfig: { thinkingBudget: 2048 }
    }
  });
  return response.text;
};

/**
 * Automatically describes fabric and suggests a Product SKU/Title from an image
 */
export const analyzeGarmentImage = async (base64Image: string) => {
    const ai = getAI();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
            parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: "Analyze this garment image. Return a JSON object with: 'sku' (a short, catchy 3-5 word commercial product title) and 'fabric' (technical description of material, weave, and texture in 1-2 sentences)." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    sku: { type: Type.STRING },
                    fabric: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

/**
 * Uses Gemini 2.5 Flash with Google Search to get current trends
 */
export const searchFashionTrends = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `What are the current fashion trends regarding: ${query}? Provide 3 brief bullet points.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  
  const text = response.text;
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return { text, sources };
};

/**
 * Uses Gemini 3 Pro to analyze an uploaded reference image
 */
export const analyzeReferenceImage = async (base64Image: string) => {
  const ai = getAI();
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
        { text: "Analyze this person. Return a JSON object with: gender, ethnicity, bodyType, estimatedHeight, estimatedChestInches, estimatedWaistInches, estimatedHipsInches, estimatedShoulderInches, estimatedInseamInches." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          gender: { type: Type.STRING },
          ethnicity: { type: Type.STRING },
          bodyType: { type: Type.STRING },
          estimatedHeight: { type: Type.STRING },
          estimatedChestInches: { type: Type.NUMBER },
          estimatedWaistInches: { type: Type.NUMBER },
          estimatedHipsInches: { type: Type.NUMBER },
          estimatedShoulderInches: { type: Type.NUMBER },
          estimatedInseamInches: { type: Type.NUMBER },
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Calculates semantic body shape descriptors based on measurements to override default model biases.
 * Updated to be Gender-Aware.
 */
const calculateBodyProfile = (params: ModelParams) => {
  // If constraints are off, return visual reliance descriptor
  if (!params.useBiometrics) {
      return "DETECT FROM [IMAGE A]. Ignore numerical measurements.";
  }

  const chest = Number(params.chest);
  const waist = Number(params.waist);
  const hips = Number(params.hips);
  const shoulder = Number(params.shoulder);
  
  const waistToHip = waist / (hips || 36);
  const chestToWaist = chest / (waist || 25);
  
  const descriptors = [];
  const isMale = params.gender.toLowerCase() === 'male';

  if (isMale) {
      // --- MALE LOGIC ---
      if (chest > 44 || waist > 38) {
           descriptors.push("Big and Tall Fashion", "Broad Build", "Stocky Physique", "Heavy Set");
      } else if (chest < 36 && waist < 30) {
           descriptors.push("Slim Male Model", "Skinny Fit", "Ectomorph");
      } else if (shoulder > 18 && waist < 32) {
           descriptors.push("Athletic Build", "Muscular Physique", "V-Taper Torso");
      } else {
           descriptors.push("Standard Male Editorial Model");
      }

      if (chestToWaist > 1.3) {
           descriptors.push("Broad Chest", "Defined Pectorals", "Gymnast Build");
      } else {
           descriptors.push("Rectangular Torso", "Straight Build");
      }

  } else {
      // --- FEMALE LOGIC ---
      if (chest > 37 || hips > 40 || waist > 30) {
          descriptors.push("Plus Size Fashion Photography", "Curvy Model", "Full-Figured Physique");
      } else if (chest < 32 && waist < 24) {
          descriptors.push("Petite High Fashion");
      } else {
          descriptors.push("Standard Editorial Fashion");
      }

      if (waistToHip < 0.72) descriptors.push("Curvy Hourglass Figure", "Defined Waist");
      else if (waistToHip > 0.85) descriptors.push("Straight Athletic Build", "Rectangular Torso");
      else descriptors.push("Balanced Proportion");

      if (chestToWaist > 1.45) {
          descriptors.push("Very Full-Busted", "Voluptuous Chest", "Large Cup Size", "Top-Heavy");
      } else if (chestToWaist > 1.35) {
          descriptors.push("Full Bust", "Curvy Upper Body");
      } else if (chestToWaist < 1.15) {
          descriptors.push("Petite Bust", "Small Chested");
      }

      if ((hips - waist) > 12) descriptors.push("Wide Hips", "Curvy Lower Body", "Pear Shaped");
  }
  
  // Common Attributes
  if (shoulder > 19) descriptors.push("Broad Shoulders", "Strong Frame");

  if (params.height.includes("5'1") || params.height.includes("5'0") || params.height.includes("4'")) {
      descriptors.push("Petite Stature");
  } else if (params.height.includes("6'")) {
      descriptors.push("Tall Stature", "Elongated Limbs");
  }

  return descriptors.join(", ");
};

/**
 * Uses Gemini 3 Pro Image Preview to generate the photoshoot images.
 * Supports MULTI-MODAL Virtual Try-On with Model Refs + Garment Refs.
 */
export const generateFashionImage = async (
  modelParams: ModelParams,
  wardrobeParams: WardrobeParams,
  angle: string,
  size: ImageSize,
  consistencyReference?: string 
) => {
  const ai = getAI();
  
  const bodyDescriptors = calculateBodyProfile(modelParams);
  const isMale = modelParams.gender.toLowerCase() === 'male';
  
  // Logic to build the Biometric Enforcement Block with Gender Awareness
  let biometricBlock = "";
  if (modelParams.useBiometrics) {
    const chestVal = Number(modelParams.chest);
    
    let chestEnforcement = "";
    if (isMale) {
        chestEnforcement = chestVal > 40
            ? "SUBJECT MUST HAVE A BROAD, MUSCULAR CHEST. Defined Pectorals. Do NOT generate a feminine bust or breasts. Maintain masculine torso structure."
            : "Standard male chest dimensions.";
    } else {
        chestEnforcement = chestVal > 36 
            ? "SUBJECT MUST HAVE A LARGE, FULL BUST corresponding to measurements. Do NOT generate a flat-chested or standard runway model." 
            : "Standard bust size.";
    }

    biometricBlock = `
[BIOMETRIC ENFORCEMENT - STRICT ADHERENCE REQUIRED]
- Chest: ${modelParams.chest}" (${chestEnforcement})
- Waist: ${modelParams.waist}"
- Hips: ${modelParams.hips}"
- Shoulder Width: ${modelParams.shoulder}"
- Inseam: ${modelParams.inseam}"
- Height: ${modelParams.height}
- Gender Presentation: ${modelParams.gender} (Strictly enforce secondary sexual characteristics for ${modelParams.gender} anatomy).
- INSTRUCTION: The physical body proportions MUST match the numerical values provided above. Override any default model archetype.
    `;
  } else {
    // If Constraints are OFF, we tell the model to rely solely on the visual reference.
    biometricBlock = `
[VISUAL ADHERENCE - DETECT FROM IMAGE A]
- Gender: DETECT FROM [IMAGE A]. Do not assume from prompt text.
- Body Type: DETECT FROM [IMAGE A].
- Ethnicity: DETECT FROM [IMAGE A].
- Preserve the exact facial features and skin tone from [IMAGE A].
- Preserve the general body shape from [IMAGE A].
- **IMPORTANT: Do NOT preserve the pose from [IMAGE A]. You MUST re-pose the subject.**
    `;
  }

  // Construct Subject Spec based on whether biometrics are enforced or visually detected
  const subjectSpec = modelParams.useBiometrics ? `
- Gender: ${modelParams.gender}
- Age Range: ${modelParams.ageRange}
- Ethnicity: ${modelParams.ethnicity}
- Semantic Body Type: ${modelParams.bodyType}
- VISUAL SHAPE DESCRIPTORS: ${bodyDescriptors}
  ` : `
- Gender: DETECT FROM [IMAGE A] (Visual Dominance)
- Age Range: DETECT FROM [IMAGE A]
- Ethnicity: DETECT FROM [IMAGE A]
- Semantic Body Type: DETECT FROM [IMAGE A]
  `;

  const parts: any[] = [];
  let promptReferences = "";

  // 1. SELECT BEST MODEL REFERENCE
  // Priority: 1. Passed Consistency Anchor (Prev Gen) -> 2. Specific Angle Upload -> 3. Front Upload
  let selectedModelRef = consistencyReference;
  
  if (!selectedModelRef && modelParams.type === 'reference') {
      if (angle === 'Side' && modelParams.references.side) {
          selectedModelRef = modelParams.references.side;
      } else if (angle === 'Back' && modelParams.references.back) {
          selectedModelRef = modelParams.references.back;
      } else if (modelParams.references.front) {
          selectedModelRef = modelParams.references.front;
      }
  }

  if (selectedModelRef) {
      const optimizedRef = await resizeImageForApi(selectedModelRef);
      const cleanRef = optimizedRef.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });
      promptReferences += `- [IMAGE A]: This is the PRIMARY SUBJECT (The Model). You MUST preserve this person's exact identity, face, and skin tone. **CRITICAL: You MUST EXTRACT the subject from the background of [IMAGE A]. DO NOT USE THE BACKGROUND FROM [IMAGE A].**\n`;
  }

  // 2. SELECT BEST GARMENT REFERENCE
  let selectedGarmentRef = null;

  if (wardrobeParams.references) {
      if (angle === 'Back' && wardrobeParams.references.back) {
         selectedGarmentRef = wardrobeParams.references.back;
      } else if (wardrobeParams.references.front) {
         selectedGarmentRef = wardrobeParams.references.front;
      } else if (wardrobeParams.references.detail) {
         selectedGarmentRef = wardrobeParams.references.detail;
      }
  }

  if (selectedGarmentRef) {
      const optimizedGarment = await resizeImageForApi(selectedGarmentRef);
      const cleanGarment = optimizedGarment.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanGarment } });
      promptReferences += `- [IMAGE B]: This is the SOURCE MATERIAL (The Garment). This is a reference for texture, pattern, and cut only. Apply this clothing onto the subject in [IMAGE A].\n`;
  }

  // 2.5 ACCESSORY REFERENCE
  let selectedAccessoryRef = null;
  if (wardrobeParams.references?.accessory) {
      selectedAccessoryRef = wardrobeParams.references.accessory;
  }
  
  if (selectedAccessoryRef) {
      const optimizedAccessory = await resizeImageForApi(selectedAccessoryRef);
      const cleanAccessory = optimizedAccessory.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanAccessory } });
      promptReferences += `- [IMAGE C]: ACCESSORY/BRANDING REFERENCE. Use this for logos, hats, bags, or jewelry details. PRESERVE TEXT AND LOGOS EXACTLY.\n`;
  }

  // 3. BACKGROUND LOGIC
  let backgroundInstruction = "Cinematic deep grey studio infinity wall.";
  if (wardrobeParams.background === 'white') {
      backgroundInstruction = "PURE WHITE BACKGROUND (Hex #FFFFFF). High-key commercial e-commerce lighting. No shadows on background. CLEAN STUDIO CUTOUT STYLE.";
  } else if (wardrobeParams.background === 'grey') {
      backgroundInstruction = "Soft grey gradient studio background. Elegant editorial atmosphere.";
  } else if (wardrobeParams.background === 'lifestyle') {
      backgroundInstruction = "Blurred urban city street, bokeh depth of field. Natural daylight.";
  }

  // 4. POSE LOGIC
  let poseInstruction = "Standard catalog pose, standing straight, hands at sides. FULL BODY VISIBLE (Head to Toe).";
  if (angle === 'Side') {
      poseInstruction = "SIDE PROFILE VIEW. Rotate the subject 90 degrees to the side. Visible profile of face and body. Walking motion. DO NOT show the front view. FULL BODY SHOT (Head to Toe).";
  } else if (angle === 'Back') {
      poseInstruction = "BACK VIEW. Rotate the subject 180 degrees. FULL BODY SHOT FROM BEHIND (Head to Toe). Include shoes. Show the back of the garment and the back of the head. DO NOT show the face.";
  } else {
      poseInstruction = "FRONT FACING VIEW. Standing confidently, facing camera. Good posture. FULL BODY SHOT (Head to Toe).";
  }

  // 5. CONSTRUCT INSTRUCTION
  let prompt = `
[PRIMARY DIRECTIVE: GENERATIVE RE-CONTEXTUALIZATION]
You are a professional fashion photographer.
Input A: The Human Subject (Reference).
Input B: The Garment (Reference).
${selectedAccessoryRef ? 'Input C: Accessory Reference.' : ''}
Task: Generate a PHOTOREALISTIC image of the subject wearing the garment in a NEW environment with a NEW pose.

[CRITICAL NEGATIVE CONSTRAINTS]
- DO NOT USE THE BACKGROUND FROM IMAGE A. The background MUST be ${wardrobeParams.background === 'white' ? 'PURE WHITE' : 'the requested scene'}.
- DO NOT USE THE POSE FROM IMAGE A if it contradicts the requested angle.
- DO NOT produce a "collage" or "cut and paste" look. Lighting must match the new scene.
- DO NOT CROP THE HEAD OR FEET. FULL BODY SHOT REQUIRED.
- DO NOT ADD NEW ACCESSORIES (Sunglasses, Hats, Jewelry) unless explicitly present in the source images.
- DO NOT CHANGE EXISTING EYEWEAR. If [IMAGE A] shows clear spectacles, they MUST remain clear. Do NOT render sunglasses.

[COLOR FIDELITY PROTOCOL]
- EXACTLY MATCH the colors from [IMAGE B].
- Do not apply filters or color grading that alters the garment color.
- If [IMAGE B] is black, the output MUST be black. Do not wash out colors.

[SCENE CONFIGURATION]
- Background: ${backgroundInstruction}
- Angle/Pose: ${poseInstruction}
- Aspect Ratio: 16:9

[STEP 1: SEGMENTATION & RE-POSING]
- Isolate the person from [IMAGE A].
- DISCARD the background from [IMAGE A].
- DISCARD the original clothes from [IMAGE A].
- PLACE the subject into the new [SCENE CONFIGURATION].
- RE-POSE the subject to match the [Angle/Pose] instruction.

[STEP 2: VIRTUAL TRY-ON]
- Warp and fit the garment from [IMAGE B] onto the person's body.
- Ensure the fabric from [IMAGE B] reacts physically to the body shape.
${selectedAccessoryRef ? '- [STEP 2.5] ACCESSORIES: Composite the accessory from [IMAGE C]. PRESERVE LOGOS AND TEXT EXACTLY. Do not hallucinate text.' : ''}

[VISUAL REFERENCES]
${promptReferences || "No images provided. Generate from description below."}

[SUBJECT SPECIFICATION]
${subjectSpec}
- Accessories: STRICTLY PRESERVE from [IMAGE A] and [IMAGE C].

${biometricBlock}

[APPAREL SPECIFICATION]
- Item SKU: ${wardrobeParams.sku}
- Fabric Physics: ${wardrobeParams.fabric}
- Fit Style: ${wardrobeParams.fit}

[SCENE COMPOSITION]
- Angle: ${angle} View
- Lighting: Professional Studio Strobes.
- Composition: Wide angle, center frame, FULL BODY VISIBLE (Head to Toe).
`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts: parts },
    config: {
      imageConfig: {
        imageSize: size, 
        aspectRatio: "16:9" 
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    }
  });

  const candidate = response.candidates?.[0];

  if (candidate?.finishReason === 'SAFETY') {
    throw new Error("Generation blocked by Safety Filters. Try describing the item as 'Professional Swimwear' or 'Catalog Item'.");
  }
  
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
     throw new Error(`Generation stopped unexpectedly. Reason: ${candidate.finishReason}`);
  }

  for (const part of candidate?.content?.parts || []) {
    if (part.inlineData) {
      return {
        url: `data:image/png;base64,${part.inlineData.data}`,
        prompt: prompt
      };
    }
  }
  
  throw new Error("No image generated.");
};

export const editFashionImage = async (base64Image: string, instruction: string) => {
  const ai = getAI();
  const optimizedImage = await resizeImageForApi(base64Image);
  const cleanBase64 = optimizedImage.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: cleanBase64 } },
        { text: instruction }
      ]
    },
    config: {
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image generated");
};

export const generateRunwayVideo = async (base64Images: string[]) => {
  const ai = getAI();
  if (!base64Images || base64Images.length === 0) throw new Error("No source assets provided");

  const optimizedImages = await Promise.all(base64Images.slice(0, 3).map(img => resizeImageForApi(img, 512)));

  const referenceImages = optimizedImages.map(img => ({
    image: {
      imageBytes: img.replace(/^data:image\/\w+;base64,/, ""),
      mimeType: 'image/jpeg',
    },
    referenceType: VideoGenerationReferenceType.ASSET,
  }));

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `High-Budget Commercial 16:9 Fashion Runway Video. MAX QUALITY. Wide angle full body shot. The model performs a slow, elegant full turn (360 degrees).

[STRICT VISUAL ADHERENCE]
- IDENTITY: ID must match the reference images exactly. Preserve face, hair, and body metrics.
- APPAREL: Fabric physics, color, and texture must match the reference exactly.
- ACCESSORIES: Do NOT add or remove items. If model wears spectacles, keep them clear. NO SUNGLASSES unless present in reference.
- ENVIRONMENT: Seamlessly extend the studio background from the references.

Cinematic lighting. Do not stretch the subject. Maintain aspect ratio.`,
      config: {
        numberOfVideos: 1,
        referenceImages: referenceImages,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
      throw new Error(`Veo API Error: ${operation.error.message || 'Operation failed'}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
        throw new Error("Video generation completed but no video URI was returned. Try regenerating with different source images.");
    }

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (err: any) {
    const msg = err.message || err.toString();
    if (msg.includes("400")) throw new Error("Request Rejected (400): Ensure images are clear and strictly follow safety guidelines.");
    if (msg.includes("500")) throw new Error("Server Error (500): Payload too large. Retrying with smaller images...");
    throw new Error(`Generation Failed: ${msg}`);
  }
};

export const generateCatalogCopy = async (base64Image: string): Promise<CatalogCopy> => {
    const ai = getAI();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: "Act as a professional e-commerce copywriter. Write a product title, an engaging product description, and 5 SEO keywords for this fashion item." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    
    return JSON.parse(response.text || "{}");
};
