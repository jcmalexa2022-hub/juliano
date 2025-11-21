import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

const apiKey = process.env.API_KEY || '';

// Initialize standard client
// NOTE: For Veo, we will create a fresh instance with user-selected key
const ai = new GoogleGenAI({ apiKey });

// --- Text & Search Grounding ---

export const analyzeLink = async (url: string): Promise<{ title: string, metaDescription: string, content: string, sources: any[] }> => {
  // Uses search grounding to get info about the link
  const model = ai.models;
  
  const prompt = `Analyze this YouTube link: ${url}. 
  1. Create a punchy, engaging, SEO-optimized blog post title.
  2. Write a concise SEO meta description (max 160 characters).
  3. Write a short, high-energy summary (max 150 words) explaining why this music is essential for the 'Senhor Gótico' blog.
  
  Strictly format your response as follows (do not use markdown for headers):
  TITLE: [Your Title Here]
  DESCRIPTION: [Your Description Here]
  CONTENT: [Your Content Here]`;

  try {
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Could not analyze link.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Parsing
    let title = "New Post";
    let metaDescription = "";
    let content = "";

    const titleMatch = text.match(/TITLE:\s*(.*)/i);
    const descMatch = text.match(/DESCRIPTION:\s*(.*)/i);
    const contentSplit = text.split(/CONTENT:\s*/i);

    if (titleMatch) title = titleMatch[1].trim();
    if (descMatch) metaDescription = descMatch[1].trim();
    if (contentSplit.length > 1) content = contentSplit[1].trim();

    // Fallback if strict formatting failed
    if (!content && !titleMatch) {
        const lines = text.split('\n');
        title = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '');
        content = lines.slice(1).join('\n').trim();
    }
    
    const sources = chunks.map((c: any) => c.web).filter(Boolean);

    return { title, metaDescription, content, sources };
  } catch (error) {
    console.error("Link analysis failed", error);
    throw error;
  }
};

export const optimizePostMetadata = async (currentTitle: string, currentContent: string): Promise<{ title: string, metaDescription: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an SEO expert for a music blog. Analyze the following draft post:
      
      TITLE: ${currentTitle}
      CONTENT: ${currentContent}
      
      Task:
      1. Refine the title to be more engaging and SEO-friendly while keeping the original intent.
      2. Write a compelling meta description (max 160 chars) summarizing the content.
      
      Output strictly in this format:
      TITLE: [New Title]
      DESCRIPTION: [New Description]`,
    });
    
    const text = response.text || "";
    let title = currentTitle;
    let metaDescription = "";
    
    const titleMatch = text.match(/TITLE:\s*(.*)/i);
    const descMatch = text.match(/DESCRIPTION:\s*(.*)/i);
    
    if (titleMatch) title = titleMatch[1].trim();
    if (descMatch) metaDescription = descMatch[1].trim();
    
    return { title, metaDescription };
  } catch (e) {
    console.error("SEO optimization failed", e);
    throw e;
  }
};

// --- Image Editing (Nano Banana) ---

export const editImage = async (imageBase64: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data; // Returns base64
      }
    }
    throw new Error("No image generated");
  } catch (e) {
    console.error("Image edit failed", e);
    throw e;
  }
};

// --- Video Generation (Veo) ---

export const generateVeoVideo = async (imageBase64: string, prompt: string): Promise<string> => {
  // CRITICAL: Check for paid key first
  // @ts-ignore - window.aistudio is injected
  if (!window.aistudio?.hasSelectedApiKey()) {
    throw new Error("API_KEY_REQUIRED");
  }

  // Create NEW instance to grab the injected key
  const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let operation = await veoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animate this image cinematically",
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9',
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await veoAi.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    // Fetch with key appended
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
    
  } catch (e) {
    console.error("Veo generation failed", e);
    throw e;
  }
};

// --- Live API (Audio) ---

export const connectLiveSession = async (
  onOpen: () => void,
  onMessage: (blob: Blob, transcript?: string) => void,
  onError: (e: any) => void,
  onClose: () => void
) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }, // Deep, authoritative voice
      },
      systemInstruction: "You are an opinionated music critic for the blog 'Senhor Gótico'. Engage in real-time debates about music, offer sharp critiques on user taste, and discuss dark alternative genres. Be witty, mysterious, and concise.",
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    },
    callbacks: {
      onopen: onOpen,
      onmessage: (message: LiveServerMessage) => {
        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
        let text = "";
        if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
            text = message.serverContent.modelTurn.parts[0].text;
        }
        
        // Also check transcription
        if (message.serverContent?.outputTranscription?.text) {
             text = message.serverContent.outputTranscription.text;
        }

        if (audioData) {
          onMessage(audioData, text);
        }
      },
      onerror: onError,
      onclose: onClose,
    },
  });
};