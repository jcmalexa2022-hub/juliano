import React, { useState } from 'react';
import { editImage } from '../services/geminiService';
import { Button } from './Button';

interface ImageEditorProps {
  initialImage: string;
  onImageUpdate: (newImage: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ initialImage, onImageUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEdit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      // Remove data:image/png;base64, prefix for the API
      const rawBase64 = initialImage.split(',')[1];
      const newImageRaw = await editImage(rawBase64, prompt);
      onImageUpdate(`data:image/png;base64,${newImageRaw}`);
      setPrompt('');
    } catch (e) {
      alert("Failed to edit image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="relative group">
        <img src={initialImage} alt="Cover" className="w-full h-64 object-cover rounded border border-gray-700" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
           <div className="w-full">
             <label className="text-xs text-neon font-bold uppercase mb-1 block">AI Edit (Nano Banana)</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={prompt}
                 onChange={e => setPrompt(e.target.value)}
                 placeholder="e.g. 'Make it cyberpunk', 'Add a cat'"
                 className="flex-1 bg-gray-900/90 text-white text-sm p-2 rounded border border-gray-500 focus:border-neon outline-none"
                 onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
               />
               <Button onClick={handleEdit} isLoading={loading} disabled={!prompt} variant="neon" className="!py-1 !px-3 text-xs">
                 Go
               </Button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
