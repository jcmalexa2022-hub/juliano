import React, { useState, useRef, useEffect } from 'react';
import { analyzeLink, optimizePostMetadata } from '../services/geminiService';
import { BlogPost, MediaType, Genre } from '../types';
import { Button } from './Button';
import { ImageEditor } from './ImageEditor';
import { VeoGenerator } from './VeoGenerator';

interface PostCreatorProps {
  onPostCreated: (post: BlogPost) => void;
}

const DRAFT_STORAGE_KEY = 'senhor_gotico_draft';

const GENRES: Genre[] = ['Goth', 'Industrial', 'Darkwave', 'Post-Punk', 'EBM', 'Synthpop', 'Metal', 'Other'];

export const PostCreator: React.FC<PostCreatorProps> = ({ onPostCreated }) => {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [draft, setDraft] = useState<Partial<BlogPost>>({});
  const [genre, setGenre] = useState<Genre>('Goth');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(['Music', 'Review']);
  const [tagInput, setTagInput] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [optimizingSeo, setOptimizingSeo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.url) setUrl(parsed.url);
        if (parsed.draft) setDraft(parsed.draft);
        if (parsed.tags) setTags(parsed.tags);
        if (parsed.genre) setGenre(parsed.genre);
        // Only restore cover image if it exists. Video URL is not persistent (blob URL).
        if (parsed.coverImage) setCoverImage(parsed.coverImage);
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  // Save draft on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const dataToSave = { url, draft, tags, genre, coverImage };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (e) {
        console.warn("Draft too large for localStorage, trying without image", e);
        // Fallback: try saving without image if quota exceeded
        try {
            const { coverImage: _, ...rest } = dataToSave;
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rest));
            setLastSaved(new Date());
        } catch (e2) {
            console.error("Could not save draft", e2);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [url, draft, tags, genre, coverImage]);

  const handleUrlAnalyze = async () => {
    if (!url) return;
    setAnalyzing(true);
    try {
      const result = await analyzeLink(url);
      setDraft(prev => ({
        ...prev,
        title: result.title,
        content: result.content,
        metaDescription: result.metaDescription,
        youtubeUrl: url,
        groundingSources: result.sources
      }));
    } catch (e) {
      alert("Could not analyze link");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOptimizeSeo = async () => {
    if (!draft.content) return;
    setOptimizingSeo(true);
    try {
      const result = await optimizePostMetadata(draft.title || "New Post", draft.content);
      setDraft(prev => ({
        ...prev,
        title: result.title,
        metaDescription: result.metaDescription
      }));
    } catch (e) {
      console.error("SEO Optimization failed", e);
    } finally {
      setOptimizingSeo(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setCoverImage(evt.target.result as string);
          setVideoUrl(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePublish = () => {
    if (!draft.title || !draft.content) return;
    
    const newPost: BlogPost = {
      id: Date.now().toString(),
      title: draft.title,
      content: draft.content,
      metaDescription: draft.metaDescription,
      genre: genre,
      date: new Date().toLocaleDateString(),
      tags: tags,
      youtubeUrl: draft.youtubeUrl,
      mediaUrl: videoUrl || coverImage || undefined,
      mediaType: videoUrl ? MediaType.VIDEO : MediaType.IMAGE,
      groundingSources: draft.groundingSources
    };
    
    onPostCreated(newPost);
    
    // Clear draft from storage
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLastSaved(null);

    // Reset form
    setUrl('');
    setDraft({});
    setGenre('Goth');
    setCoverImage(null);
    setVideoUrl(null);
    setTags(['Music', 'Review']);
  };

  const metaDescLength = draft.metaDescription?.length || 0;

  return (
    <div className="bg-panel border border-gray-800 p-6 rounded-xl shadow-2xl mb-8">
      <div className="flex justify-between items-center mb-6 border-l-4 border-acid pl-3">
        <h2 className="text-2xl font-black text-white">NEW ENTRY</h2>
        {lastSaved && (
            <span className="text-xs text-gray-500 font-mono animate-pulse">
                DRAFT SAVED {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Text Content */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase mb-2">YouTube Link</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-deep border border-gray-700 p-3 rounded text-white focus:border-acid outline-none"
                placeholder="https://youtube.com/watch?v=..."
              />
              <Button onClick={handleUrlAnalyze} isLoading={analyzing} variant="primary">
                Analyze
              </Button>
            </div>
          </div>

          {draft.title && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-gray-400 text-[10px] font-bold uppercase mb-1">Title</label>
                    <input 
                        value={draft.title}
                        onChange={e => setDraft({...draft, title: e.target.value})}
                        className="w-full bg-transparent text-2xl font-bold border-b border-gray-700 pb-2 focus:border-acid outline-none"
                        placeholder="Post Title"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-gray-400 text-[10px] font-bold uppercase mb-1">Genre</label>
                    <select 
                        value={genre} 
                        onChange={(e) => setGenre(e.target.value as Genre)}
                        className="w-full bg-deep border border-gray-700 text-acid text-sm p-2 rounded focus:border-acid outline-none font-mono"
                    >
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
              </div>
              
              {/* SEO Meta Description */}
              <div className="bg-black/30 border border-gray-800 rounded p-3">
                 <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold uppercase text-neon">SEO Meta Description</label>
                        <button 
                            onClick={handleOptimizeSeo}
                            disabled={optimizingSeo || !draft.content}
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-acid px-2 py-0.5 rounded border border-gray-600 flex items-center gap-1 disabled:opacity-50 transition-colors"
                            title="Regenerate Title & Description based on Content"
                        >
                           {optimizingSeo ? <span className="animate-spin">↻</span> : <span className="material-icons text-[10px]">auto_awesome</span>}
                           AI Optimize
                        </button>
                    </div>
                    <span className={`text-[10px] font-mono ${metaDescLength > 160 ? 'text-red-500' : 'text-gray-500'}`}>
                        {metaDescLength}/160
                    </span>
                 </div>
                 <textarea 
                    value={draft.metaDescription || ''}
                    onChange={e => setDraft({...draft, metaDescription: e.target.value})}
                    className="w-full bg-transparent text-sm text-gray-300 focus:text-white outline-none resize-none h-16 placeholder-gray-600"
                    placeholder="Enter a concise summary for search engines..."
                 />
              </div>

              <textarea 
                value={draft.content}
                onChange={e => setDraft({...draft, content: e.target.value})}
                className="w-full h-64 bg-deep/50 p-4 rounded border border-gray-700 focus:border-acid outline-none resize-none font-mono text-sm"
                placeholder="Content..."
              />

              {/* Tags Input Section */}
              <div className="mt-2 pt-4 border-t border-gray-800">
                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span key={tag} className="bg-gray-800 text-acid text-xs px-2 py-1 rounded flex items-center gap-1 border border-gray-700">
                      #{tag}
                      <button 
                        onClick={() => handleRemoveTag(tag)} 
                        className="hover:text-white text-gray-500 ml-1 focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add a tag..."
                    className="bg-deep border border-gray-700 p-2 text-sm rounded text-white focus:border-acid outline-none flex-1"
                  />
                  <Button onClick={handleAddTag} variant="secondary" className="!py-1">
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visuals */}
        <div className="space-y-4">
          <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Visuals</label>
          
          {!coverImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-64 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-acid transition-colors group"
            >
              <div className="text-center">
                <span className="material-icons text-4xl text-gray-600 group-hover:text-acid mb-2">add_photo_alternate</span>
                <p className="text-gray-500 font-mono text-sm">+ UPLOAD COVER ART</p>
              </div>
              <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload}/>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {videoUrl ? (
                <div className="relative">
                  <video src={videoUrl} autoPlay loop muted className="w-full rounded border border-gray-700 shadow-lg" />
                  <button 
                    onClick={() => setVideoUrl(null)}
                    className="absolute top-2 right-2 bg-black/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    title="Remove Video"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-neon font-bold">
                    VEO VIDEO
                  </div>
                </div>
              ) : (
                <>
                  <ImageEditor initialImage={coverImage} onImageUpdate={setCoverImage} />
                  <VeoGenerator 
                    imageBase64={coverImage} 
                    onVideoGenerated={setVideoUrl}
                  />
                </>
              )}
              
              <div className="flex justify-end pt-2">
                <Button onClick={() => { setCoverImage(null); setVideoUrl(null); }} variant="secondary" className="text-xs">
                  Remove Visuals
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end border-t border-gray-800 pt-6">
        <Button 
          onClick={handlePublish} 
          disabled={!draft.title || !draft.content} 
          variant="neon"
          className="w-full lg:w-auto"
        >
          Publish Post
        </Button>
      </div>
    </div>
  );
};