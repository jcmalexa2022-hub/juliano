import React, { useState } from 'react';
import { PostCreator } from './components/PostCreator';
import { LiveCritic } from './components/LiveCritic';
import { BlogPost, MediaType, Genre } from './types';

const App: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<Genre | 'All'>('All');

  const handlePostCreated = (newPost: BlogPost) => {
    setPosts([newPost, ...posts]);
  };

  const filteredPosts = selectedGenre === 'All' 
    ? posts 
    : posts.filter(post => post.genre === selectedGenre);

  const genres: (Genre | 'All')[] = ['All', 'Goth', 'Industrial', 'Darkwave', 'Post-Punk', 'EBM', 'Synthpop', 'Metal', 'Other'];

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans pb-20">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
            <span className="material-icons text-acid">graphic_eq</span>
            SENHOR GÓTICO
          </h1>
          <div className="text-xs text-gray-500 font-mono hidden md:block">
            AI-POWERED MUSIC JOURNAL
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <PostCreator onPostCreated={handlePostCreated} />

        {/* Genre Filter */}
        <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
                {genres.map(g => (
                    <button
                        key={g}
                        onClick={() => setSelectedGenre(g)}
                        className={`px-4 py-1 rounded-full text-sm font-bold border transition-all ${
                            selectedGenre === g 
                            ? 'bg-acid text-black border-acid' 
                            : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                        }`}
                    >
                        {g}
                    </button>
                ))}
            </div>
        </div>

        {/* Posts List */}
        <div className="space-y-8">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              <span className="material-icons text-6xl mb-4 block opacity-20">library_music</span>
              <p className="font-mono">No entries found for {selectedGenre}.</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <article key={post.id} className="bg-panel rounded-xl overflow-hidden border border-gray-800 shadow-lg animate-fade-in">
                {post.mediaUrl && (
                  <div className="w-full h-64 bg-black relative group">
                    {post.mediaType === MediaType.VIDEO ? (
                      <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded font-mono border border-gray-700 uppercase">
                                {post.date}
                            </span>
                            <span className="bg-gray-800 text-acid text-[10px] px-2 py-0.5 rounded font-mono border border-gray-700 uppercase font-bold">
                                {post.genre}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{post.title}</h2>
                     </div>
                     {post.youtubeUrl && (
                         <a 
                            href={post.youtubeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full flex items-center justify-center transition-colors"
                            title="Watch on YouTube"
                         >
                             <span className="material-icons text-sm">play_arrow</span>
                         </a>
                     )}
                  </div>
                  
                  {post.metaDescription && (
                      <p className="text-gray-500 text-sm mb-4 italic border-l-2 border-gray-700 pl-3">
                          {post.metaDescription}
                      </p>
                  )}

                  <div className="prose prose-invert prose-sm max-w-none mb-6 font-mono text-gray-300 whitespace-pre-wrap">
                    {post.content}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs text-neon">#{tag}</span>
                    ))}
                  </div>
                  
                  {post.groundingSources && post.groundingSources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-[10px] uppercase text-gray-500 font-bold mb-2">Sources</p>
                        <ul className="text-xs space-y-1">
                            {post.groundingSources.map((source, i) => (
                                <li key={i}>
                                    <a href={source.uri} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-acid truncate block">
                                        {source.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </main>
      
      <LiveCritic />
    </div>
  );
};

export default App;