import React from 'react';
import { CHARACTER_EMOJIS } from '../constants';
import { AgentType } from '../types';

interface TitleScreenProps {
    onStart: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
    // Define node positions for the constellation graph (Canvas: 800x400)
    const nodes = [
        { id: 'lucy', type: AgentType.LUCY, x: 400, y: 60, label: 'Lucy' },
        { id: 'lala', type: AgentType.LALA, x: 550, y: 100, label: 'LaLaMoon' },
        { id: 'chef', type: AgentType.SAGE_CHEF, x: 650, y: 200, label: 'Chef' },
        { id: 'holo', type: AgentType.SAGE_HOLO, x: 550, y: 320, label: 'Holo' },
        { id: 'fennec', type: AgentType.FENNEC, x: 400, y: 360, label: 'Fennec' },
        { id: 'core', type: AgentType.SAGE_CORE, x: 250, y: 320, label: 'Core' },
        { id: 'carl', type: AgentType.CARL, x: 150, y: 200, label: 'Carl' },
        { id: 'fox', type: AgentType.FOX, x: 250, y: 100, label: 'Fox' },
    ];

    // Define connections between characters
    const links = [
        ['lucy', 'lala'], ['lala', 'chef'], ['chef', 'holo'], ['holo', 'fennec'],
        ['fennec', 'core'], ['core', 'carl'], ['carl', 'fox'], ['fox', 'lucy'],
        ['carl', 'lala'], ['fox', 'fennec'], ['core', 'holo']
    ];

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-950 text-white relative overflow-hidden font-inter select-none">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.15),transparent_70%)] pointer-events-none"></div>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>

            {/* Content Container */}
            <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
                 <div className="text-center mb-8">
                     <h1 className="text-5xl md:text-7xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-br from-purple-300 via-white to-blue-300 tracking-tighter drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        Apartmentverse
                     </h1>
                     <div className="flex items-center justify-center gap-4 text-purple-200/80 font-mono tracking-widest text-sm md:text-base uppercase">
                        <span className="w-12 h-px bg-purple-500/50"></span>
                        <span>Colony Simulation</span>
                        <span className="w-12 h-px bg-purple-500/50"></span>
                     </div>
                     <p className="mt-2 text-gray-400 font-mono text-xs">A Social Energy Ecosystem</p>
                 </div>

                 {/* Constellation Graphic */}
                 <div className="mb-12 relative w-[800px] h-[400px]">
                    <svg width="100%" height="100%" viewBox="0 0 800 400" className="drop-shadow-2xl overflow-visible">
                        <defs>
                            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
                                <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                            </radialGradient>
                        </defs>
                        
                        {/* Connecting Lines */}
                        {links.map(([sourceId, targetId], i) => {
                            const s = nodes.find(n => n.id === sourceId)!;
                            const t = nodes.find(n => n.id === targetId)!;
                            return (
                                <g key={i}>
                                    <line 
                                        x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
                                        stroke="rgba(139, 92, 246, 0.15)" 
                                        strokeWidth="1" 
                                    />
                                    {/* Animated pulse on line */}
                                    <circle r="2" fill="rgba(139, 92, 246, 0.5)">
                                        <animateMotion dur={`${4 + i % 3}s`} repeatCount="indefinite" path={`M${s.x},${s.y} L${t.x},${t.y}`} />
                                    </circle>
                                </g>
                            );
                        })}

                        {/* Nodes */}
                        {nodes.map((node, i) => (
                            <g key={node.id} className="group cursor-pointer hover:scale-110 transition-transform duration-300 origin-center">
                                {/* Glow effect */}
                                <circle cx={node.x} cy={node.y} r="45" fill="url(#nodeGlow)" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                {/* Orbital Ring */}
                                <circle 
                                    cx={node.x} cy={node.y} r="28" 
                                    fill="none" 
                                    stroke="rgba(148, 163, 184, 0.2)" 
                                    strokeWidth="1" 
                                    strokeDasharray="4 2"
                                    className="group-hover:stroke-purple-400/50 transition-colors"
                                />

                                {/* Background Circle */}
                                <circle cx={node.x} cy={node.y} r="24" fill="#0f172a" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="2" />
                                
                                {/* Emoji */}
                                <text x={node.x} y={node.y} dy="0.35em" textAnchor="middle" fontSize="26" className="filter drop-shadow-lg">
                                    {CHARACTER_EMOJIS[node.type]}
                                </text>
                                
                                {/* Label */}
                                <text 
                                    x={node.x} y={node.y + 45} 
                                    textAnchor="middle" 
                                    fontSize="10" 
                                    fill="#94a3b8" 
                                    className="font-mono uppercase tracking-widest opacity-60 group-hover:opacity-100 group-hover:fill-white transition-all"
                                >
                                    {node.label}
                                </text>

                                {/* Animation delay for entrance */}
                                <animateTransform 
                                    attributeName="transform" 
                                    type="translate" 
                                    from={`0 ${i % 2 === 0 ? 10 : -10}`} 
                                    to="0 0" 
                                    dur="0.5s" 
                                    begin={`${i * 0.1}s`} 
                                    fill="freeze" 
                                />
                            </g>
                        ))}
                    </svg>
                 </div>

                 {/* Start Button */}
                 <button 
                    onClick={onStart}
                    className="group relative px-10 py-5 bg-gray-900/40 hover:bg-purple-900/30 border border-purple-500/30 hover:border-purple-400 rounded-xl backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:-translate-y-1 active:translate-y-0 overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <span className="text-xl font-mono font-bold tracking-[0.2em] text-purple-100 group-hover:text-white flex items-center gap-3">
                        INITIALIZE_SIM
                        <span className="block w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                    </span>
                 </button>
                 
                 {/* Footer Stats */}
                 <div className="mt-12 flex gap-12 text-center text-[10px] font-mono text-gray-600 border-t border-gray-800 pt-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-xl text-gray-400">9</span>
                        <span>AGENTS</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xl text-gray-400">14</span>
                        <span>LOCATIONS</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xl text-gray-400">∞</span>
                        <span>POSSIBILITIES</span>
                    </div>
                 </div>
            </div>
            
            {/* Version Tag */}
            <div className="absolute bottom-4 right-4 text-[10px] font-mono text-gray-700">
                APARTMENTVERSE V2.0.1
            </div>
        </div>
    );
};

export default TitleScreen;