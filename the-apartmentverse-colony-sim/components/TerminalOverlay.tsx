import React from 'react';
import { GameState, Agent } from '../types';
import { CHARACTER_EMOJIS } from '../constants';

interface TerminalOverlayProps {
    stats: GameState['stats'];
    width: number;
    height: number;
    show: boolean;
    agents: Agent[]; // Added agents prop
}

const ASCII_CHARS = " .:-=+*#%@";

const TerminalOverlay: React.FC<TerminalOverlayProps> = ({ stats, width, height, show, agents }) => {
    if (!show) return null;

    // Generate Heatmap ASCII
    const scale = 2;
    const w = Math.floor(width / scale);
    const h = Math.floor(height / scale);
    let mapStr = "";
    
    let max = 1;
    for(let val of stats.heatmap) if(val > max) max = val;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for(let dy=0; dy<scale; dy++) {
                for(let dx=0; dx<scale; dx++) {
                    const idx = (y*scale+dy) * width + (x*scale+dx);
                    sum += stats.heatmap[idx] || 0;
                }
            }
            const n = Math.min(ASCII_CHARS.length - 1, Math.floor((sum / (max * 0.5)) * ASCII_CHARS.length));
            mapStr += ASCII_CHARS[n];
        }
        mapStr += "\n";
    }

    // Generate Colocation List
    const pairs = Object.entries(stats.colocation)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 10);

    // Helpers for bars
    const renderBar = (val: number, maxVal = 100, width = 8, color = 'text-green-500') => {
        const percent = Math.max(0, Math.min(100, val));
        const filled = Math.floor((percent / 100) * width);
        const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
        return <span className={color}>{bar} {Math.floor(val)}%</span>;
    };

    return (
        <div className="absolute top-4 left-4 bottom-4 right-96 z-40 bg-black/90 border border-gray-600 font-mono text-xs text-green-500 p-6 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in duration-200">
            <div className="border-b border-dashed border-gray-600 pb-2 mb-4 text-purple-400 font-bold">
                {'>'} L_SYSTEM_DIAGNOSTICS // SPATIAL_ANALYSIS_TOOL
            </div>
            
            <div className="grid grid-cols-2 gap-8 h-full overflow-hidden">
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Heatmap Section */}
                    <div className="text-gray-400 mb-2 font-bold uppercase">Spatial Usage Heatmap (ASCII)</div>
                    <pre className="flex-none text-[8px] leading-[8px] overflow-hidden opacity-80 whitespace-pre font-bold text-green-400 mb-6">
                        {mapStr}
                    </pre>

                    {/* CHARACTER VITALS DASHBOARD (Negative Space) */}
                    <div className="flex-1 overflow-y-auto border-t border-gray-800 pt-4 custom-scrollbar">
                         <div className="text-blue-400 mb-2 font-bold uppercase">LIVE CHARACTER VITALS</div>
                         <div className="grid grid-cols-1 gap-3">
                            {agents.map(a => (
                                <div key={a.id} className="grid grid-cols-[80px_1fr] gap-2 border-b border-gray-800 pb-2">
                                    <div className="text-white font-bold flex items-center gap-1">
                                        <span>{CHARACTER_EMOJIS[a.type]}</span>
                                        <span className="truncate">{a.name.split(' ')[0]}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">ENG</span>
                                            {renderBar(a.needs.energy, 100, 6, 'text-yellow-400')}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">STB</span>
                                            {renderBar(a.needs.stability, 100, 6, a.needs.stability < 0 ? 'text-red-500' : 'text-purple-400')}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">SOC</span>
                                            {renderBar(a.needs.connection, 100, 6, 'text-pink-400')}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">PUR</span>
                                            {renderBar(a.needs.purpose, 100, 6, 'text-blue-400')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
                
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                    <div className="text-blue-400 mb-4 font-bold uppercase">Entity Co-Location Matrix</div>
                    <div className="space-y-1 mb-8">
                        {pairs.length === 0 && <span className="text-gray-600 italic">No significant interactions recorded yet...</span>}
                        {pairs.map(([pair, count], i) => (
                            <div key={i} className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-300">{pair.replace('::', ' <-> ')}</span>
                                <span className="text-green-400 font-bold">{count}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-purple-400 mb-2 font-bold uppercase">Care Ecosystem Status</div>
                    <div className="text-gray-400 mb-6">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <div className="bg-gray-900 p-2 border border-gray-800">
                                <span className="block text-[10px] text-gray-500">ARTIFACTS_CONSUMED</span>
                                <span className="text-green-400">{stats.artifactsConsumed}</span>
                             </div>
                             <div className="bg-gray-900 p-2 border border-gray-800">
                                <span className="block text-[10px] text-gray-500">MEALS_SERVED</span>
                                <span className="text-orange-400">{stats.artifactsCreated['meal'] || 0}</span>
                             </div>
                        </div>
                        <div className="space-y-1">
                            {Object.entries(stats.artifactsCreated).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-[10px]">
                                    <span className="uppercase text-gray-500">{k}</span>
                                    <span className="text-gray-300">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-yellow-500 mb-2 font-bold uppercase">System Alerts</div>
                    <div className="text-gray-500 italic">
                        Care circulation: ACTIVE
                        <br/>
                        L-Architecture cycles remaining: INFINITE
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerminalOverlay;