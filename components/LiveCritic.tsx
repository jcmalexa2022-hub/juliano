import React, { useEffect, useRef, useState } from 'react';
import { connectLiveSession } from '../services/geminiService';
import { createPcmBlob, decode, decodeAudioData } from '../services/audioUtils';
import { Button } from './Button';

export const LiveCritic: React.FC = () => {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const disconnect = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setActive(false);
    setStatus('idle');
    setIsSpeaking(false);
    setVolume(0);
  };

  const startSession = async () => {
    setStatus('connecting');
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 // Match output rate
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true
      }});

      const inputContext = new AudioContext({ sampleRate: 16000 });
      inputSourceRef.current = inputContext.createMediaStreamSource(stream);
      processorRef.current = inputContext.createScriptProcessor(4096, 1, 1);

      sessionPromiseRef.current = connectLiveSession(
        () => {
          setStatus('live');
          setActive(true);
        },
        async (audioBlob) => {
          if (!audioContextRef.current) return;
          
          // Handle audio out
          const ctx = audioContextRef.current;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
          
          try {
            const audioBuffer = await decodeAudioData(
              decode(audioBlob.data),
              ctx,
              24000,
              1
            );
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            
            // Simple visualizer simulation
            setIsSpeaking(true);
            setVolume(0.8); 
            setTimeout(() => {
                setVolume(0);
                setIsSpeaking(false);
            }, audioBuffer.duration * 1000);
            
          } catch (e) {
            console.error("Error decoding audio", e);
          }
        },
        (err) => {
          console.error(err);
          setStatus('error');
          disconnect();
        },
        () => {
          setStatus('idle');
          disconnect();
        }
      );

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        sessionPromiseRef.current?.then(session => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };

      inputSourceRef.current.connect(processorRef.current);
      processorRef.current.connect(inputContext.destination);

    } catch (err) {
      console.error("Failed to start live session", err);
      setStatus('error');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Status / Visualizer Panel */}
      <div className={`transition-all duration-300 transform ${status === 'live' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="bg-black/90 border border-acid p-4 rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.2)] w-64">
          <div className="flex justify-between items-center mb-3">
             <span className="text-acid text-xs font-bold font-mono uppercase tracking-widest">Live Critic</span>
             <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-acid opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-acid"></span>
             </span>
          </div>
          
          <div className="flex items-center justify-center gap-1 h-12 mb-2">
             {/* Visualizer bars */}
             {[1,2,3,4,5,6,7].map(i => (
               <div 
                 key={i} 
                 className="w-1.5 bg-acid rounded-full transition-all duration-75 ease-in-out"
                 style={{ 
                    height: volume > 0.01 ? `${Math.max(15, Math.random() * 100)}%` : '15%',
                    opacity: volume > 0.01 ? 1 : 0.5
                 }}
               />
             ))}
          </div>
          <p className="text-gray-400 text-[10px] font-mono text-center uppercase">
             {isSpeaking ? "AI is debating..." : "Listening..."}
          </p>
        </div>
      </div>
      
      {/* Main Toggle Button */}
      <div className="relative group">
          {status === 'idle' && (
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-black text-xs font-bold py-1 px-3 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
                Debate Music
                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white transform rotate-45"></div>
            </div>
          )}

          <Button 
            variant={active ? 'danger' : 'neon'} 
            onClick={active ? disconnect : startSession}
            className={`rounded-full w-16 h-16 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center !p-0 transition-transform duration-200 ${active ? 'scale-110' : 'hover:scale-105'}`}
            title={active ? "Disconnect" : "Talk to Live Critic"}
          >
            {status === 'connecting' ? (
                <svg className="animate-spin h-8 w-8 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : active ? (
                <span className="material-icons text-3xl">mic_off</span>
            ) : (
                <span className="material-icons text-3xl">mic</span>
            )}
          </Button>
      </div>
    </div>
  );
};