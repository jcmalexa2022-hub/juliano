import React, { useState } from 'react';
import { generateVeoVideo } from '../services/geminiService';
import { Button } from './Button';

interface VeoGeneratorProps {
  imageBase64: string | null;
  onVideoGenerated: (url: string) => void;
}

export const VeoGenerator: React.FC<VeoGeneratorProps> = ({ imageBase64, onVideoGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    // Clear previous preview if regenerating
    setPreviewUrl(null);

    try {
      // Check API Key using the injected global
      // @ts-ignore
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Check again after modal interaction
         // @ts-ignore
         if (!await window.aistudio.hasSelectedApiKey()) {
           throw new Error("API Key selection required for Veo.");
         }
      }

      const url = await generateVeoVideo(imageBase64.split(',')[1], prompt);
      setPreviewUrl(url);
    } catch (err: any) {
      if (err.message === 'API_KEY_REQUIRED' || err.toString().includes('API_KEY_REQUIRED')) {
         setError("Billing enabled API key required.");
         // @ts-ignore
         if (window.aistudio) window.aistudio.openSelectKey();
      } else {
        setError("Video generation failed. This can take minutes.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!imageBase64) return null;

  return (
    <div className="mt-4 p-4 border border-gray-700 bg-black rounded">
      <h3 className="text-neon font-bold mb-2 flex items-center gap-2">
        <span className="material-icons">movie</span> Veo Animator
      </h3>

      {/* Preview Section */}
      {previewUrl && (
        <div className="mb-6 bg-gray-900/50 p-3 rounded border border-gray-700 animate-fade-in">
            <div className="text-xs text-neon font-bold uppercase mb-2">Preview</div>
            <video src={previewUrl} autoPlay loop muted controls className="w-full rounded border border-gray-800 mb-3 shadow-lg" />
            <div className="flex gap-2">
                <Button onClick={() => onVideoGenerated(previewUrl)} variant="neon" className="flex-1">
                    <span className="material-icons text-sm">check</span> Use This Video
                </Button>
                <Button onClick={() => setPreviewUrl(null)} variant="danger" className="!px-3">
                    <span className="material-icons text-sm">close</span>
                </Button>
            </div>
        </div>
      )}
      
      <p className="text-gray-400 text-sm mb-4">
        Turn your cover art into a 720p video loop. *Requires paid API key.*
      </p>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the motion (e.g. 'Camera pans right, neon lights flicker')"
          className="flex-1 bg-gray-800 border border-gray-600 p-2 text-white rounded focus:border-neon outline-none"
        />
        <Button onClick={handleGenerate} isLoading={loading} variant="secondary">
          {previewUrl ? 'Regenerate' : 'Animate'}
        </Button>
      </div>

      {error && (
         <div className="text-red-400 text-sm mb-2">
           {error} <br/>
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline" rel="noreferrer">Billing Docs</a>
         </div>
      )}
      
      {loading && (
        <div className="text-center py-4">
            <p className="text-acid animate-pulse">Generating video (this may take a minute)...</p>
        </div>
      )}
    </div>
  );
};