
import React, { useEffect, useState } from 'react';
import { SpecialEvent, Artifact, Agent } from '../types';
import { MapPin, X, Pause } from 'lucide-react';

interface EventPopupProps {
    event: SpecialEvent | null;
    artifacts: Artifact[];
    agents: Agent[];
    onClose: () => void;
    onFocus: () => void;
}

const EventPopup: React.FC<EventPopupProps> = ({ event, artifacts, agents, onClose, onFocus }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Only show if the event is in the 'announced' state
        // The game loop pauses when this happens, keeping it in this state until interaction
        if (event && event.status === 'announced') {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [event]);

    if (!event || !visible) return null;

    const artifact = artifacts.find(a => a.id === event.artifactId);
    if (!artifact) return null;

    const creators = artifact.creators.map(id => {
        const agent = agents.find(a => a.id === id);
        return agent ? agent.name.split(' ')[0] : 'Unknown';
    }).join(' & ');

    return (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900/90 border-2 border-purple-500 rounded-xl p-1 shadow-[0_0_60px_rgba(168,85,247,0.5)] animate-in slide-in-from-top-4 duration-500 max-w-md w-full m-4">
                <div className="border border-purple-500/20 rounded-lg p-6 relative overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                    
                    {/* Pause Indicator */}
                    <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs font-bold tracking-widest bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                            <Pause size={10} className="animate-pulse" />
                            SIMULATION PAUSED
                        </div>
                    </div>

                    <div className="text-center space-y-5 mt-6">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-white font-mono tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                COMIC CREATED!
                            </h2>
                            <div className="flex items-center justify-center gap-2 text-[10px] text-purple-300 font-mono uppercase tracking-widest">
                                <span className="w-8 h-px bg-purple-500/50"></span>
                                <span>Special Event</span>
                                <span className="w-8 h-px bg-purple-500/50"></span>
                            </div>
                        </div>

                        <div className="bg-black/60 border border-purple-500/40 rounded-lg p-6 transform transition-transform duration-300 shadow-inner">
                            <div className="text-5xl mb-3 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-bounce-slow">
                                {artifact.emoji}
                            </div>
                            <h3 className="text-xl font-bold text-purple-100 italic">"{artifact.title}"</h3>
                            <p className="text-xs text-gray-400 font-mono mt-2">Created by {creators}</p>
                        </div>

                        <div className="text-sm text-gray-300 space-y-2">
                            <p>Hologram SAGE will perform this story at</p>
                            <div className="flex items-center justify-center gap-2 text-purple-200 font-bold bg-purple-900/40 py-2 px-4 rounded-lg border border-purple-500/30 inline-flex">
                                <MapPin size={14} className="text-purple-400" />
                                <span className="uppercase tracking-wide">{event.performanceLocation.replace('-', ' ')}</span>
                            </div>
                            <p className="text-xs text-gray-500 italic mt-2">The colony is gathering...</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button 
                                onClick={() => { onFocus(); setVisible(false); }}
                                className="w-full py-3 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white rounded-lg font-mono text-sm font-bold tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                WATCH PERFORMANCE →
                            </button>
                            
                            <button 
                                onClick={() => { onClose(); setVisible(false); }}
                                className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-mono underline decoration-gray-700 hover:decoration-gray-500 underline-offset-4"
                            >
                                Resume without watching
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventPopup;
